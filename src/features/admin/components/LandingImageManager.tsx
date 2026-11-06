'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import ConfirmModal from '@/components/ui/ConfirmModal';

type LandingImageEntry = {
  key: string;
  url: string;
  alt?: string | null;
};

const slots = [
  { key: 'hero', label: 'تصویر اصلی بالای صفحه', description: 'تصویر اصلی hero در بالای وب‌سایت' },
  { key: 'journey', label: 'تصویر بخش داستان', description: 'بخش روایت و سفر گیاه‌داری' },
  { key: 'cta', label: 'تصویر بخش پیشنهاد ویژه', description: 'پیشنهاد ویژه و سفارش عمده' },
] as const;

export default function LandingImageManager({ initial }: { initial: LandingImageEntry[] }) {
  const router = useRouter();
  const map = useMemo(
    () => Object.fromEntries(initial.map((item) => [item.key, item.url])),
    [initial],
  );
  const altMap = useMemo(
    () => Object.fromEntries(initial.map((item) => [item.key, item.alt ?? ''])),
    [initial],
  );
  const [state, setState] = useState<Record<string, string>>(map);
  const [alts, setAlts] = useState<Record<string, string>>(altMap);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [savingAlt, setSavingAlt] = useState<Record<string, boolean>>({});
  const [slotErrors, setSlotErrors] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [slotToClear, setSlotToClear] = useState<string | null>(null);

  const persist = async (slotKey: string, url: string, alt?: string) => {
    const res = await fetch('/api/admin/landing-images', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(alt ? { key: slotKey, url, alt } : { key: slotKey, url }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message ?? 'ذخیره تصویر ناموفق بود');
    setState((prev) => ({ ...prev, [slotKey]: url }));
    setSlotErrors((prev) => ({ ...prev, [slotKey]: false }));
    router.refresh();
  };

  async function handleUpload(slotKey: string, file: File | null) {
    if (!file) return;

    setError(null);
    setSlotErrors((prev) => ({ ...prev, [slotKey]: false }));
    setUploading((prev) => ({ ...prev, [slotKey]: true }));

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('kind', 'landing');

      const uploadRes = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      const uploadData = await uploadRes.json().catch(() => ({}));
      if (!uploadRes.ok) {
        throw new Error(uploadData?.message ?? 'آپلود تصویر ناموفق بود');
      }

      await persist(slotKey, uploadData.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'عملیات ناموفق بود');
    } finally {
      setUploading((prev) => ({ ...prev, [slotKey]: false }));
    }
  }

  async function saveAlt(slotKey: string) {
    const url = state[slotKey];
    if (!url) return;
    setError(null);
    setSavingAlt((prev) => ({ ...prev, [slotKey]: true }));
    try {
      await persist(slotKey, url, alts[slotKey] ?? '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ذخیره توضیح ناموفق بود');
    } finally {
      setSavingAlt((prev) => ({ ...prev, [slotKey]: false }));
    }
  }

  async function handleConfirmClear() {
    if (!slotToClear) return;
    const slotKey = slotToClear;
    setSlotToClear(null);
    setError(null);
    setUploading((prev) => ({ ...prev, [slotKey]: true }));
    try {
      const res = await fetch('/api/admin/landing-images', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: slotKey }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message ?? 'حذف تصویر ناموفق بود');
      setState((prev) => ({ ...prev, [slotKey]: '' }));
      setSlotErrors((prev) => ({ ...prev, [slotKey]: false }));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حذف تصویر ناموفق بود');
    } finally {
      setUploading((prev) => ({ ...prev, [slotKey]: false }));
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-soil-900/10 dark:border-dust-50/10 bg-white/70 dark:bg-flora-900/70 p-4 text-xs text-soil-700/80 dark:text-dust-200/80">
        <p className="font-bold text-soil-900 dark:text-dust-50">مدیریت تصاویر صفحه فرود (Landing Page)</p>
        <p className="mt-1">
          تصاویر در حافظه محلی ذخیره می‌شوند (<code className="font-mono text-soil-900 dark:text-dust-50">/public/uploads/landing</code>) و در جایگاه‌های اصلی وب‌سایت نمایش داده می‌شوند.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {slots.map((slot) => {
          const currentUrl = state[slot.key] ?? '';
          const isUploading = uploading[slot.key];
          const hasError = slotErrors[slot.key];

          return (
            <div key={slot.key} className="flex flex-col justify-between rounded-2xl border border-soil-900/10 dark:border-dust-50/10 bg-dust-50 dark:bg-flora-900 p-4">
              <div>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-black text-soil-900 dark:text-dust-50">{slot.label}</h3>
                    <p className="mt-1 text-[11px] text-soil-700/70 dark:text-dust-200/70">{slot.description}</p>
                  </div>
                </div>

                {/* Substantial preview area preserving aspect ratio with object-contain */}
                <div className="relative mt-4 flex h-60 w-full items-center justify-center overflow-hidden rounded-xl border border-soil-900/5 dark:border-dust-50/10 bg-white dark:bg-flora-950 p-2">
                  {currentUrl && !hasError && (
                    <img
                      src={currentUrl}
                      alt={alts[slot.key] || slot.label}
                      className="h-full w-full object-contain"
                      onError={() => setSlotErrors((prev) => ({ ...prev, [slot.key]: true }))}
                      onLoad={() => setSlotErrors((prev) => ({ ...prev, [slot.key]: false }))}
                    />
                  )}

                  {currentUrl && hasError && (
                    <div className="flex flex-col items-center justify-center p-4 text-center text-xs text-red-600 dark:text-red-400">
                      <span className="text-2xl mb-1">⚠️</span>
                      <p className="font-bold">تصویر در این مسیر یافت نشد</p>
                      <p className="mt-1 font-mono text-[10px] text-soil-700/60 dark:text-dust-200/60 dir-ltr">{currentUrl}</p>
                    </div>
                  )}

                  {!currentUrl && !isUploading && (
                    <div className="flex flex-col items-center justify-center text-xs text-soil-700/60 dark:text-dust-200/60">
                      <span className="text-2xl mb-1">🖼️</span>
                      <span>هنوز تصویری تنظیم نشده</span>
                    </div>
                  )}

                  {isUploading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/85 dark:bg-flora-900/85 backdrop-blur-sm text-xs font-bold text-soil-900 dark:text-dust-50">
                      <div className="mb-2 size-7 animate-spin rounded-full border-3 border-flora-700 border-t-transparent" />
                      <span>در حال پردازش و آپلود…</span>
                    </div>
                  )}
                </div>

                <label className="mt-4 block cursor-pointer rounded-xl border border-soil-900/15 dark:border-dust-50/20 bg-white dark:bg-flora-950 px-3 py-2 text-center text-xs font-bold text-soil-900 dark:text-dust-100 transition hover:border-flora-700 dark:hover:border-flora-300 hover:text-flora-700 dark:hover:text-flora-300">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
                    className="hidden"
                    onChange={(e) => handleUpload(slot.key, e.target.files?.[0] ?? null)}
                  />
                  {isUploading ? 'در حال آپلود…' : currentUrl ? 'تغییر تصویر' : 'انتخاب و آپلود تصویر'}
                </label>

                {currentUrl && (
                  <div className="mt-3">
                    <label className="block text-[11px] font-bold text-soil-700/80 dark:text-dust-200/80">
                      توضیح تصویر (alt)
                      <input
                        value={alts[slot.key] ?? ''}
                        onChange={(e) =>
                          setAlts((prev) => ({ ...prev, [slot.key]: e.target.value }))
                        }
                        onBlur={() => saveAlt(slot.key)}
                        disabled={savingAlt[slot.key]}
                        placeholder="مثلاً: گلدان سفالی دست‌ساز"
                        className="mt-1.5 w-full rounded-xl border border-soil-900/15 dark:border-dust-50/20 bg-white dark:bg-flora-950 px-3 py-2 text-xs font-normal text-soil-900 dark:text-dust-50 outline-none transition focus:border-flora-500"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => setSlotToClear(slot.key)}
                      disabled={isUploading}
                      className="mt-3 w-full rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 px-3 py-2 text-xs font-bold text-red-700 dark:text-red-400 transition hover:bg-red-100 dark:hover:bg-red-900/50 disabled:opacity-50 cursor-pointer"
                    >
                      {isUploading ? 'در حال حذف…' : 'حذف تصویر'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 px-4 py-3 text-xs font-bold text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(slotToClear)}
        title="حذف تصویر"
        message="این تصویر حذف شود؟ بخش مربوطه به حالت پیش‌فرض برمی‌گردد."
        isDestructive={true}
        confirmText="حذف تصویر"
        cancelText="انصراف"
        onConfirm={handleConfirmClear}
        onCancel={() => setSlotToClear(null)}
      />
    </div>
  );
}
