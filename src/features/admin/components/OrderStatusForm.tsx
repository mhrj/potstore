'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Select from '@/components/ui/Select';
import { updateOrderStatusAction } from '@/features/admin/actions/order-actions';
import type { OrderStatus } from '@/lib/orders';

const STATUSES = [
  { key: 'PENDING', label: 'در انتظار پرداخت' },
  { key: 'PAID', label: 'پرداخت‌شده' },
  { key: 'PROCESSING', label: 'در حال آماده‌سازی' },
  { key: 'SHIPPED', label: 'ارسال‌شده' },
  { key: 'DELIVERED', label: 'تحویل‌شده' },
  { key: 'CANCELED', label: 'لغو‌شده' },
];

const CARRIERS = [
  'پست پیشتاز',
  'پست عادی',
  'تیپاکس',
  'پیک موتوری',
];

export default function OrderStatusForm({
  orderId,
  initialStatus,
  initialTracking,
  initialCarrier = 'پست پیشتاز',
}: {
  orderId: string;
  initialStatus: string;
  initialTracking: string;
  initialCarrier?: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState(initialStatus);
  const [tracking, setTracking] = useState(initialTracking);
  const [carrier, setCarrier] = useState(initialCarrier || 'پست پیشتاز');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await updateOrderStatusAction({
        orderId,
        status: status as OrderStatus,
        trackingCode: tracking.trim() || null,
        shippingCarrier: carrier.trim() || null,
      });

      if (!res.success) {
        setError(res.error);
        return;
      }

      if (res.order.trackingCode) {
        setTracking(res.order.trackingCode);
      }
      if (res.order.shippingCarrier) {
        setCarrier(res.order.shippingCarrier);
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-soil-900/10 dark:border-dust-50/10 bg-white dark:bg-flora-900 p-5">
      <h2 className="text-sm font-black text-soil-900 dark:text-dust-50">به‌روزرسانی وضعیت و مرسوله</h2>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div className="block">
          <label htmlFor="order-status-select" className="block text-xs font-bold text-soil-900 dark:text-dust-200">وضعیت سفارش</label>
          <Select
            id="order-status-select"
            name="status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            containerClassName="mt-1.5"
          >
            {STATUSES.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </Select>
        </div>

        <div className="block">
          <label htmlFor="order-carrier-select" className="block text-xs font-bold text-soil-900 dark:text-dust-200">شرکت حمل و نقل</label>
          <Select
            id="order-carrier-select"
            name="carrier"
            value={carrier}
            onChange={(e) => setCarrier(e.target.value)}
            containerClassName="mt-1.5"
          >
            {CARRIERS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>
        </div>

        <div className="block">
          <label htmlFor="order-tracking-code" className="block text-xs font-bold text-soil-900 dark:text-dust-200">
            کد رهگیری {carrier || 'مرسوله'}
          </label>
          <input
            id="order-tracking-code"
            name="trackingCode"
            value={tracking}
            onChange={(e) => setTracking(e.target.value)}
            dir="ltr"
            placeholder={status === 'SHIPPED' ? 'کد رهگیری (در صورت خالی بودن خودکار ایجاد می‌شود)' : 'کد رهگیری'}
            aria-describedby="tracking-hint"
            className="mt-1.5 w-full rounded-xl border border-soil-900/15 dark:border-dust-50/20 bg-white dark:bg-flora-950 text-soil-900 dark:text-dust-50 px-3 py-2.5 text-sm outline-none focus:border-flora-500"
          />
          <span id="tracking-hint" className="mt-1.5 block text-[11px] text-soil-700/60 dark:text-dust-200/60">
            {status === 'SHIPPED' && !tracking
              ? 'در صورت خالی ماندن، کد سیستمی ایجاد می‌شود'
              : 'کد رهگیری صادرشده توسط شرکت پست یا باربری'}
          </span>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
          {error}
        </p>
      )}
      {saved && (
        <p className="mt-3 rounded-xl bg-flora-100 px-3 py-2 text-xs font-bold text-flora-700">
          ذخیره شد ✓
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-4 rounded-xl bg-flora-900 px-6 py-2.5 text-xs font-black text-white transition hover:bg-flora-700 disabled:opacity-50"
      >
        {pending ? 'در حال ذخیره…' : 'ذخیره'}
      </button>
    </form>
  );
}
