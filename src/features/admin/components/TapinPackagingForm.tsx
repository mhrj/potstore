'use client';

import { useState, useTransition } from 'react';
import { toFa } from '@/lib/format';
import { chunkItemsIntoBoxes } from '@/lib/shipping-utils';
import { registerTapinBoxAction, resetTapinBoxAction } from '../actions/order-actions';
import type { TapinBox } from '@/lib/providers/shipping/tapin/boxes';

export type PackagingOrderItem = {
  id: string;
  productName: string;
  quantity: number;
  unitToman: number;
  lineTotalToman: number;
  isBundle?: boolean;
  bundleSize?: number | null;
  colorData?: unknown;
  product?: {
    bundleItems?: unknown;
    weightGrams?: number | null;
    isFragile?: boolean | null;
  } | null;
};

export type PackageConfigLike = {
  boxIndex?: number;
  boxId: number;
  packageWeight?: number;
  weight?: number;
  isNonStandard?: boolean;
  trackingCode?: string;
  barcode?: string;
  orderId?: string;
  tapinOrderId?: string;
  status?: 'REGISTERED' | 'PENDING';
  totalProductWeightGrams?: number;
  registeredAt?: string;
  items?: Array<{
    orderItemId: string;
    productName?: string;
    quantity: number;
  }>;
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
  initialIsNonStandard?: boolean;
  totalWeightGrams: number;
  totalItemsCount: number;
  boxes: TapinBox[];
  items?: PackagingOrderItem[];
};

type FormBoxState = {
  boxIndex: number;
  boxId: number;
  packageWeight: number; // Empty box tare weight in grams
  isNonStandard: boolean;
  status: 'REGISTERED' | 'PENDING';
  trackingCode?: string;
  barcode?: string;
  tapinOrderId?: string;
  registeredAt?: string;
  allocations: Record<string, number>; // orderItemId -> quantity in this box
};

function getShippingSpecs(item: PackagingOrderItem) {
  const bundleSize = Math.max(1, Number(item.bundleSize) || 1);
  const isBundle = Boolean(item.isBundle) || bundleSize > 1;
  const totalUnits = isBundle
    ? Math.max(1, Math.round(item.quantity / bundleSize))
    : item.quantity;

  const bundleItemsArr = Array.isArray(item.product?.bundleItems)
    ? (item.product!.bundleItems as Array<{ weightGrams?: number }>)
    : [];
  const bundleItemsWeight = bundleItemsArr.reduce((s, it) => s + (it.weightGrams || 0), 0);
  const colorWeight =
    typeof (item.colorData as Record<string, unknown>)?.weightGrams === 'number'
      ? Number((item.colorData as Record<string, unknown>).weightGrams)
      : 0;

  const unitWeightGrams = isBundle
    ? bundleItemsWeight > 0
      ? bundleItemsWeight
      : colorWeight > 0
      ? colorWeight
      : item.product?.weightGrams || 1000
    : item.product?.weightGrams || 1000;

  const unitPriceToman = isBundle
    ? item.lineTotalToman && totalUnits
      ? Math.round(item.lineTotalToman / totalUnits)
      : item.unitToman * bundleSize
    : item.unitToman;

  return {
    bundleSize,
    isBundle,
    totalUnits,
    unitWeightGrams,
    unitPriceToman,
  };
}

export function TapinPackagingForm({
  orderId,
  orderNumber: _orderNumber,
  orderStatus: _orderStatus,
  paymentStatus: _paymentStatus,
  initialTrackingCode,
  initialBarcode,
  initialTapinOrderId,
  initialTrackingCodes: _initialTrackingCodes,
  initialBarcodes: _initialBarcodes,
  initialPackageConfigs,
  initialIsNonStandard = false,
  totalWeightGrams: _totalWeightGrams,
  totalItemsCount: _totalItemsCount,
  boxes,
  items = [],
}: TapinPackagingFormProps) {
  const defaultBoxId = boxes.find((b) => b.id === 5)?.id ?? boxes[0]?.id ?? 5;

  // Initialize boxes from existing configs or auto-chunking
  const [formBoxes, setFormBoxes] = useState<FormBoxState[]>(() => {
    const existing: FormBoxState[] = [];

    // 1. Process initialPackageConfigs if available
    if (initialPackageConfigs && initialPackageConfigs.length > 0) {
      initialPackageConfigs.forEach((cfg, idx) => {
        const isRegistered =
          cfg.status === 'REGISTERED' ||
          Boolean(cfg.trackingCode || cfg.barcode || cfg.orderId || cfg.tapinOrderId);

        const allocs: Record<string, number> = {};
        if (Array.isArray(cfg.items)) {
          for (const it of cfg.items) {
            allocs[it.orderItemId] = (allocs[it.orderItemId] || 0) + Number(it.quantity || 0);
          }
        }

        existing.push({
          boxIndex: typeof cfg.boxIndex === 'number' ? cfg.boxIndex : idx,
          boxId: cfg.boxId || defaultBoxId,
          packageWeight: cfg.packageWeight ?? cfg.weight ?? 1500,
          isNonStandard: Boolean(cfg.isNonStandard),
          status: isRegistered ? 'REGISTERED' : 'PENDING',
          trackingCode: cfg.trackingCode,
          barcode: cfg.barcode,
          tapinOrderId: cfg.tapinOrderId || cfg.orderId,
          registeredAt: cfg.registeredAt,
          allocations: allocs,
        });
      });
    } else if (initialTrackingCode || initialBarcode || initialTapinOrderId) {
      // Legacy single package record
      const allocs: Record<string, number> = {};
      for (const it of items) {
        const spec = getShippingSpecs(it);
        allocs[it.id] = spec.totalUnits;
      }
      existing.push({
        boxIndex: 0,
        boxId: defaultBoxId,
        packageWeight: 1500,
        isNonStandard: Boolean(initialIsNonStandard),
        status: 'REGISTERED',
        trackingCode: initialTrackingCode ?? undefined,
        barcode: initialBarcode ?? undefined,
        tapinOrderId: initialTapinOrderId ?? undefined,
        allocations: allocs,
      });
    }

    // 2. Calculate remaining unfulfilled units per item
    const unfulfilledItemsForChunking: Array<PackagingOrderItem & { unfulfilledUnits: number }> = [];

    for (const it of items) {
      const spec = getShippingSpecs(it);
      let registeredCount = 0;
      for (const b of existing) {
        if (b.status === 'REGISTERED') {
          registeredCount += b.allocations[it.id] || 0;
        }
      }
      const remaining = Math.max(0, spec.totalUnits - registeredCount);
      if (remaining > 0) {
        unfulfilledItemsForChunking.push({
          ...it,
          unfulfilledUnits: remaining,
        });
      }
    }

    // 3. If there are unfulfilled items, run chunkItemsIntoBoxes on remaining units
    if (unfulfilledItemsForChunking.length > 0) {
      const chunkerInput = unfulfilledItemsForChunking.map((it) => {
        const spec = getShippingSpecs(it);
        return {
          id: it.id,
          productId: it.id,
          name: it.productName,
          quantity: spec.isBundle ? it.unfulfilledUnits * spec.bundleSize : it.unfulfilledUnits,
          bundleSize: spec.bundleSize,
          bundleLabel: spec.isBundle ? `ست ${toFa(spec.bundleSize)} عددی` : undefined,
          weightGrams: spec.unitWeightGrams,
          unitToman: spec.unitPriceToman,
          lineTotalToman: spec.unitPriceToman * it.unfulfilledUnits,
        };
      });

      const chunkedBoxes = chunkItemsIntoBoxes(chunkerInput, 28500);

      chunkedBoxes.forEach((boxChunk, chunkIdx) => {
        const allocs: Record<string, number> = {};
        for (const unit of boxChunk) {
          const itemKey = unit.id || unit.productId;
          if (itemKey) {
            allocs[itemKey] = (allocs[itemKey] || 0) + Number(unit.quantity || 1);
          }
        }

        const nextBoxIndex = existing.length + chunkIdx;
        existing.push({
          boxIndex: nextBoxIndex,
          boxId: defaultBoxId,
          packageWeight: 1500,
          isNonStandard: false,
          status: 'PENDING',
          allocations: allocs,
        });
      });
    }

    // Fallback if still empty
    if (existing.length === 0) {
      existing.push({
        boxIndex: 0,
        boxId: defaultBoxId,
        packageWeight: 1500,
        isNonStandard: false,
        status: 'PENDING',
        allocations: {},
      });
    }

    return existing;
  });

  const [activeBoxSubmitting, setActiveBoxSubmitting] = useState<number | null>(null);
  const [errorMessages, setErrorMessages] = useState<Record<number, string>>({});
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Helper: Get item shipping specs map
  const itemSpecsMap = new Map<string, ReturnType<typeof getShippingSpecs>>();
  for (const it of items) {
    itemSpecsMap.set(it.id, getShippingSpecs(it));
  }

  // Calculate allocated count for an item across all boxes
  function getAllocatedCount(orderItemId: string) {
    let total = 0;
    for (const b of formBoxes) {
      total += b.allocations[orderItemId] || 0;
    }
    return total;
  }

  // Calculate registered count for an item
  function getRegisteredCount(orderItemId: string) {
    let total = 0;
    for (const b of formBoxes) {
      if (b.status === 'REGISTERED') {
        total += b.allocations[orderItemId] || 0;
      }
    }
    return total;
  }

  // Calculate box product weight in grams
  function getBoxProductWeight(box: FormBoxState) {
    let sumGrams = 0;
    for (const [itemId, qty] of Object.entries(box.allocations)) {
      const spec = itemSpecsMap.get(itemId);
      if (spec && qty > 0) {
        sumGrams += qty * spec.unitWeightGrams;
      }
    }
    return sumGrams;
  }

  // Stepper handlers
  function handleIncrement(boxIndex: number, orderItemId: string) {
    const spec = itemSpecsMap.get(orderItemId);
    if (!spec) return;

    setFormBoxes((prev) => {
      const targetBox = prev.find((b) => b.boxIndex === boxIndex);
      if (!targetBox || targetBox.status === 'REGISTERED') return prev;

      // Check gross weight limit: adding this unit must not exceed 30,000g gross weight
      const currentGross = getBoxProductWeight(targetBox) + targetBox.packageWeight;
      if (currentGross + spec.unitWeightGrams > 30000) {
        setErrorMessages((errs) => ({
          ...errs,
          [boxIndex]: `افزودن این قلم باعث عبور وزن کل از سقف ۳۰ کیلوگرم می‌شود (${toFa(((currentGross + spec.unitWeightGrams) / 1000).toFixed(1))} کیلوگرم با کارتن).`,
        }));
        return prev;
      }

      setErrorMessages((errs) => ({ ...errs, [boxIndex]: '' }));

      // 1) If unallocated units exist, allocate to this box
      let totalAllocated = 0;
      for (const b of prev) {
        totalAllocated += b.allocations[orderItemId] || 0;
      }

      if (totalAllocated < spec.totalUnits) {
        return prev.map((b) => {
          if (b.boxIndex !== boxIndex) return b;
          return {
            ...b,
            allocations: {
              ...b.allocations,
              [orderItemId]: (b.allocations[orderItemId] || 0) + 1,
            },
          };
        });
      }

      // 2) If all units are allocated across pending boxes, transfer 1 unit from another pending box
      const donorBox = prev.find(
        (b) => b.boxIndex !== boxIndex && b.status === 'PENDING' && (b.allocations[orderItemId] || 0) > 0,
      );
      if (!donorBox) {
        return prev; // All units are in registered boxes
      }

      return prev.map((b) => {
        if (b.boxIndex === boxIndex) {
          return {
            ...b,
            allocations: {
              ...b.allocations,
              [orderItemId]: (b.allocations[orderItemId] || 0) + 1,
            },
          };
        }
        if (b.boxIndex === donorBox.boxIndex) {
          const donorQty = b.allocations[orderItemId] || 0;
          const donorAllocs = { ...b.allocations };
          if (donorQty <= 1) {
            delete donorAllocs[orderItemId];
          } else {
            donorAllocs[orderItemId] = donorQty - 1;
          }
          return {
            ...b,
            allocations: donorAllocs,
          };
        }
        return b;
      });
    });
  }

  function handleDecrement(boxIndex: number, orderItemId: string) {
    setErrorMessages((errs) => ({ ...errs, [boxIndex]: '' }));
    setFormBoxes((prev) =>
      prev.map((b) => {
        if (b.boxIndex !== boxIndex || b.status === 'REGISTERED') return b;
        const currentQty = b.allocations[orderItemId] || 0;
        if (currentQty <= 0) return b;
        const nextQty = currentQty - 1;
        const nextAllocs = { ...b.allocations };
        if (nextQty <= 0) {
          delete nextAllocs[orderItemId];
        } else {
          nextAllocs[orderItemId] = nextQty;
        }
        return {
          ...b,
          allocations: nextAllocs,
        };
      }),
    );
  }

  function handleRemoveItemFromBox(boxIndex: number, orderItemId: string) {
    setErrorMessages((errs) => ({ ...errs, [boxIndex]: '' }));
    setFormBoxes((prev) =>
      prev.map((b) => {
        if (b.boxIndex !== boxIndex || b.status === 'REGISTERED') return b;
        const nextAllocs = { ...b.allocations };
        delete nextAllocs[orderItemId];
        return {
          ...b,
          allocations: nextAllocs,
        };
      }),
    );
  }

  function handleBoxIdChange(boxIndex: number, newBoxId: number) {
    setFormBoxes((prev) =>
      prev.map((b) => (b.boxIndex === boxIndex ? { ...b, boxId: newBoxId } : b)),
    );
  }

  function handleTareWeightChange(boxIndex: number, tareGrams: number) {
    setFormBoxes((prev) =>
      prev.map((b) => (b.boxIndex === boxIndex ? { ...b, packageWeight: tareGrams } : b)),
    );
  }

  function handleNonStandardChange(boxIndex: number, isNonStandard: boolean) {
    setFormBoxes((prev) =>
      prev.map((b) => (b.boxIndex === boxIndex ? { ...b, isNonStandard } : b)),
    );
  }

  function handleAddNewBox() {
    const nextIndex =
      formBoxes.length > 0 ? Math.max(...formBoxes.map((b) => b.boxIndex)) + 1 : 0;
    setFormBoxes((prev) => [
      ...prev,
      {
        boxIndex: nextIndex,
        boxId: defaultBoxId,
        packageWeight: 1500,
        isNonStandard: false,
        status: 'PENDING',
        allocations: {},
      },
    ]);
  }

  function handleRemoveBox(boxIndex: number) {
    setFormBoxes((prev) => prev.filter((b) => b.boxIndex !== boxIndex));
  }

  function handleCopy(code: string) {
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  }

  function handleRegisterBox(boxIndex: number) {
    const box = formBoxes.find((b) => b.boxIndex === boxIndex);
    if (!box || box.status === 'REGISTERED') return;

    setErrorMessages((prev) => ({ ...prev, [boxIndex]: '' }));

    // Prepare items payload
    const itemsPayload: Array<{ orderItemId: string; quantity: number }> = [];
    for (const [orderItemId, qty] of Object.entries(box.allocations)) {
      if (qty > 0) {
        itemsPayload.push({ orderItemId, quantity: qty });
      }
    }

    if (itemsPayload.length === 0) {
      setErrorMessages((prev) => ({
        ...prev,
        [boxIndex]: 'حداقل یک محصول برای ثبت در این کارتن باید انتخاب شود.',
      }));
      return;
    }

    const productWeight = getBoxProductWeight(box);
    const grossWeight = productWeight + box.packageWeight;
    if (grossWeight > 30000) {
      setErrorMessages((prev) => ({
        ...prev,
        [boxIndex]: `وزن ناخالص این کارتن با احتساب جعبه (${toFa(grossWeight)} گرم) بیشتر از سقف مجاز ۳۰ کیلوگرم است.`,
      }));
      return;
    }

    setActiveBoxSubmitting(boxIndex);

    startTransition(async () => {
      const res = await registerTapinBoxAction({
        orderId,
        boxIndex,
        boxId: box.boxId,
        packageWeight: box.packageWeight,
        isNonStandard: box.isNonStandard,
        items: itemsPayload,
      });

      setActiveBoxSubmitting(null);

      if (!res.success) {
        setErrorMessages((prev) => ({
          ...prev,
          [boxIndex]: res.error || 'خطا در ثبت بسته در تاپین.',
        }));
        return;
      }

      // Mark this box as REGISTERED
      setFormBoxes((prev) =>
        prev.map((b) => {
          if (b.boxIndex !== boxIndex) return b;
          return {
            ...b,
            status: 'REGISTERED',
            trackingCode: res.parcel?.trackingCode || res.box?.trackingCode,
            barcode: res.parcel?.barcode || res.box?.barcode,
            tapinOrderId: res.parcel?.orderId || res.box?.tapinOrderId,
            registeredAt: new Date().toISOString(),
          };
        }),
      );
    });
  }

  function handleResetBox(boxIndex: number) {
    const box = formBoxes.find((b) => b.boxIndex === boxIndex);
    if (!box || box.status !== 'REGISTERED') return;

    if (
      !window.confirm(
        `آیا از لغو ثبت کارتن شماره ${toFa(boxIndex + 1)} در سیستم و امکان ویرایش و ثبت مجدد آن اطمینان دارید؟`,
      )
    ) {
      return;
    }

    setErrorMessages((prev) => ({ ...prev, [boxIndex]: '' }));
    setActiveBoxSubmitting(boxIndex);

    startTransition(async () => {
      const res = await resetTapinBoxAction({
        orderId,
        boxIndex,
      });

      setActiveBoxSubmitting(null);

      if (!res.success) {
        setErrorMessages((prev) => ({
          ...prev,
          [boxIndex]: res.error || 'خطا در لغو ثبت کارتن.',
        }));
        return;
      }

      // Mark this box as PENDING in local state
      setFormBoxes((prev) =>
        prev.map((b) => {
          if (b.boxIndex !== boxIndex) return b;
          return {
            ...b,
            status: 'PENDING',
            trackingCode: undefined,
            barcode: undefined,
            tapinOrderId: undefined,
            registeredAt: undefined,
          };
        }),
      );
    });
  }

  // Summary counts
  const totalOrderUnits = items.reduce((sum, it) => sum + (itemSpecsMap.get(it.id)?.totalUnits || 0), 0);
  const totalAllocatedUnits = items.reduce((sum, it) => sum + getAllocatedCount(it.id), 0);
  const totalRegisteredUnits = items.reduce((sum, it) => sum + getRegisteredCount(it.id), 0);
  const allFulfilled = totalRegisteredUnits >= totalOrderUnits && totalOrderUnits > 0;

  return (
    <section className="rounded-2xl border border-soil-900/10 dark:border-dust-50/10 bg-white dark:bg-flora-900 p-5 print:hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-soil-900/5 dark:border-dust-50/10 pb-4">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-flora-100 dark:bg-flora-800 text-flora-800 dark:text-dust-50 text-base">
            📦
          </span>
          <div>
            <h2 className="text-sm font-black text-soil-900 dark:text-dust-50">
              مدیریت بسته‌بندی چندکارتنه و ثبت تاپین
            </h2>
            <p className="text-xs text-soil-700/70 dark:text-dust-200/70">
              توزیع دقیق و ضداشتباه اقلام در کارتن‌ها بر اساس سقف وزنی ۳۰ کیلوگرم با جعبه و ثبت مجزا در پست
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleAddNewBox}
          disabled={isPending}
          className="rounded-xl border border-flora-700/30 dark:border-flora-400/30 bg-flora-50/60 dark:bg-flora-950/50 px-3.5 py-1.5 text-xs font-bold text-flora-800 dark:text-flora-200 hover:bg-flora-100 dark:hover:bg-flora-900 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <span>+</span>
          <span>افزودن کارتن جدید</span>
        </button>
      </div>

      {/* Progress & Quota Banner */}
      <div className="mt-4 rounded-xl border border-soil-900/5 dark:border-dust-50/5 bg-soil-50 dark:bg-flora-950/50 p-3.5 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-soil-900 dark:text-dust-50">وضعیت بسته‌بندی اقلام:</span>
            <span className="font-mono font-bold text-flora-800 dark:text-flora-300">
              {toFa(totalRegisteredUnits)} از {toFa(totalOrderUnits)} واحد ثبت شده
            </span>
            {totalAllocatedUnits < totalOrderUnits && (
              <span className="text-amber-700 dark:text-amber-300 font-medium">
                ({toFa(totalOrderUnits - totalAllocatedUnits)} واحد هنوز تخصیص نیافته)
              </span>
            )}
          </div>
          <span className="text-[11px] text-soil-700/60 dark:text-dust-300/60">
            تعداد کارتن‌ها: {toFa(formBoxes.length)} بسته (سقف هر کارتن: ۳۰ کیلوگرم با کارتن خالی)
          </span>
        </div>

        {allFulfilled && (
          <div className="mt-2.5 flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-bold text-xs pt-2 border-t border-soil-900/5 dark:border-dust-50/5">
            <span>✓</span>
            <span>تمام اقلام این سفارش با موفقیت بسته‌بندی شده و در سامانه تاپین ثبت گردیدند.</span>
          </div>
        )}
      </div>

      {/* Box Cards */}
      <div className="mt-5 space-y-5">
        {formBoxes.map((box, idx) => {
          const isRegistered = box.status === 'REGISTERED';
          const isSubmitting = activeBoxSubmitting === box.boxIndex && isPending;
          const productWeightGrams = getBoxProductWeight(box);
          const totalBoxGrossGrams = productWeightGrams + box.packageWeight;
          const isOverloaded = totalBoxGrossGrams > 30000;
          const selectedBoxObj = boxes.find((b) => b.id === box.boxId);
          const errorMsg = errorMessages[box.boxIndex];

          return (
            <div
              key={box.boxIndex}
              className={`rounded-2xl border transition-all ${
                isRegistered
                  ? 'border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/30 dark:bg-emerald-950/20'
                  : isOverloaded
                  ? 'border-red-300 dark:border-red-800 bg-red-50/20 dark:bg-red-950/20'
                  : 'border-soil-900/10 dark:border-dust-50/10 bg-white dark:bg-flora-950/30'
              } p-4 sm:p-5`}
            >
              {/* Box Card Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-soil-900/5 dark:border-dust-50/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`flex size-7 items-center justify-center rounded-lg text-xs font-black ${
                      isRegistered
                        ? 'bg-emerald-600 text-white'
                        : 'bg-soil-200 dark:bg-flora-800 text-soil-900 dark:text-dust-50'
                    }`}
                  >
                    {isRegistered ? '✓' : toFa(idx + 1)}
                  </span>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-soil-900 dark:text-dust-50 flex items-center gap-2">
                      <span>کارتن شماره {toFa(idx + 1)}</span>
                      {isRegistered ? (
                        <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/60 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-200">
                          ثبت شده در تاپین
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-100 dark:bg-amber-900/60 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-200">
                          در انتظار ثبت
                        </span>
                      )}
                    </h3>
                  </div>
                </div>

                {/* Header Actions: Undo / Re-register OR Delete */}
                <div className="flex items-center gap-2">
                  {isRegistered ? (
                    <button
                      type="button"
                      onClick={() => handleResetBox(box.boxIndex)}
                      disabled={isPending}
                      className="text-xs font-bold text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700/60 rounded-lg px-2.5 py-1 cursor-pointer disabled:opacity-50 transition flex items-center gap-1"
                      title="لغو ثبت این کارتن در صورت کنسلی یا اشتباه در تاپین و ویرایش مجدد"
                    >
                      <span>🔄</span>
                      <span>لغو ثبت و ویرایش مجدد</span>
                    </button>
                  ) : (
                    formBoxes.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveBox(box.boxIndex)}
                        disabled={isPending}
                        className="text-xs text-red-600 dark:text-red-400 hover:underline cursor-pointer disabled:opacity-50"
                      >
                        حذف این کارتن
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Registered Parcel Codes */}
              {isRegistered && (
                <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-white/80 dark:bg-flora-900/80 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800/60">
                  {box.trackingCode && (
                    <div className="flex items-center justify-between">
                      <span className="text-soil-700/70 dark:text-dust-200/70">کد رهگیری پست پیشتاز:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-black text-emerald-900 dark:text-emerald-200" dir="ltr">
                          {toFa(box.trackingCode)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(box.trackingCode!)}
                          className="text-[10px] text-flora-700 dark:text-flora-300 hover:underline cursor-pointer"
                        >
                          {copiedCode === box.trackingCode ? 'کپی شد!' : 'کپی'}
                        </button>
                      </div>
                    </div>
                  )}

                  {box.barcode && (
                    <div className="flex items-center justify-between">
                      <span className="text-soil-700/70 dark:text-dust-200/70">بارکد تاپین:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-black text-emerald-900 dark:text-emerald-200" dir="ltr">
                          {toFa(box.barcode)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(box.barcode!)}
                          className="text-[10px] text-flora-700 dark:text-flora-300 hover:underline cursor-pointer"
                        >
                          {copiedCode === box.barcode ? 'کپی شد!' : 'کپی'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Box Specifications & Settings */}
              <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {/* Box Size */}
                <div>
                  <label className="block text-[11px] font-bold text-soil-700 dark:text-dust-200 mb-1">
                    اندازه کارتن (Box Size)
                  </label>
                  {isRegistered ? (
                    <div className="py-1.5 space-y-1">
                      <p className="font-bold text-soil-900 dark:text-dust-50">
                        {box.isNonStandard
                          ? 'بسته‌بندی غیرمتعارف (کد ۱۰)'
                          : selectedBoxObj?.title || `کارتن کد ${toFa(box.boxId)}`}
                      </p>
                      {box.isNonStandard && (
                        <p className="text-[10px] font-medium text-soil-700/70 dark:text-dust-300/70">
                          خارج از کارتن‌های استاندارد
                        </p>
                      )}
                    </div>
                  ) : (
                    <>
                      <select
                        value={box.boxId}
                        onChange={(e) => handleBoxIdChange(box.boxIndex, Number(e.target.value))}
                        disabled={isPending || box.isNonStandard}
                        aria-label="اندازه کارتن"
                        className="w-full rounded-xl border border-soil-900/15 dark:border-dust-50/15 bg-white dark:bg-flora-900 px-2.5 py-1.5 text-xs text-soil-900 dark:text-dust-50 focus:border-flora-600 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {boxes.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.title}
                          </option>
                        ))}
                      </select>
                      <label className="mt-2 flex items-start gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={box.isNonStandard}
                          onChange={(e) => handleNonStandardChange(box.boxIndex, e.target.checked)}
                          disabled={isPending}
                          className="mt-0.5 size-3.5 rounded border-soil-900/25 dark:border-dust-50/25 text-flora-700 focus:ring-flora-600 dark:bg-flora-900 cursor-pointer disabled:opacity-50"
                        />
                        <span className="text-[11px] font-medium text-soil-800 dark:text-dust-100 leading-tight">
                          بسته‌بندی غیرمتعارف (خارج از کارتن‌های استاندارد)
                        </span>
                      </label>
                    </>
                  )}
                </div>

                {/* Empty Box Tare Weight */}
                <div>
                  <label className="block text-[11px] font-bold text-soil-700 dark:text-dust-200 mb-1">
                    وزن کارتن خالی و ضربه‌گیر (گرم)
                  </label>
                  {isRegistered ? (
                    <p className="font-mono font-bold text-soil-900 dark:text-dust-50 py-1.5">
                      {toFa(box.packageWeight)} گرم
                    </p>
                  ) : (
                    <input
                      type="number"
                      min="100"
                      max="5000"
                      step="50"
                      value={box.packageWeight}
                      onChange={(e) => handleTareWeightChange(box.boxIndex, Number(e.target.value))}
                      disabled={isPending}
                      className="w-full rounded-xl border border-soil-900/15 dark:border-dust-50/15 bg-white dark:bg-flora-900 px-2.5 py-1.5 text-xs font-mono text-soil-900 dark:text-dust-50 focus:border-flora-600 focus:outline-none"
                    />
                  )}
                </div>

                {/* Live Weight Indicator (Gross & Product) */}
                <div>
                  <label className="block text-[11px] font-bold text-soil-700 dark:text-dust-200 mb-1">
                    وزن کل بسته (ناخالص با کارتن)
                  </label>
                  <div className="flex items-center gap-2 py-1">
                    <span
                      className={`font-mono font-black text-sm ${
                        isOverloaded
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-flora-800 dark:text-flora-300'
                      }`}
                    >
                      {toFa((totalBoxGrossGrams / 1000).toFixed(1))} کیلوگرم
                    </span>
                    <span className="text-[10px] text-soil-700/60 dark:text-dust-300/60">
                      / سقف ۳۰ کیلو
                    </span>
                  </div>
                  <p className="text-[10px] text-soil-700/60 dark:text-dust-300/60">
                    (محصولات: {toFa((productWeightGrams / 1000).toFixed(1))} کیلو + کارتن: {toFa((box.packageWeight / 1000).toFixed(1))} کیلو)
                  </p>
                  {isOverloaded && (
                    <p className="text-[10px] font-bold text-red-600 dark:text-red-400 mt-0.5">
                      ⚠️ وزن کل از سقف مجاز ۳۰ کیلوگرم بیشتر است!
                    </p>
                  )}
                </div>
              </div>

              {/* Items Allocation Table / List */}
              <div className="mt-4 border-t border-soil-900/5 dark:border-dust-50/10 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-soil-900 dark:text-dust-50">
                    اقلام تخصیص‌یافته به این کارتن:
                  </span>
                  {!isRegistered && (
                    <span className="text-[11px] text-soil-700/60 dark:text-dust-300/60">
                      می‌توانید با دکمه‌های + و − یا دکمه حذف، اقلام را آزادانه بین کارتن‌ها جابه‌جا کنید
                    </span>
                  )}
                </div>

                <div className="divide-y divide-soil-900/5 dark:divide-dust-50/5">
                  {items.map((item) => {
                    const spec = itemSpecsMap.get(item.id)!;
                    const allocatedInThisBox = box.allocations[item.id] || 0;
                    const totalAllocatedAll = getAllocatedCount(item.id);
                    const isRegisteredHere = isRegistered && allocatedInThisBox > 0;

                    // If box is registered and item is not in this box, hide it
                    if (isRegistered && allocatedInThisBox === 0) return null;

                    // Can increment if:
                    // 1) There are unallocated units, OR
                    // 2) Another pending box has at least 1 unit to borrow/transfer, AND
                    // 3) Adding this unit will not make gross weight exceed 30,000g
                    const donorAvailable = formBoxes.some(
                      (b) =>
                        b.boxIndex !== box.boxIndex &&
                        b.status === 'PENDING' &&
                        (b.allocations[item.id] || 0) > 0,
                    );
                    const hasUnallocated = totalAllocatedAll < spec.totalUnits;
                    const wouldExceedGross = totalBoxGrossGrams + spec.unitWeightGrams > 30000;
                    const canIncrement =
                      !isRegistered && (hasUnallocated || donorAvailable) && !wouldExceedGross;
                    const canDecrement = !isRegistered && allocatedInThisBox > 0;

                    return (
                      <div
                        key={item.id}
                        className={`py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs ${
                          isRegisteredHere
                            ? 'opacity-85'
                            : allocatedInThisBox === 0
                            ? 'opacity-60 hover:opacity-100 transition'
                            : ''
                        }`}
                      >
                        {/* Item Details */}
                        <div className="flex-1 min-w-[200px]">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-soil-900 dark:text-dust-50">
                              {item.productName}
                            </span>
                            {spec.isBundle && (
                              <span className="rounded bg-flora-100 dark:bg-flora-800/80 px-1.5 py-0.5 text-[10px] font-bold text-flora-800 dark:text-dust-50">
                                ست {toFa(spec.bundleSize)} عددی
                              </span>
                            )}
                            {isRegisteredHere && (
                              <span className="rounded bg-emerald-100 dark:bg-emerald-900/60 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-200">
                                ارسال شده
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 text-[11px] text-soil-700/60 dark:text-dust-300/60 flex items-center gap-3">
                            <span>
                              وزن واحد:{' '}
                              <b className="font-mono text-soil-800 dark:text-dust-100">
                                {toFa((spec.unitWeightGrams / 1000).toFixed(1))} کیلو
                              </b>
                            </span>
                            <span>
                              سفارش کل:{' '}
                              <b className="font-mono text-soil-800 dark:text-dust-100">
                                {toFa(spec.totalUnits)}{' '}
                                {spec.isBundle ? 'بسته' : 'عدد'}
                              </b>
                            </span>
                            {!isRegistered && (
                              <span>
                                (در این کارتن:{' '}
                                <b className="font-mono font-bold text-flora-800 dark:text-flora-200">
                                  {toFa(allocatedInThisBox)}
                                </b>{' '}
                                | کل تخصیص: {toFa(totalAllocatedAll)} از {toFa(spec.totalUnits)})
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Stepper / Controls */}
                        {isRegistered ? (
                          <div className="font-mono font-bold text-xs bg-emerald-100/70 dark:bg-emerald-900/40 text-emerald-900 dark:text-emerald-200 px-3 py-1 rounded-lg">
                            {toFa(allocatedInThisBox)} {spec.isBundle ? 'بسته' : 'عدد'} (ثبت شده)
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            {allocatedInThisBox > 0 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveItemFromBox(box.boxIndex, item.id)}
                                disabled={isPending}
                                className="text-[11px] text-soil-700/60 dark:text-dust-300/60 hover:text-red-600 dark:hover:text-red-400 cursor-pointer px-1 py-0.5 rounded transition"
                                title="حذف این قلم از این کارتن"
                              >
                                حذف
                              </button>
                            )}

                            <div className="flex items-center rounded-xl border border-soil-900/15 dark:border-dust-50/15 bg-white dark:bg-flora-900 p-0.5">
                              <button
                                type="button"
                                onClick={() => handleDecrement(box.boxIndex, item.id)}
                                disabled={!canDecrement || isPending}
                                className="size-7 flex items-center justify-center rounded-lg text-sm font-black text-soil-700 dark:text-dust-200 hover:bg-soil-100 dark:hover:bg-flora-800 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed transition"
                                title="کاهش تعداد در این کارتن"
                              >
                                −
                              </button>
                              <span className="w-9 text-center font-mono text-xs font-bold text-soil-900 dark:text-dust-50">
                                {toFa(allocatedInThisBox)}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleIncrement(box.boxIndex, item.id)}
                                disabled={!canIncrement || isPending}
                                className="size-7 flex items-center justify-center rounded-lg text-sm font-black text-soil-700 dark:text-dust-200 hover:bg-soil-100 dark:hover:bg-flora-800 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed transition"
                                title={
                                  wouldExceedGross
                                    ? 'افزودن این قلم از سقف ۳۰ کیلوگرم با کارتن تجاوز می‌کند'
                                    : hasUnallocated
                                    ? 'افزودن به این کارتن'
                                    : donorAvailable
                                    ? 'انتقال یک واحد از کارتن دیگر به این کارتن'
                                    : 'تمام واحدها ثبت شده‌اند'
                                }
                              >
                                +
                              </button>
                            </div>
                            <span className="text-[11px] text-soil-700/60 dark:text-dust-300/60 w-10">
                              {spec.isBundle ? 'بسته' : 'عدد'}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Button & Errors for Pending Box */}
              {!isRegistered && (
                <div className="mt-4 pt-3 border-t border-soil-900/5 dark:border-dust-50/10 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs text-soil-700/70 dark:text-dust-200/70">
                    {productWeightGrams === 0 ? (
                      <span className="text-amber-700 dark:text-amber-300 font-medium">
                        لطفاً با استفاده از دکمه‌های + اقلام این کارتن را مشخص کنید.
                      </span>
                    ) : isOverloaded ? (
                      <span className="text-red-600 dark:text-red-400 font-bold">
                        وزن کل بسته با کارتن از سقف ۳۰ کیلوگرم بیشتر است.
                      </span>
                    ) : (
                      <span>آماده ثبت نهایی در تاپین</span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRegisterBox(box.boxIndex)}
                    disabled={isPending || isSubmitting || productWeightGrams === 0 || isOverloaded}
                    className="rounded-xl bg-flora-800 dark:bg-flora-700 px-5 py-2 text-xs font-bold text-white hover:bg-flora-900 dark:hover:bg-flora-800 disabled:opacity-50 transition flex items-center gap-2 cursor-pointer shadow-sm"
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="size-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>در حال استعلام و ثبت در تاپین...</span>
                      </>
                    ) : (
                      <span>ثبت نهایی این کارتن در تاپین (بسته {toFa(idx + 1)})</span>
                    )}
                  </button>
                </div>
              )}

              {/* Error Message for this box */}
              {errorMsg && (
                <div className="mt-3 rounded-xl border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/50 p-2.5 text-xs font-bold text-red-700 dark:text-red-300">
                  خطا: {errorMsg}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
