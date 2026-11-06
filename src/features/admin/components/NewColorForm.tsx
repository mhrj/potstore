'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

function normalizeHex(input: string): string | null {
  let val = input.trim().toUpperCase();
  if (!val) return null;
  if (!val.startsWith('#')) val = `#${val}`;
  if (/^#([0-9A-F]{3})$/i.test(val)) {
    val = `#${val[1]}${val[1]}${val[2]}${val[2]}${val[3]}${val[3]}`;
  }
  if (!/^#[0-9A-F]{6}$/i.test(val)) return null;
  return val;
}

export default function NewColorForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [hexCode, setHexCode] = useState('#8B8B8B');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const normalized = normalizeHex(hexCode);

    if (!trimmedName) {
      setError('نام رنگ الزامی است');
      return;
    }
    if (!normalized) {
      setError('کد رنگ نامعتبر است');
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/admin/colors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: trimmedName, hexCode: normalized }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data?.message ?? 'افزودن رنگ ناموفق بود');
          return;
        }

        setName('');
        setHexCode('#8B8B8B');
        router.refresh();
      } catch {
        setError('ارتباط با سرور برقرار نشد. لطفاً اینترنت خود را بررسی کرده و دوباره تلاش کنید.');
      }
    });
  };

  return (
    <form noValidate onSubmit={handleSubmit} className="mt-6 rounded-2xl border border-soil-900/10 dark:border-dust-50/10 bg-white dark:bg-flora-900 p-5">
      <h2 className="text-sm font-black text-soil-900 dark:text-dust-50">افزودن رنگ جدید</h2>
      <p className="mt-1 text-xs text-soil-700/60 dark:text-dust-200/60">
        این رنگ به پالت سراسری اضافه می‌شود و هنگام تعریف محصولات یا اقلام بسته قابل انتخاب خواهد بود.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-12">
        <div className="block sm:col-span-6">
          <label htmlFor="new-color-name" className="block text-xs font-bold text-soil-900 dark:text-dust-200">
            نام رنگ <span className="text-red-500">*</span>
          </label>
          <input
            id="new-color-name"
            name="colorName"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="مثلاً: سفید مات، تراکوتا، خاکی"
            className="mt-2 w-full rounded-xl border border-soil-900/15 dark:border-dust-50/20 dark:bg-flora-950 dark:text-dust-50 px-3 py-2.5 text-sm outline-none focus:border-flora-500 focus:ring-2 focus:ring-flora-500/20"
          />
        </div>

        <div className="sm:col-span-6">
          <label htmlFor="new-color-hex-text" className="block text-xs font-bold text-soil-900 dark:text-dust-200">
            کد رنگ (Hex) <span className="text-red-500">*</span>
          </label>
          <div className="mt-2 flex items-center gap-2">
            <input
              id="new-color-hex-picker"
              name="colorPicker"
              type="color"
              aria-label="انتخاب از جعبه رنگ"
              value={hexCode.startsWith('#') && hexCode.length === 7 ? hexCode : '#8B8B8B'}
              onChange={(e) => setHexCode(e.target.value.toUpperCase())}
              className="size-11 cursor-pointer rounded-xl border border-soil-900/15 dark:border-dust-50/20 p-1 bg-white dark:bg-flora-950"
              title="انتخاب از جعبه رنگ"
            />
            <input
              id="new-color-hex-text"
              name="colorHex"
              type="text"
              required
              value={hexCode}
              onChange={(e) => setHexCode(e.target.value)}
              placeholder="#8B8B8B"
              dir="ltr"
              className="w-full flex-1 rounded-xl border border-soil-900/15 dark:border-dust-50/20 dark:bg-flora-950 dark:text-dust-50 px-3 py-2.5 text-sm font-mono outline-none focus:border-flora-500 focus:ring-2 focus:ring-flora-500/20"
            />
          </div>
        </div>
      </div>

      {error && <p className="mt-3 text-xs text-red-600 dark:text-red-400 font-medium">{error}</p>}

      <div className="mt-4 flex items-center justify-end">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-flora-900 dark:bg-flora-700 px-5 py-2.5 text-xs font-black text-white transition hover:bg-flora-700 dark:hover:bg-flora-900 disabled:opacity-50"
        >
          {pending ? 'در حال ثبت…' : '+ افزودن به پالت رنگ'}
        </button>
      </div>
    </form>
  );
}
