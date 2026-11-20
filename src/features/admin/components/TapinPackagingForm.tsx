'use client';

import { useState, useTransition } from 'react';
import { toFa } from '@/lib/format';
import { registerOrderWithTapinAction } from '../actions/order-actions';
import type { TapinBox } from '@/lib/providers/shipping/tapin/boxes';

export type PackageConfigLike = {
  boxId: number;
  packageWeight?: number;
  weight?: number;
  trackingCode?: string;
  barcode?: string;
  orderId?: string;
};

export type TapinPackagingFormProps = {
  orderId: string;
  orderNumber?: string;
  orderStatus: string;
  paymentStatus: string;
  initialTrackingCode?: string | null;
  initialBarcode?: string | null;
  initialTapinOrderId?: string | null;
  initialTrackingCodes?: string[] | null;
  initialBarcodes?: string[] | null;
  initialPackageConfigs?: PackageConfigLike[] | null;
  totalWeightGrams: number;
  totalItemsCount: number;
  boxes: TapinBox[];
};

type PackageState = {
  boxId: number;
  packageWeight: number;
};

type ParcelDisplay = {
  boxId?: number;
  packageWeight?: number;
  trackingCode?: string;
  barcode?: string;
  orderId?: string;
};

type SuccessState = {
  trackingCode: string | null;
  barcode: string | null;
  orderId: string | null;
  trackingCodes?: string[];
  barcodes?: string[];
  parcels?: ParcelDisplay[];
};

export function TapinPackagingForm({
  orderId,
  orderNumber: _orderNumber,
  orderStatus: _orderStatus,
  paymentStatus: _paymentStatus,
  initialTrackingCode,
  initialBarcode,
  initialTapinOrderId,
  initialTrackingCodes,
  initialBarcodes,
  initialPackageConfigs,
  totalWeightGrams,
  totalItemsCount,
  boxes,
}: TapinPackagingFormProps) {
  const suggestedBoxCount = Math.max(1, Math.ceil(totalWeightGrams / 29000));

  // Default defaultBoxId to box 5 (30kg) or first available
  const defaultBoxId = boxes.find((b) => b.id === 5)?.id ?? boxes[0]?.id ?? 5;

  const [packages, setPackages] = useState<PackageState[]>(() => {
    if (initialPackageConfigs && initialPackageConfigs.length > 0) {
      return initialPackageConfigs.map((p) => ({
        boxId: p.boxId || defaultBoxId,
        packageWeight: p.packageWeight ?? p.weight ?? 500,
      }));
    }
    return Array.from({ length: suggestedBoxCount }, () => ({
      boxId: defaultBoxId,
      packageWeight: 500,
    }));
  });

  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [successInfo, setSuccessInfo] = useState<SuccessState | null>(() => {
    const hasAnyCode = Boolean(
      initialTrackingCode ||
      initialBarcode ||
      initialTapinOrderId ||
      (initialTrackingCodes && initialTrackingCodes.length > 0),
    );
    if (!hasAnyCode) return null;

    const trackingList =
      initialTrackingCodes && initialTrackingCodes.length > 0
        ? initialTrackingCodes
        : initialTrackingCode
        ? initialTrackingCode.split(',').map((s) => s.trim()).filter(Boolean)
        : [];

    const barcodeList =
      initialBarcodes && initialBarcodes.length > 0
        ? initialBarcodes
        : initialBarcode
        ? initialBarcode.split(',').map((s) => s.trim()).filter(Boolean)
        : [];

    let parcels: ParcelDisplay[] | undefined;
    if (initialPackageConfigs && initialPackageConfigs.length > 0) {
      parcels = initialPackageConfigs.map((p, idx) => ({
        boxId: p.boxId,
        packageWeight: p.packageWeight ?? p.weight,
        trackingCode: p.trackingCode || trackingList[idx],
        barcode: p.barcode || barcodeList[idx],
        orderId: p.orderId,
      }));
    } else if (trackingList.length > 1) {
      parcels = trackingList.map((t, idx) => ({
        boxId: defaultBoxId,
        packageWeight: 500,
        trackingCode: t,
        barcode: barcodeList[idx] || '',
      }));
    }

    return {
      trackingCode: initialTrackingCode ?? null,
      barcode: initialBarcode ?? null,
      orderId: initialTapinOrderId ?? null,
      trackingCodes: trackingList,
      barcodes: barcodeList,
      parcels,
    };
  });

  const [showEditForm, setShowEditForm] = useState<boolean>(
    !initialTrackingCode && !initialBarcode && !initialTapinOrderId && (!initialTrackingCodes || initialTrackingCodes.length === 0),
  );

  function handleBoxChange(index: number, boxId: number) {
    setPackages((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], boxId };
      return copy;
    });
  }

  function handleWeightChange(index: number, weight: number) {
    setPackages((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], packageWeight: weight };
      return copy;
    });
  }

  function handleAddBox() {
    setPackages((prev) => [...prev, { boxId: defaultBoxId, packageWeight: 500 }]);
  }

  function handleRemoveBox(index: number) {
    if (packages.length <= 1) return;
    setPackages((prev) => prev.filter((_, idx) => idx !== index));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    startTransition(async () => {
      const res = await registerOrderWithTapinAction({
        orderId,
        selectedBoxId: Number(packages[0]?.boxId) || defaultBoxId,
        packageWeight: Number(packages[0]?.packageWeight) || 500,
        packages: packages.map((p) => ({
          boxId: Number(p.boxId),
          packageWeight: Number(p.packageWeight) || 500,
          weight: Number(p.packageWeight) || 500,
        })),
      });

      if (!res.success) {
        setErrorMsg(res.error);
        return;
      }

      setSuccessInfo({
        trackingCode: res.trackingCode ?? null,
        barcode: res.barcode ?? null,
        orderId: res.orderId ?? null,
        trackingCodes: res.trackingCodes,
        barcodes: res.barcodes,
        parcels:
          res.packageConfigs && res.packageConfigs.length > 0
            ? res.packageConfigs
            : Array.isArray(res.parcels)
            ? res.parcels
            : undefined,
      });
      setShowEditForm(false);
    });
  }

  return (
    <section className="rounded-2xl border border-soil-900/10 dark:border-dust-50/10 bg-white dark:bg-flora-900 p-5 print:hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-soil-900/5 dark:border-dust-50/10 pb-3">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-xl bg-flora-100 dark:bg-flora-800 text-flora-800 dark:text-dust-50 text-sm">
            📦
          </span>
          <div>
            <h2 className="text-sm font-black text-soil-900 dark:text-dust-50">
              بسته‌بندی و ثبت در تاپین
            </h2>
            <p className="text-xs text-soil-700/70 dark:text-dust-200/70">
              انتخاب سایز کارتن، وزن کارتن خالی و ثبت نهایی در سامانه پست تاپین
            </p>
          </div>
        </div>

        {successInfo && !showEditForm && (
          <button
            type="button"
            onClick={() => setShowEditForm(true)}
            className="text-xs font-bold text-flora-700 dark:text-flora-300 hover:underline cursor-pointer"
          >
            تغییر یا ثبت مجدد بسته
          </button>
        )}
      </div>

      {/* Read-only order summary */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-soil-900/5 dark:border-dust-50/5 bg-soil-50 dark:bg-flora-950/50 p-3">
          <span className="text-[11px] text-soil-700/70 dark:text-dust-200/70">تعداد کل اقلام:</span>
          <p className="mt-1 font-mono text-base font-bold text-soil-900 dark:text-dust-50">
            {toFa(totalItemsCount)} عدد
          </p>
        </div>

        <div className="rounded-xl border border-soil-900/5 dark:border-dust-50/5 bg-soil-50 dark:bg-flora-950/50 p-3">
          <span className="text-[11px] text-soil-700/70 dark:text-dust-200/70">وزن کل محصولات:</span>
          <p className="mt-1 font-mono text-base font-bold text-soil-900 dark:text-dust-50">
            {toFa(totalWeightGrams)} گرم{' '}
            <span className="text-xs font-normal text-soil-700/60 dark:text-dust-300/60">
              ({toFa((totalWeightGrams / 1000).toFixed(1))} کیلوگرم)
            </span>
          </p>
        </div>

        <div className="rounded-xl border border-soil-900/5 dark:border-dust-50/5 bg-soil-50 dark:bg-flora-950/50 p-3">
          <span className="text-[11px] text-soil-700/70 dark:text-dust-200/70">تعداد کارتن پیشنهادی:</span>
          <p className="mt-1 font-mono text-base font-bold text-flora-800 dark:text-flora-300">
            {toFa(suggestedBoxCount)} بسته{' '}
            <span className="text-xs font-normal text-soil-700/60 dark:text-dust-300/60">
              (حداکثر ۲۹ کیلوگرم هر بسته)
            </span>
          </p>
        </div>
      </div>

      {/* Success banner if registered */}
      {successInfo && (
        <div className="mt-4 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 p-4 text-sm text-emerald-900 dark:text-emerald-100">
          <div className="flex items-center gap-2 font-black text-emerald-950 dark:text-emerald-200">
            <svg className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>مرسوله با موفقیت در تاپین ثبت شده است.</span>
          </div>

          {successInfo.parcels && successInfo.parcels.length > 1 ? (
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              {successInfo.parcels.map((parcel, idx) => {
                const boxObj = boxes.find((b) => b.id === parcel.boxId);
                return (
                  <div
                    key={idx}
                    className="rounded-lg border border-emerald-200 dark:border-emerald-800/80 bg-white/80 dark:bg-flora-900/80 p-3 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between font-bold text-soil-900 dark:text-dust-50 pb-1.5 border-b border-soil-900/5 dark:border-dust-50/10">
                      <span>بسته {toFa(idx + 1)}</span>
                      {boxObj && (
                        <span className="text-[11px] text-soil-700/60 dark:text-dust-300/60">
                          {boxObj.title}
                        </span>
                      )}
                    </div>
                    {parcel.trackingCode && (
                      <div className="flex items-center justify-between">
                        <span className="text-soil-700/70 dark:text-dust-200/70">کد رهگیری پست:</span>
                        <span className="font-mono text-xs font-black text-emerald-900 dark:text-emerald-200" dir="ltr">
                          {toFa(parcel.trackingCode)}
                        </span>
                      </div>
                    )}
                    {parcel.barcode && (
                      <div className="flex items-center justify-between">
                        <span className="text-soil-700/70 dark:text-dust-200/70">بارکد تاپین:</span>
                        <span className="font-mono text-xs font-black text-emerald-900 dark:text-emerald-200" dir="ltr">
                          {toFa(parcel.barcode)}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {successInfo.trackingCode && (
                <div className="flex items-center justify-between rounded-lg bg-white/70 dark:bg-flora-900/70 p-2.5">
                  <span className="text-soil-700/70 dark:text-dust-200/70">کد رهگیری پست:</span>
                  <span className="font-mono text-sm font-black text-emerald-900 dark:text-emerald-200" dir="ltr">
                    {toFa(successInfo.trackingCode)}
                  </span>
                </div>
              )}
              {successInfo.barcode && (
                <div className="flex items-center justify-between rounded-lg bg-white/70 dark:bg-flora-900/70 p-2.5">
                  <span className="text-soil-700/70 dark:text-dust-200/70">بارکد تاپین:</span>
                  <span className="font-mono text-sm font-black text-emerald-900 dark:text-emerald-200" dir="ltr">
                    {toFa(successInfo.barcode)}
                  </span>
                </div>
              )}
              {successInfo.orderId && (
                <div className="flex items-center justify-between rounded-lg bg-white/70 dark:bg-flora-900/70 p-2.5">
                  <span className="text-soil-700/70 dark:text-dust-200/70">شناسه سفارش در تاپین:</span>
                  <span className="font-mono text-sm font-black text-emerald-900 dark:text-emerald-200" dir="ltr">
                    {toFa(successInfo.orderId)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Packaging Form */}
      {showEditForm && (
        <form noValidate onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="space-y-3">
            {packages.map((pkg, index) => {
              const selectedBox = boxes.find((b) => b.id === pkg.boxId);
              return (
                <div
                  key={index}
                  className="relative rounded-xl border border-soil-900/10 dark:border-dust-50/10 bg-soil-50/60 dark:bg-flora-950/40 p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-black text-soil-900 dark:text-dust-50">
                      بسته {toFa(index + 1)} {packages.length > 1 ? `از ${toFa(packages.length)}` : ''}:
                    </span>
                    {packages.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveBox(index)}
                        className="text-xs text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                      >
                        حذف این بسته
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Box Selector */}
                    <div>
                      <label className="block text-xs font-bold text-soil-700 dark:text-dust-200 mb-1.5">
                        اندازه کارتن پستی (Box Size)
                      </label>
                      <select
                        value={pkg.boxId}
                        onChange={(e) => handleBoxChange(index, Number(e.target.value))}
                        disabled={isPending}
                        className="w-full rounded-xl border border-soil-900/15 dark:border-dust-50/15 bg-white dark:bg-flora-900 px-3 py-2 text-xs text-soil-900 dark:text-dust-50 focus:border-flora-600 focus:outline-none"
                      >
                        {boxes.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.title}
                          </option>
                        ))}
                      </select>
                      {selectedBox && selectedBox.weight && (
                        <p className="mt-1 text-[11px] text-soil-700/60 dark:text-dust-300/60">
                          حداکثر وزن مجاز: {toFa(selectedBox.weight / 1000)} کیلوگرم
                        </p>
                      )}
                    </div>

                    {/* Empty Package Weight */}
                    <div>
                      <label className="block text-xs font-bold text-soil-700 dark:text-dust-200 mb-1.5">
                        وزن کارتن خالی و ضربه‌گیر (گرم)
                      </label>
                      <input
                        type="number"
                        min="100"
                        max="5000"
                        step="50"
                        value={pkg.packageWeight}
                        onChange={(e) => handleWeightChange(index, Number(e.target.value))}
                        disabled={isPending}
                        placeholder="500"
                        className="w-full rounded-xl border border-soil-900/15 dark:border-dust-50/15 bg-white dark:bg-flora-900 px-3 py-2 text-xs font-mono text-soil-900 dark:text-dust-50 focus:border-flora-600 focus:outline-none"
                      />
                      <p className="mt-1 text-[11px] text-soil-700/60 dark:text-dust-300/60">
                        پیش‌فرض ۵۰۰ گرم (فقط وزن کارتن و نایلون حباب‌دار؛ وزن محصولات به صورت خودکار محاسبه می‌شود)
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={handleAddBox}
              disabled={isPending}
              className="text-xs font-bold text-flora-700 dark:text-flora-300 hover:text-flora-900 dark:hover:text-flora-100 flex items-center gap-1 cursor-pointer"
            >
              <span>+ افزودن کارتن جدید</span>
            </button>

            <button
              type="submit"
              disabled={isPending}
              className="rounded-xl bg-flora-800 dark:bg-flora-700 px-5 py-2.5 text-xs font-bold text-white hover:bg-flora-900 dark:hover:bg-flora-800 disabled:opacity-50 transition flex items-center gap-2 cursor-pointer"
            >
              {isPending ? (
                <>
                  <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>در حال ثبت نهایی...</span>
                </>
              ) : (
                <span>ثبت نهایی در تاپین</span>
              )}
            </button>
          </div>

          {errorMsg && (
            <div className="rounded-xl border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/50 p-3 text-xs font-bold text-red-700 dark:text-red-300">
              خطا: {errorMsg}
            </div>
          )}
        </form>
      )}
    </section>
  );
}
