"use client";

import { useEffect, useMemo, useState } from "react";
import AddressForm, { type AddressRecord } from "@/features/checkout/components/AddressForm";
import { calcShippingToman, type CartTotals } from "@/lib/pricing";
import { formatToman, formatWeight, toFa } from "@/lib/format";
import { numberToWordsFa } from "@/lib/number-to-words";
import { resolveCityCode } from "@/lib/postex";
import ItemColorBadge from "@/features/catalog/components/ItemColorBadge";
import ShippingScheduleNotice from "@/features/checkout/components/ShippingScheduleNotice";
import OrderItemDetails, { GroupedOrderItems } from "@/features/checkout/components/OrderItemDetails";

type Address = {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  province: string;
  city: string;
  postalCode: string;
  line1: string;
  line2: string | null;
  isDefault: boolean;
  cityCode?: number | string;
};

export type ShippingOption = {
  carrier: string;
  label: string;
  costToman: number;
  deliveryDays: string;
};

function getDefaultShippingOptions(baseCost: number): ShippingOption[] {
  return [
    {
      carrier: "پست پیشتاز",
      label: "پست پیشتاز (۳ روز کاری)",
      costToman: baseCost,
      deliveryDays: "۳ روز کاری",
    },
  ];
}

/**
 * Address picker plus shipping carrier selection and the order summary.
 *
 * Supports adding new addresses, editing the selected address, dynamic Postex
 * shipping calculation with fallback, and courier selection.
 */
export default function CheckoutForm({
  addresses,
  totals,
  initialShippingRates = {},
}: {
  addresses: Address[];
  totals: CartTotals;
  initialShippingRates?: Record<string, number>;
}) {
  const [addressList, setAddressList] = useState<Address[]>(addresses);
  const [selectedId, setSelectedId] = useState<string>(
    addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id ?? "",
  );
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const selectedCarrier = "پست پیشتاز";
  const [calculatingShipping, setCalculatingShipping] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync address list if parent addresses change
  useEffect(() => {
    setAddressList(addresses);
    setSelectedId((current) =>
      addresses.some((a) => a.id === current)
        ? current
        : (addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id ?? ""),
    );
  }, [addresses]);

  const selectedAddress = useMemo(() => {
    const addr =
      addressList.find((a) => a.id === selectedId) ?? addressList[0] ?? null;
    if (!addr) return null;
    return {
      ...addr,
      cityCode: addr.cityCode ?? resolveCityCode(addr.city || addr.province),
    };
  }, [addressList, selectedId]);

  const currentAddress = useMemo(() => {
    if (!editingAddressId) return undefined;
    const found = addressList.find((a) => a.id === editingAddressId);
    if (!found) return undefined;
    return {
      ...found,
      label: (found.label === "WORK" || found.label === "OTHER"
        ? found.label
        : "HOME") as "HOME" | "WORK" | "OTHER",
    };
  }, [addressList, editingAddressId]);

  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>(
    () => {
      const initialCost =
        initialShippingRates[selectedId] ??
        calcShippingToman(totals, selectedAddress?.province ?? "تهران");
      return getDefaultShippingOptions(initialCost);
    },
  );

  // Dynamic Postex shipping calculation whenever selected address or weight changes
  useEffect(() => {
    if (!selectedAddress) return;

    let cancelled = false;
    setCalculatingShipping(true);

    fetch("/api/shipping/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cityCode: selectedAddress.cityCode,
        weightGrams: totals.totalWeightGrams,
        addressId: selectedAddress.id,
        city: selectedAddress.city,
        province: selectedAddress.province,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data?.ok) {
          const opts = data.shippingOptions ?? data.options;
          if (Array.isArray(opts) && opts.length > 0) {
            setShippingOptions(opts);
          }
        }
      })
      .catch((err) => {
        console.warn(
          "[checkout] Failed to recalculate shipping, using fallback:",
          err,
        );
        const fallbackCost = calcShippingToman(
          totals,
          selectedAddress.province ?? "تهران",
        );
        setShippingOptions(getDefaultShippingOptions(fallbackCost));
      })
      .finally(() => {
        if (!cancelled) {
          setCalculatingShipping(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedAddress, totals.totalWeightGrams]);

  const selectedOption = useMemo(() => {
    return (
      shippingOptions.find((opt) => opt.carrier === selectedCarrier) ??
      shippingOptions[0]
    );
  }, [shippingOptions, selectedCarrier]);

  const effectiveShippingToman = selectedOption ? selectedOption.costToman : 0;
  const grandTotalToman = totals.payableToman + effectiveShippingToman;

  const handleCreated = async (address: AddressRecord) => {
    setAddressList((current) => [address as Address, ...current]);
    setSelectedId(address.id);
    setShowForm(false);
  };

  const handleAddressUpdated = (saved: AddressRecord) => {
    setAddressList((current) =>
      current.map((a) => (a.id === saved.id ? (saved as Address) : a)),
    );
    setSelectedId(saved.id);
    setEditingAddressId(null);
  };

  const pay = async () => {
    if (!selectedId) {
      setError("یک آدرس ارسال انتخاب کنید");
      return;
    }
    if (calculatingShipping) {
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/payment/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          addressId: selectedId,
          shippingCarrier: selectedOption?.carrier ?? selectedCarrier,
        }),
        signal: AbortSignal.timeout(18_000),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.redirectUrl) {
        setError(
          data?.message ||
            "ارتباط با درگاه پرداخت برقرار نشد. لطفاً اینترنت خود را بررسی کرده و دوباره تلاش کنید.",
        );
        setLoading(false);
        return;
      }
      window.location.href = data.redirectUrl;
    } catch {
      setError("ارتباط با درگاه پرداخت برقرار نشد. لطفاً اینترنت خود را بررسی کرده و دوباره تلاش کنید.");
      setLoading(false);
    }
  };

  if (addressList.length === 0) {
    return (
      <div className="space-y-4">
        <AddressForm idPrefix="checkout-first-address" onSaved={handleCreated} />
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-12">
      <div className="space-y-4 lg:col-span-7">
        {editingAddressId && currentAddress ? (
          <AddressForm
            idPrefix="checkout-edit-address"
            address={currentAddress}
            onSaved={handleAddressUpdated}
            onCancel={() => setEditingAddressId(null)}
          />
        ) : showForm ? (
          <AddressForm
            idPrefix="checkout-add-address"
            onSaved={handleCreated}
            onCancel={() => setShowForm(false)}
          />
        ) : (
          <fieldset className="rounded-2xl border border-soil-900/10 dark:border-dust-50/10 bg-white dark:bg-flora-900 p-5">
            <legend className="px-2 text-sm font-black text-soil-900 dark:text-dust-50">
              آدرس ارسال
            </legend>

            <ul className="space-y-3">
              {addressList.map((a) => (
                <li key={a.id}>
                  <div
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                      selectedId === a.id
                        ? "border-flora-500 bg-flora-100/40 dark:bg-flora-900/60 ring-1 ring-flora-500/20 dark:ring-flora-500/30"
                        : "border-soil-900/10 dark:border-dust-50/10 hover:border-soil-900/25 dark:hover:border-dust-50/30"
                    }`}
                  >
                    <input
                      id={`checkout-address-${a.id}`}
                      type="radio"
                      name="addressId"
                      value={a.id}
                      checked={selectedId === a.id}
                      onChange={(e) => setSelectedId(e.target.value)}
                      className="mt-1 accent-flora-700"
                    />
                    <label
                      htmlFor={`checkout-address-${a.id}`}
                      className="flex-1 cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-soil-900 dark:text-dust-50">
                            {a.fullName}
                          </span>
                          {a.isDefault && (
                            <span className="rounded-full bg-flora-100 text-flora-700 dark:bg-flora-900/80 dark:text-flora-300 border border-flora-300/40 dark:border-flora-500/50 px-2 py-0.5 text-[10px] font-bold">
                              پیش‌فرض
                            </span>
                          )}
                        </div>
                        {selectedId === a.id && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setEditingAddressId(a.id);
                            }}
                            className="rounded-lg border border-soil-900/15 dark:border-dust-50/20 bg-white dark:bg-flora-950 px-2.5 py-1 text-xs font-bold text-soil-800 dark:text-dust-100 transition hover:border-soil-900/30 hover:bg-dust-50 dark:hover:bg-flora-900 cursor-pointer shadow-2xs"
                          >
                            ویرایش
                          </button>
                        )}
                      </div>
                      <p className="mt-1.5 text-xs leading-6 text-soil-700/80 dark:text-dust-200/80">
                        {a.province}، {a.city}، {a.line1}
                        {a.line2 ? `، ${a.line2}` : ""}
                      </p>
                      <p className="mt-1 text-xs text-soil-700/60 dark:text-dust-200/60">
                        کد پستی: <span dir="ltr">{a.postalCode}</span> · تلفن:{" "}
                        <span dir="ltr">{a.phone}</span>
                      </p>
                    </label>
                  </div>
                </li>
              ))}
            </ul>
          </fieldset>
        )}

        {!editingAddressId && !showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="w-full rounded-2xl border border-soil-900/10 dark:border-dust-50/10 bg-white dark:bg-flora-900 px-6 py-3 text-sm font-bold text-soil-900 dark:text-dust-50 transition-colors hover:bg-dust-50 dark:hover:bg-flora-950 cursor-pointer"
          >
            + افزودن آدرس جدید
          </button>
        )}

        {/* Shipping carrier selection */}
        <fieldset className="rounded-2xl border border-soil-900/10 dark:border-dust-50/10 bg-white dark:bg-flora-900 p-5">
          <legend className="flex items-center gap-2 px-2 text-sm font-black text-soil-900 dark:text-dust-50">
            <span>روش و شرکت حمل و نقل</span>
            {calculatingShipping && (
              <span className="inline-flex items-center gap-1.5 text-xs text-flora-700 dark:text-flora-300 font-normal">
                <svg
                  className="h-3.5 w-3.5 animate-spin text-flora-700 dark:text-flora-300"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
                <span>در حال محاسبه نرخ ارسال…</span>
              </span>
            )}
          </legend>

          <p className="mb-3 text-xs text-soil-700/70 dark:text-dust-200/70">
            روش ارسال مرسوله خود را انتخاب کنید:
          </p>

          {calculatingShipping ? (
            <div className="flex flex-col items-center justify-center py-8 text-soil-700/60 dark:text-dust-200/60">
              <svg
                className="h-8 w-8 animate-spin text-flora-700 dark:text-flora-300 mb-2"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                />
              </svg>
              <p className="text-xs">در حال محاسبه هزینه ارسال…</p>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {(shippingOptions.filter((opt) => opt.carrier === 'پست پیشتاز').length > 0
                ? shippingOptions.filter((opt) => opt.carrier === 'پست پیشتاز')
                : getDefaultShippingOptions(effectiveShippingToman)
              ).map((opt, idx) => (
                <li key={opt.carrier}>
                  <div className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-flora-500 bg-flora-100/40 dark:bg-flora-900/60 p-3.5 shadow-2xs ring-1 ring-flora-500/20 dark:ring-flora-500/30">
                    <div className="flex items-center gap-3">
                      <input
                        id={`carrier-${idx}`}
                        type="radio"
                        name="shippingCarrier"
                        value={opt.carrier || "پست پیشتاز"}
                        checked={true}
                        readOnly
                        className="accent-flora-700"
                      />
                      <label htmlFor={`carrier-${idx}`} className="text-xs sm:text-sm font-bold text-soil-900 dark:text-dust-50 cursor-pointer">
                        {opt.label || 'پست پیشتاز'}
                      </label>
                    </div>
                    <span className="text-xs sm:text-sm font-black text-soil-900 dark:text-dust-50 shrink-0">
                      {opt.costToman === 0 ? (
                        <span className="text-flora-700 dark:text-flora-300">رایگان</span>
                      ) : (
                        formatToman(opt.costToman)
                      )}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </fieldset>

        {error && (
          <p
            role="alert"
            className="rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/40 px-4 py-3 text-xs font-bold text-red-700 dark:text-red-300"
          >
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={pay}
          disabled={loading || calculatingShipping || !selectedId}
          className="w-full rounded-2xl bg-flora-900 text-white dark:bg-flora-500 dark:text-flora-950 dark:hover:bg-flora-700 px-6 py-4 text-sm font-black shadow-lg shadow-flora-900/20 transition-colors hover:bg-flora-700 disabled:opacity-50 cursor-pointer"
        >
          {loading
            ? "در حال انتقال به درگاه…"
            : calculatingShipping
              ? "در حال محاسبه هزینه ارسال…"
              : "پرداخت امن با زرین‌پال"}
        </button>

        <ShippingScheduleNotice compact={true} className="mt-3" />

        <p className="text-center text-[11px] leading-6 text-soil-700/55 dark:text-dust-200/55">
          پس از تأیید، مبلغ از حساب شما کسر و کد پیگیری شاپرک نمایش داده می‌شود.
        </p>
      </div>

      <aside className="lg:col-span-5">
        <div className="rounded-2xl bg-white dark:bg-flora-900 dark:border dark:border-dust-50/10 p-6 shadow-[0_12px_32px_-12px_rgba(62,39,35,0.22)] dark:shadow-none lg:sticky lg:top-24">
          <h2 className="font-black text-soil-900 dark:text-dust-50">خلاصه سفارش</h2>

          <div className="mt-4">
            <GroupedOrderItems items={totals.lines} compact={true} />
          </div>

          <dl className="mt-5 space-y-3 border-t border-soil-900/10 dark:border-dust-50/10 pt-5 text-sm">
            <div className="flex justify-between text-soil-900 dark:text-dust-50">
              <dt>جمع کالاها</dt>
              <dd>{formatToman(totals.subtotalToman)}</dd>
            </div>
            <div className="flex justify-between text-flora-700 dark:text-flora-300">
              <dt>خرید عمده و تخفیف پلکانی</dt>
              <dd>−{formatToman(totals.discountToman)}</dd>
            </div>
            <div className="flex justify-between items-center text-soil-900 dark:text-dust-50">
              <dt className="flex items-center gap-1.5">
                <span>
                  هزینه ارسال{" "}
                  {selectedOption?.carrier
                    ? `(با ${selectedOption.carrier})`
                    : ""}
                </span>
                {calculatingShipping && (
                  <span className="text-[10px] text-flora-700 dark:text-flora-300 animate-pulse font-normal">
                    (در حال محاسبه…)
                  </span>
                )}
              </dt>
              <dd>
                {calculatingShipping ? (
                  <span className="text-soil-700/60 dark:text-dust-200/60 text-xs">…</span>
                ) : effectiveShippingToman === 0 ? (
                  "رایگان"
                ) : (
                  formatToman(effectiveShippingToman)
                )}
              </dd>
            </div>
            <div className="flex justify-between text-soil-900 dark:text-dust-50">
              <dt>وزن تقریبی</dt>
              <dd>{formatWeight(totals.totalWeightGrams)}</dd>
            </div>
            <div className="flex justify-between border-t border-soil-900/10 dark:border-dust-50/10 pt-3 text-base font-black text-soil-900 dark:text-dust-50">
              <dt>قابل پرداخت</dt>
              <dd className="text-end">
                <div>
                  {calculatingShipping ? (
                    <span className="text-soil-700/60 dark:text-dust-200/60 text-sm">
                      در حال محاسبه…
                    </span>
                  ) : (
                    formatToman(grandTotalToman)
                  )}
                </div>
                {!calculatingShipping && grandTotalToman >= 1000 && (
                  <div className="text-[11px] font-normal text-soil-700/70 dark:text-dust-200/70 mt-0.5">
                    ({numberToWordsFa(grandTotalToman)} تومان)
                  </div>
                )}
              </dd>
            </div>
          </dl>
        </div>
      </aside>
    </div>
  );
}
