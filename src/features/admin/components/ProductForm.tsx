'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { ProductFeature, BundleItem, ColorOption } from '@/lib/product-features';
import { formatToman, toFa } from '@/lib/format';
import { numberToWordsFa } from '@/lib/number-to-words';
import { FormError } from '@/components/ui/FormError';
import GlobalColorPicker, { type GlobalColorOption } from '@/features/admin/components/GlobalColorPicker';
import ConfirmModal from '@/components/ui/ConfirmModal';

type Tier = { minQuantity: number; unitPriceToman: number; label: string };

export type ProductFormData = {
  id?: string;
  slug: string;
  sku?: string | null;
  name: string;
  shortDesc: string;
  description: string;
  categoryId?: string | null;
  material: string;
  color: string;
  colorOptions?: ColorOption[];
  diameterCm: number;
  heightCm: number;
  weightGrams: number;
  stock: number;
  unitsPerCarton?: number;
  bundleSize: number;
  minOrderQuantity?: number;
  bundleItems: BundleItem[] | null;
  basePriceToman: number;
  salePriceToman?: number | null;
  isActive: boolean;
  isFeatured: boolean;
  allowBatchDiscount?: boolean;
  isFragile?: boolean;
  features: ProductFeature[];
  images: string[];
  tagIds: string[];
  tiers: Tier[];
};

const inputCls =
  'mt-1.5 w-full rounded-xl border border-soil-900/15 dark:border-dust-50/20 bg-white dark:bg-flora-950 text-soil-900 dark:text-dust-50 px-3 py-2.5 text-sm outline-none focus:border-flora-500 focus:ring-2 focus:ring-flora-500/20';
const labelCls = 'text-xs font-bold text-soil-900 dark:text-dust-200';

function fieldCls(errorMsg?: string) {
  return `mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition bg-white dark:bg-flora-950 text-soil-900 dark:text-dust-50 ${
    errorMsg
      ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
      : 'border-soil-900/15 dark:border-dust-50/20 focus:border-flora-500 focus:ring-2 focus:ring-flora-500/20'
  }`;
}



export type CatalogProductOption = {
  id: string;
  name: string;
  material: string;
  diameterCm: number;
  heightCm: number;
  weightGrams: number;
  basePriceToman: number;
};

export default function ProductForm({
  initial,
  knownLabels,
  catalogProducts = [],
  categories: initialCategories,
  globalColors: initialGlobalColors = [],
}: {
  initial: ProductFormData;
  knownLabels: string[];
  catalogProducts?: CatalogProductOption[];
  categories?: Array<{ id: string; name: string }>;
  globalColors?: GlobalColorOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState<Record<number, boolean>>({});
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [allTags, setAllTags] = useState<Array<{ id: string; name: string }>>([]);
  const [allCategories, setAllCategories] = useState<Array<{ id: string; name: string }>>(
    initialCategories ?? [],
  );
  const [allGlobalColors, setAllGlobalColors] = useState<GlobalColorOption[]>(
    initialGlobalColors ?? [],
  );
  const [featureInput, setFeatureInput] = useState('');
  const [form, setForm] = useState<ProductFormData>({
    ...initial,
    sku: initial.sku ?? '',
    categoryId: initial.categoryId ?? '',
    unitsPerCarton: 1,
    bundleSize: initial.bundleSize ?? 1,
    minOrderQuantity: initial.minOrderQuantity ?? 1,
    bundleItems: initial.bundleItems ?? [],
    colorOptions: initial.colorOptions ?? [],
    allowBatchDiscount: initial.allowBatchDiscount ?? true,
    isFragile: initial.isFragile ?? false,
    salePriceToman: initial.salePriceToman ?? null,
  });

  const initialIsBundle = Boolean(
    (initial.bundleSize && initial.bundleSize > 1) ||
    (initial.bundleItems && initial.bundleItems.length > 0)
  );
  const [isBundleActive, setIsBundleActive] = useState<boolean>(initialIsBundle);

  function handleToggleBundle(active: boolean) {
    setIsBundleActive(active);
    if (!active) {
      setForm((prev) => ({
        ...prev,
        bundleSize: 1,
        bundleItems: [],
      }));
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.bundleItems;
        return next;
      });
    } else {
      setForm((prev) => {
        const items = prev.bundleItems ?? [];
        const sum = items.reduce(
          (acc, it) => acc + (Number(it.weightGrams) || 0),
          0,
        );
        return {
          ...prev,
          bundleSize: Math.max(1, items.length),
          weightGrams: sum,
        };
      });
    }
  }

  const bundleWeightSum = (form.bundleItems ?? []).reduce(
    (acc, it) => acc + (Number(it.weightGrams) || 0),
    0,
  );

  useEffect(() => {
    if (isBundleActive) {
      const sum = (form.bundleItems ?? []).reduce(
        (acc, it) => acc + (Number(it.weightGrams) || 0),
        0,
      );
      if (form.weightGrams !== sum) {
        setForm((prev) => ({ ...prev, weightGrams: sum }));
      }
    }
  }, [isBundleActive, form.bundleItems, form.weightGrams]);

  function handleAddBundleItem() {
    const current = form.bundleItems ?? [];
    const next: BundleItem[] = [
      ...current,
      {
        title: '',
        description: '',
        material: '',
        diameterCm: 0,
        heightCm: 0,
        weightGrams: 0,
        price: 0,
        priceToman: 0,
        colorOptions: [],
      },
    ];
    setForm((prev) => ({
      ...prev,
      bundleItems: next,
      bundleSize: Math.max(1, next.length),
    }));
    if (fieldErrors.bundleItems) {
      setFieldErrors((prev) => ({ ...prev, bundleItems: '' }));
    }
  }

  function handleRemoveBundleItem(idx: number) {
    const current = form.bundleItems ?? [];
    const next = current.filter((_, i) => i !== idx);
    setForm((prev) => ({
      ...prev,
      bundleItems: next,
      bundleSize: Math.max(1, next.length),
    }));
  }

  useEffect(() => {
    async function loadTags() {
      try {
        const res = await fetch('/api/admin/tags');
        if (!res.ok) return;
        const data = await res.json().catch(() => ({ tags: [] }));
        setAllTags(data.tags ?? []);
      } catch {
        setAllTags([]);
      }
    }
    async function loadCategories() {
      try {
        const res = await fetch('/api/admin/categories');
        if (!res.ok) return;
        const data = await res.json().catch(() => ({ categories: [] }));
        setAllCategories(data.categories ?? []);
      } catch {
        setAllCategories([]);
      }
    }
    async function loadGlobalColors() {
      try {
        const res = await fetch('/api/admin/colors');
        if (!res.ok) return;
        const data = await res.json().catch(() => ({ colors: [] }));
        if (data.colors && data.colors.length > 0) {
          setAllGlobalColors(data.colors);
        }
      } catch {
        // fallback to initial
      }
    }
    loadTags();
    loadCategories();
    loadGlobalColors();
  }, []);

  function update<K extends keyof ProductFormData>(key: K, value: ProductFormData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    if (fieldErrors[key as string]) {
      setFieldErrors((prev) => ({ ...prev, [key as string]: '' }));
    }
  }

  function updateTier(i: number, patch: Partial<Tier>) {
    setForm((f) => {
      const next = [...f.tiers];
      next[i] = { ...next[i], ...patch };
      return { ...f, tiers: next };
    });
    if (fieldErrors.tiers) {
      setFieldErrors((prev) => ({ ...prev, tiers: '' }));
    }
  }

  function handleAddTier() {
    setForm((f) => {
      const sorted = [...f.tiers].sort((a, b) => a.minQuantity - b.minQuantity);
      const lastTier = sorted[sorted.length - 1];
      const nextMinQty = lastTier
        ? lastTier.minQuantity < 5
          ? 5
          : lastTier.minQuantity < 20
          ? 20
          : lastTier.minQuantity + 10
        : 1;
      const lastPrice = lastTier ? lastTier.unitPriceToman : f.basePriceToman;
      const nextPrice = Math.max(1000, Math.round(lastPrice * 0.9));
      return {
        ...f,
        tiers: [
          ...f.tiers,
          { minQuantity: nextMinQty, unitPriceToman: nextPrice, label: '' },
        ],
      };
    });
    if (fieldErrors.tiers) {
      setFieldErrors((prev) => ({ ...prev, tiers: '' }));
    }
  }

  function handleRemoveTier(index: number) {
    setForm((f) => ({
      ...f,
      tiers: f.tiers.filter((_, i) => i !== index),
    }));
    if (fieldErrors.tiers) {
      setFieldErrors((prev) => ({ ...prev, tiers: '' }));
    }
  }

  // One-click add: every feature arrives already enabled. There is no per-row
  // toggle any more, so a duplicate label is silently ignored rather than
  // flipping an existing chip's state.
  function addFeatureFromInput() {
    const label = featureInput.trim();
    if (!label) return;
    if (form.features.some((f) => f.label === label)) {
      setFeatureInput('');
      return;
    }
    update('features', [...form.features, { label, enabled: true }]);
    setFeatureInput('');
  }

  function removeFeature(i: number) {
    update('features', form.features.filter((_, j) => j !== i));
  }

  function handleToggleColor(hex: string) {
    const normalized = hex.toUpperCase();
    setForm((prev) => {
      const current = prev.colorOptions ?? [];
      const exists = current.some((c) => c.hexCode.toUpperCase() === normalized);
      const next = exists
        ? current.filter((c) => c.hexCode.toUpperCase() !== normalized)
        : [...current, { hexCode: normalized, stock: Math.max(0, prev.stock ?? 0), priceAdjustment: 0 }];
      return { ...prev, colorOptions: next };
    });
  }

  function handleRemoveColorByHex(hex: string) {
    const normalized = hex.toUpperCase();
    setForm((prev) => ({
      ...prev,
      colorOptions: (prev.colorOptions ?? []).filter(
        (c) => c.hexCode.toUpperCase() !== normalized,
      ),
    }));
  }

  function handleUpdateColorStock(hex: string, stock: number) {
    const normalized = hex.toUpperCase();
    setForm((prev) => ({
      ...prev,
      colorOptions: (prev.colorOptions ?? []).map((c) =>
        c.hexCode.toUpperCase() === normalized ? { ...c, stock } : c,
      ),
    }));
  }

  function handleUpdateColorPriceAdjustment(hex: string, priceAdjustment: number) {
    const normalized = hex.toUpperCase();
    setForm((prev) => ({
      ...prev,
      colorOptions: (prev.colorOptions ?? []).map((c) =>
        c.hexCode.toUpperCase() === normalized ? { ...c, priceAdjustment } : c,
      ),
    }));
  }

  function handleToggleBundleItemColor(itemIdx: number, hex: string) {
    const normalized = hex.toUpperCase();
    setForm((prev) => {
      const items = [...(prev.bundleItems ?? [])];
      const item = items[itemIdx];
      if (!item) return prev;
      const current = item.colorOptions ?? [];
      const exists = current.some((c) => c.hexCode.toUpperCase() === normalized);
      const defaultStock = Math.max(0, prev.stock ?? 0);
      const next = exists
        ? current.filter((c) => c.hexCode.toUpperCase() !== normalized)
        : [...current, { hexCode: normalized, stock: defaultStock, priceAdjustment: 0 }];
      items[itemIdx] = { ...item, colorOptions: next };
      return { ...prev, bundleItems: items };
    });
  }

  function handleRemoveBundleItemColorByHex(itemIdx: number, hex: string) {
    const normalized = hex.toUpperCase();
    setForm((prev) => {
      const items = [...(prev.bundleItems ?? [])];
      const item = items[itemIdx];
      if (!item) return prev;
      const current = item.colorOptions ?? [];
      items[itemIdx] = {
        ...item,
        colorOptions: current.filter((c) => c.hexCode.toUpperCase() !== normalized),
      };
      return { ...prev, bundleItems: items };
    });
  }

  function handleUpdateBundleItemColorStock(itemIdx: number, hex: string, stock: number) {
    const normalized = hex.toUpperCase();
    setForm((prev) => {
      const items = [...(prev.bundleItems ?? [])];
      const item = items[itemIdx];
      if (!item) return prev;
      const current = item.colorOptions ?? [];
      items[itemIdx] = {
        ...item,
        colorOptions: current.map((c) =>
          c.hexCode.toUpperCase() === normalized ? { ...c, stock } : c,
        ),
      };
      return { ...prev, bundleItems: items };
    });
  }

  function handleUpdateBundleItemColorPriceAdjustment(itemIdx: number, hex: string, priceAdjustment: number) {
    const normalized = hex.toUpperCase();
    setForm((prev) => {
      const items = [...(prev.bundleItems ?? [])];
      const item = items[itemIdx];
      if (!item) return prev;
      const current = item.colorOptions ?? [];
      items[itemIdx] = {
        ...item,
        colorOptions: current.map((c) =>
          c.hexCode.toUpperCase() === normalized ? { ...c, priceAdjustment } : c,
        ),
      };
      return { ...prev, bundleItems: items };
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const newErrors: Record<string, string> = {};

    if (!form.name.trim()) {
      newErrors.name = 'نام محصول الزامی است';
    } else if (form.name.trim().length < 2) {
      newErrors.name = 'نام محصول باید حداقل ۲ حرف باشد';
    }

    if (!form.slug.trim()) {
      newErrors.slug = 'اسلاگ الزامی است';
    } else if (form.slug.trim().length < 2) {
      newErrors.slug = 'اسلاگ باید حداقل ۲ کاراکتر باشد';
    } else if (!/^[a-z0-9-]+$/.test(form.slug.trim())) {
      newErrors.slug = 'اسلاگ فقط شامل حروف کوچک انگلیسی، عدد و خط تیره باشد';
    }

    if (!isBundleActive && !form.material.trim()) {
      newErrors.material = 'متریال/جنس الزامی است';
    }

    if (!form.description.trim()) {
      newErrors.description = 'توضیحات کامل الزامی است';
    }

    if (!form.basePriceToman || form.basePriceToman < 1000) {
      newErrors.basePriceToman = 'قیمت پایه باید حداقل ۱,۰۰۰ تومان باشد';
    }

    if (form.salePriceToman !== undefined && form.salePriceToman !== null && form.salePriceToman > 0) {
      if (form.salePriceToman >= form.basePriceToman) {
        newErrors.salePriceToman = 'قیمت با تخفیف ویژه باید کمتر از قیمت پایه باشد';
      }
    }

    if (form.stock < 0) {
      newErrors.stock = 'موجودی نمی‌تواند منفی باشد';
    }

    const validImages = form.images.filter((u) => u.trim().length > 0);
    if (validImages.length === 0) {
      newErrors.images = 'حداقل یک تصویر برای محصول الزامی است';
    }

    if (form.allowBatchDiscount ?? true) {
      if (!form.tiers.length) {
        newErrors.tiers = 'حداقل یک پله قیمت الزامی است';
      } else if (!form.tiers.some((t) => t.minQuantity === 1)) {
        newErrors.tiers = 'یکی از پله‌های قیمت باید از تعداد ۱ شروع شود';
      } else {
        const quantities = form.tiers.map((t) => t.minQuantity);
        if (new Set(quantities).size !== quantities.length) {
          newErrors.tiers = 'تعداد حداقل هر پله باید یکتا باشد (تکراری نباشد)';
        } else if (
          form.tiers.some((t) => t.minQuantity > 1 && t.unitPriceToman > form.basePriceToman)
        ) {
          newErrors.tiers = 'خطا: قیمت پله‌های بعدی باید کمتر از قیمت پایه باشد';
        }
      }
    }

    if (isBundleActive) {
      if ((form.bundleItems ?? []).length < 2) {
        newErrors.bundleItems = 'یک بسته باید حداقل شامل ۲ آیتم باشد';
      } else if (form.bundleItems?.some((it) => !it.title.trim())) {
        newErrors.bundleItems = 'نام تمام اقلام موجود در بسته الزامی است';
      }
      const totalValue = (form.bundleItems ?? []).reduce(
        (acc, it) => acc + (it.price ?? it.priceToman ?? 0),
        0,
      );
      if (totalValue > 0 && form.basePriceToman > totalValue) {
        newErrors.basePriceToman = 'قیمت فروش پکیج نمی‌تواند بیشتر از مجموع ارزش اقلام باشد';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setFieldErrors(newErrors);
      setError('لطفاً خطاهای مشخص‌شده در فرم را بررسی کنید.');
      return;
    }

    setFieldErrors({});

    startTransition(async () => {
      const isNew = !initial.id;
      const url = isNew ? '/api/admin/products' : '/api/admin/products/' + initial.id;
      const payload = {
        ...form,
        sku: form.sku?.trim() || null,
        categoryId: form.categoryId || null,
        material: isBundleActive ? (form.material.trim() || 'ترکیبی') : form.material,
        weightGrams: isBundleActive ? bundleWeightSum : form.weightGrams,
        unitsPerCarton: 1,
        bundleSize: isBundleActive ? Math.max(1, (form.bundleItems ?? []).length) : 1,
        minOrderQuantity: form.minOrderQuantity ?? 1,
        bundleItems:
          isBundleActive && (form.bundleItems ?? []).length > 0
            ? (form.bundleItems?.filter((it) => it.title.trim()).map((it) => ({
                ...it,
                description: it.description?.trim() || '',
                price: it.price ?? it.priceToman ?? 0,
                priceToman: it.price ?? it.priceToman ?? 0,
                colorOptions: (it.colorOptions ?? []).map((c) => ({
                  ...c,
                  stock: Math.max(0, Math.floor(Number(c.stock) || 0)),
                  priceAdjustment: Math.round(Number(c.priceAdjustment) || 0),
                })),
              })) ?? [])
            : null,
        colorOptions: (form.colorOptions ?? []).map((c) => ({
          ...c,
          stock: Math.max(0, Math.floor(Number(c.stock) || 0)),
          priceAdjustment: Math.round(Number(c.priceAdjustment) || 0),
        })),
        allowBatchDiscount: form.allowBatchDiscount ?? true,
        isFragile: form.isFragile ?? false,
        salePriceToman: form.salePriceToman && form.salePriceToman > 0 ? form.salePriceToman : null,
        tagIds: [...new Set(form.tagIds)],
        images: form.images.filter((u) => u.trim().length > 0),
        tiers: (form.allowBatchDiscount ?? true)
          ? form.tiers
              .map((t) => ({
                minQuantity: Math.max(1, Math.floor(Number(t.minQuantity)) || 1),
                unitPriceToman: Math.max(0, Math.floor(Number(t.unitPriceToman)) || 0),
                label: t.label?.trim() || '',
              }))
              .sort((a, b) => a.minQuantity - b.minQuantity)
          : [],
      };
      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.message ?? 'ذخیره ناموفق بود');
        if (data?.message?.includes('اسلاگ')) {
          setFieldErrors({ slug: data.message });
        }
        return;
      }
      router.push('/admin/products');
      router.refresh();
    });
  }

  function handleConfirmDelete() {
    if (!initial.id) return;
    setIsDeleteModalOpen(false);
    startTransition(async () => {
      const res = await fetch('/api/admin/products/' + initial.id, { method: 'DELETE' });
      if (!res.ok) {
        setError('حذف ناموفق بود');
        return;
      }
      router.push('/admin/products');
      router.refresh();
    });
  }

  async function uploadImage(index: number, file: File | null) {
    if (!file) return;
    setError(null);
    setUploading((prev) => ({ ...prev, [index]: true }));

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('kind', 'product');

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message ?? 'آپلود عکس ناموفق بود');
      }

      const next = [...form.images];
      next[index] = data.url;
      update('images', next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'آپلود عکس ناموفق بود');
    } finally {
      setUploading((prev) => ({ ...prev, [index]: false }));
    }
  }

  return (
    <form noValidate onSubmit={submit} className="space-y-6">
      <section className="rounded-2xl border border-soil-900/10 dark:border-dust-50/10 bg-white dark:bg-flora-900 p-5">
        <h2 className="mb-4 text-sm font-black text-soil-900 dark:text-dust-50">اطلاعات پایه</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="block sm:col-span-2">
            <label htmlFor="product-name" className={labelCls}>
              نام محصول *
            </label>
            <input
              id="product-name"
              name="name"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              className={fieldCls(fieldErrors.name)}
            />
            <FormError message={fieldErrors.name} />
          </div>

          <div className="block">
            <label htmlFor="product-slug" className={labelCls}>
              اسلاگ (انگلیسی) *
            </label>
            <input
              id="product-slug"
              name="slug"
              value={form.slug}
              onChange={(e) => update('slug', e.target.value)}
              dir="ltr"
              placeholder="clay-pot-terracotta-medium"
              className={fieldCls(fieldErrors.slug)}
            />
            <FormError message={fieldErrors.slug} />
          </div>

          <div className="block">
            <label htmlFor="product-sku" className={labelCls}>
              کد کالا (SKU)
            </label>
            <input
              id="product-sku"
              name="sku"
              value={form.sku ?? ''}
              onChange={(e) => update('sku', e.target.value)}
              dir="ltr"
              placeholder="POT-101"
              className={`${inputCls} font-mono`}
            />
          </div>

          <div className={`block ${isBundleActive ? 'sm:col-span-2' : ''}`}>
            <label htmlFor="product-categoryId" className={labelCls}>
              دسته‌بندی
            </label>
            <select
              id="product-categoryId"
              name="categoryId"
              value={form.categoryId ?? ''}
              onChange={(e) => {
                const val = e.target.value;
                update('categoryId', val);
                const matched = allCategories.find((c) => c.id === val);
                if (matched && !form.material) {
                  update('material', matched.name);
                }
              }}
              className={inputCls}
            >
              <option value="">
                {allCategories.length === 0 ? 'ابتدا یک دسته‌بندی ایجاد کنید.' : 'انتخاب دسته‌بندی…'}
              </option>
              {allCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            {allCategories.length === 0 && (
              <p className="mt-1.5 text-xs text-amber-700 font-medium">
                ابتدا یک دسته‌بندی ایجاد کنید.
              </p>
            )}
          </div>

          {!isBundleActive && (
            <div className="block">
              <label htmlFor="product-material" className={labelCls}>
                متریال *
              </label>
              <input
                id="product-material"
                name="material"
                value={form.material}
                onChange={(e) => update('material', e.target.value)}
                className={fieldCls(fieldErrors.material)}
              />
              <FormError message={fieldErrors.material} />
            </div>
          )}

          <div className="block sm:col-span-2">
            <label htmlFor="product-shortDesc" className={labelCls}>
              توضیح کوتاه
            </label>
            <input
              id="product-shortDesc"
              name="shortDesc"
              value={form.shortDesc}
              onChange={(e) => update('shortDesc', e.target.value)}
              className={inputCls}
            />
          </div>

          <div className="block sm:col-span-2">
            <label htmlFor="product-description" className={labelCls}>
              توضیحات کامل *
            </label>
            <textarea
              id="product-description"
              name="description"
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              rows={5}
              className={fieldCls(fieldErrors.description)}
            />
            <FormError message={fieldErrors.description} />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-soil-900/10 dark:border-dust-50/10 bg-white dark:bg-flora-900 p-5">
        <h2 className="mb-4 text-sm font-black text-soil-900 dark:text-dust-50">مشخصات محصول</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {!isBundleActive && (
            <>
              <div className="block">
                <label htmlFor="product-color" className={labelCls}>
                  رنگ
                </label>
                <input
                  id="product-color"
                  name="color"
                  value={form.color}
                  onChange={(e) => update('color', e.target.value)}
                  className={inputCls}
                />
              </div>
              <div className="block">
                <label htmlFor="product-diameterCm" className={labelCls}>
                  قطر (cm)
                </label>
                <input
                  id="product-diameterCm"
                  name="diameterCm"
                  type="number"
                  step="0.5"
                  value={form.diameterCm}
                  onChange={(e) => update('diameterCm', Number(e.target.value))}
                  className={inputCls}
                />
              </div>
              <div className="block">
                <label htmlFor="product-heightCm" className={labelCls}>
                  ارتفاع (cm)
                </label>
                <input
                  id="product-heightCm"
                  name="heightCm"
                  type="number"
                  step="0.5"
                  value={form.heightCm}
                  onChange={(e) => update('heightCm', Number(e.target.value))}
                  className={inputCls}
                />
              </div>
            </>
          )}
          <div className="block">
            <label htmlFor="product-weightGrams" className={labelCls}>
              {isBundleActive ? 'وزن کل بسته (گرم) *' : 'وزن (گرم)'}
            </label>
            <div className="relative">
              <input
                id="product-weightGrams"
                name="weightGrams"
                type="number"
                readOnly={isBundleActive}
                value={isBundleActive ? bundleWeightSum : form.weightGrams}
                onChange={(e) => update('weightGrams', Number(e.target.value))}
                className={`${inputCls} ${
                  isBundleActive
                    ? 'bg-dust-100/70 cursor-not-allowed font-bold text-soil-900 border-soil-900/10'
                    : ''
                }`}
              />
              {isBundleActive && (
                <span className="absolute left-2.5 top-3.5 text-[10px] text-soil-700/60 select-none">
                  مجموع اقلام
                </span>
              )}
            </div>
          </div>
          <div className="block">
            <label htmlFor="product-stock" className={labelCls}>
              موجودی
            </label>
            <input
              id="product-stock"
              name="stock"
              type="number"
              value={form.stock}
              onChange={(e) => update('stock', Number(e.target.value))}
              className={fieldCls(fieldErrors.stock)}
            />
            <FormError message={fieldErrors.stock} />
          </div>
          <div className="block">
            <label htmlFor="product-minOrderQuantity" className={labelCls}>
              حداقل تعداد سفارش (MOQ)
            </label>
            <input
              id="product-minOrderQuantity"
              name="minOrderQuantity"
              type="number"
              min={1}
              value={form.minOrderQuantity ?? 1}
              onChange={(e) => update('minOrderQuantity', Number(e.target.value) || 1)}
              className={inputCls}
            />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-5 text-xs">
          <div className="flex items-center gap-2">
            <input
              id="product-isActive"
              name="isActive"
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => update('isActive', e.target.checked)}
              className="accent-flora-700"
            />
            <label htmlFor="product-isActive" className="cursor-pointer">
              فعال
            </label>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="product-isFeatured"
              name="isFeatured"
              type="checkbox"
              checked={form.isFeatured}
              onChange={(e) => update('isFeatured', e.target.checked)}
              className="accent-flora-700"
            />
            <label htmlFor="product-isFeatured" className="cursor-pointer">
              نمایش در صفحه اصلی
            </label>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="product-isFragile"
              name="isFragile"
              type="checkbox"
              checked={form.isFragile ?? false}
              onChange={(e) => update('isFragile', e.target.checked)}
              className="accent-flora-700"
            />
            <label htmlFor="product-isFragile" className="cursor-pointer">
              کالای شکستنی (Fragile)
            </label>
          </div>
        </div>

        {/* Color Options for single product (HIDDEN when bundle is active) */}
        {!isBundleActive && (
          <div className="mt-6 border-t border-soil-900/10 pt-4">
            <label className="block mb-2">
              <span className={labelCls}>گزینه‌های رنگ (انتخاب از پالت رنگ فروشگاه)</span>
              <span className="block mt-0.5 text-xs text-soil-700/60">
                رنگ‌های مجاز این محصول را از پالت انتخاب کنید تا مشتری بتواند در صفحه خرید رنگ دلخواه را برگزیند.
              </span>
            </label>
            <GlobalColorPicker
              globalColors={allGlobalColors}
              selectedColors={form.colorOptions ?? []}
              onToggleColor={handleToggleColor}
              onRemoveColor={handleRemoveColorByHex}
              onUpdateStock={handleUpdateColorStock}
              onUpdatePriceAdjustment={handleUpdateColorPriceAdjustment}
            />
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-soil-900/10 dark:border-dust-50/10 bg-white dark:bg-flora-900 p-5 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-soil-900/10 dark:border-dust-50/10 pb-4">
          <div>
            <h2 className="text-sm font-black text-soil-900 dark:text-dust-50">تنظیمات بسته (Bundle)</h2>
            <p className="mt-1 text-xs text-soil-700/60 dark:text-dust-200/60">
              اگر این محصول شامل چند گلدان یا آیتم است و به عنوان یک پکیج فروخته می‌شود، این گزینه را فعال کنید.
            </p>
          </div>
          <div className="flex items-center gap-2.5 rounded-xl border border-soil-900/10 dark:border-dust-50/10 bg-dust-50 dark:bg-flora-950 px-4 py-2.5 text-xs font-bold text-soil-900 dark:text-dust-50 cursor-pointer transition hover:bg-dust-100 dark:hover:bg-flora-900">
            <input
              id="product-isBundleActive"
              name="isBundleActive"
              type="checkbox"
              checked={isBundleActive}
              onChange={(e) => handleToggleBundle(e.target.checked)}
              className="accent-flora-700 size-4"
            />
            <label htmlFor="product-isBundleActive" className="cursor-pointer">
              این محصول یک بسته (Bundle) است
            </label>
          </div>
        </div>

        {isBundleActive && (
          <div className="space-y-5">
            <div className="max-w-xs">
              <div className="block">
                <label htmlFor="product-bundleItemsCount" className={labelCls}>
                  تعداد اقلام در بسته
                </label>
                <div className="relative mt-1.5">
                  <input
                    id="product-bundleItemsCount"
                    name="bundleItemsCount"
                    type="number"
                    readOnly
                    value={(form.bundleItems ?? []).length}
                    className="w-full rounded-xl border border-soil-900/10 dark:border-dust-50/10 bg-dust-100/70 dark:bg-flora-950 px-3 py-2.5 text-sm font-bold text-soil-900 dark:text-dust-50 cursor-not-allowed outline-none"
                  />
                  <span className="absolute left-3 top-2.5 text-[11px] text-soil-700/60 dark:text-dust-200/60 select-none">
                    محاسبه خودکار بر اساس اقلام
                  </span>
                </div>
              </div>
            </div>

            {(form.bundleItems ?? []).length < 2 && (
              <div className="rounded-xl border border-amber-500/20 dark:border-amber-500/30 bg-amber-50/70 dark:bg-amber-950/40 px-4 py-3 text-xs text-amber-900 dark:text-amber-200">
                <span>⚠️ توجه: برای اینکه این محصول یک بسته معتبر باشد، باید حداقل ۲ آیتم به لیست زیر اضافه کنید.</span>
              </div>
            )}

            {/* Live Summary Box */}
            {(() => {
              const bundleItems = form.bundleItems ?? [];
              const totalValue = bundleItems.reduce(
                (acc, it) => acc + (it.price ?? it.priceToman ?? 0),
                0,
              );
              const finalPrice = form.basePriceToman || 0;
              const discount = totalValue - finalPrice;
              const discountPercent =
                totalValue > 0 && discount > 0 ? Math.round((discount / totalValue) * 100) : 0;
              const isOverpriced = totalValue > 0 && finalPrice > totalValue;

              return (
                <div className="rounded-2xl border border-soil-900/10 dark:border-dust-50/10 bg-dust-50/80 dark:bg-flora-950/80 p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-xl bg-white dark:bg-flora-900 p-3.5 border border-soil-900/5 dark:border-dust-50/10 shadow-xs dark:shadow-none">
                      <span className="text-soil-700/70 dark:text-dust-200/70 block text-xs mb-1">مجموع ارزش اقلام:</span>
                      <strong className="text-sm sm:text-base font-black text-soil-900 dark:text-dust-50">
                        {formatToman(totalValue)}
                      </strong>
                    </div>
                    <div className="rounded-xl bg-white dark:bg-flora-900 p-3.5 border border-soil-900/5 dark:border-dust-50/10 shadow-xs dark:shadow-none">
                      <span className="text-soil-700/70 dark:text-dust-200/70 block text-xs mb-1">قیمت فروش نهایی:</span>
                      <strong className="text-sm sm:text-base font-black text-flora-900 dark:text-flora-300">
                        {formatToman(finalPrice)}
                      </strong>
                    </div>
                    <div className="rounded-xl bg-white dark:bg-flora-900 p-3.5 border border-soil-900/5 dark:border-dust-50/10 shadow-xs dark:shadow-none">
                      <span className="text-soil-700/70 dark:text-dust-200/70 block text-xs mb-1">تخفیف پکیج:</span>
                      <strong
                        className={`text-sm sm:text-base font-black ${
                          discount >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'
                        }`}
                      >
                        {formatToman(Math.max(0, discount))}
                      </strong>
                    </div>
                    <div className="rounded-xl bg-white dark:bg-flora-900 p-3.5 border border-soil-900/5 dark:border-dust-50/10 shadow-xs dark:shadow-none">
                      <span className="text-soil-700/70 dark:text-dust-200/70 block text-xs mb-1">درصد تخفیف:</span>
                      <strong className="text-sm sm:text-base font-black text-emerald-700 dark:text-emerald-400">
                        {toFa(discountPercent)}٪
                      </strong>
                    </div>
                  </div>

                  {isOverpriced && (
                    <div className="flex items-center gap-2 rounded-xl bg-red-100/90 dark:bg-red-950/60 px-4 py-2.5 text-xs font-bold text-red-800 dark:text-red-200 border border-red-200 dark:border-red-900/40">
                      <span>⚠️</span>
                      <span>قیمت فروش پکیج نمی‌تواند بیشتر از مجموع ارزش اقلام باشد.</span>
                    </div>
                  )}

                  {form.tiers.some((t) => t.minQuantity > 1 && t.unitPriceToman > form.basePriceToman) && (
                    <div className="flex items-center gap-2 rounded-xl bg-red-100/90 dark:bg-red-950/60 px-4 py-2.5 text-xs font-bold text-red-800 dark:text-red-200 border border-red-200 dark:border-red-900/40">
                      <span>⚠️</span>
                      <span>خطا: قیمت پله‌های بعدی باید کمتر از قیمت پایه باشد.</span>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Repeater Header */}
            <div className="flex items-center justify-between pt-2">
              <div>
                <h3 className="text-xs font-bold text-soil-900 dark:text-dust-50">
                  محتویات بسته ({toFa((form.bundleItems ?? []).length)} آیتم)
                </h3>
                <p className="mt-0.5 text-[11px] text-soil-700/60 dark:text-dust-200/60">
                  مشخصات هر گلدان یا آیتم موجود در این پکیج را وارد کنید.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddBundleItem}
                className="rounded-xl bg-flora-900 px-4 py-2 text-xs font-black text-white transition hover:bg-flora-700"
              >
                + افزودن آیتم
              </button>
            </div>
            <FormError message={fieldErrors.bundleItems} />

            {/* Repeater List */}
            <div className="space-y-4">
              {(form.bundleItems ?? []).map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-soil-900/10 dark:border-dust-50/10 bg-dust-50/70 dark:bg-flora-950/70 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-xs font-bold text-soil-900 dark:text-dust-50">آیتم شماره {toFa(idx + 1)}</span>
                      {catalogProducts.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          <label htmlFor={`bundle-item-product-${idx}`} className="text-[11px] text-soil-700/70 dark:text-dust-200/70">
                            تکمیل از محصولات:
                          </label>
                          <select
                            id={`bundle-item-product-${idx}`}
                            name={`bundleItemProduct_${idx}`}
                            value={item.productId ?? ''}
                            onChange={(e) => {
                              const selectedId = e.target.value;
                              const prod = catalogProducts.find((p) => p.id === selectedId);
                              const next = [...(form.bundleItems ?? [])];
                              if (prod) {
                                next[idx] = {
                                  ...next[idx],
                                  productId: prod.id,
                                  title: prod.name,
                                  material: prod.material,
                                  diameterCm: prod.diameterCm,
                                  heightCm: prod.heightCm,
                                  weightGrams: prod.weightGrams,
                                  price: prod.basePriceToman,
                                  priceToman: prod.basePriceToman,
                                };
                              } else {
                                next[idx] = {
                                  ...next[idx],
                                  productId: undefined,
                                };
                              }
                              update('bundleItems', next);
                            }}
                            className="rounded-lg border border-soil-900/15 dark:border-dust-50/20 bg-white dark:bg-flora-900 px-2 py-1 text-xs text-soil-900 dark:text-dust-50 outline-none focus:border-flora-500"
                          >
                            <option value="">-- انتخاب گلدان از فروشگاه --</option>
                            {catalogProducts.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({formatToman(p.basePriceToman)})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveBundleItem(idx)}
                      className="rounded-lg px-2.5 py-1 text-xs font-bold text-red-600 hover:bg-red-50 transition"
                    >
                      حذف آیتم
                    </button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                    <div className="block sm:col-span-2">
                      <label htmlFor={`bundle-item-title-${idx}`} className="block text-xs font-medium text-soil-700/80 dark:text-dust-200">
                        نام آیتم / گلدان *
                      </label>
                      <input
                        id={`bundle-item-title-${idx}`}
                        name={`bundleItemTitle_${idx}`}
                        type="text"
                        placeholder="مثلاً گلدان استوانه‌ای سایز ۱"
                        value={item.title}
                        onChange={(e) => {
                          const next = [...(form.bundleItems ?? [])];
                          next[idx] = { ...next[idx], title: e.target.value };
                          update('bundleItems', next);
                        }}
                        className="mt-1 w-full rounded-xl border border-soil-900/15 dark:border-dust-50/20 bg-white dark:bg-flora-900 text-soil-900 dark:text-dust-50 px-3 py-2 text-sm outline-none focus:border-flora-500 focus:ring-2 focus:ring-flora-500/20"
                      />
                    </div>

                    <div className="block sm:col-span-2">
                      <label htmlFor={`bundle-item-description-${idx}`} className="block text-xs font-medium text-soil-700/80 dark:text-dust-200">
                        توضیحات کوتاه آیتم
                      </label>
                      <input
                        id={`bundle-item-description-${idx}`}
                        name={`bundleItemDescription_${idx}`}
                        type="text"
                        placeholder="مثلاً لعاب براق دست‌ساز"
                        value={item.description ?? ''}
                        onChange={(e) => {
                          const next = [...(form.bundleItems ?? [])];
                          next[idx] = { ...next[idx], description: e.target.value };
                          update('bundleItems', next);
                        }}
                        className="mt-1 w-full rounded-xl border border-soil-900/15 dark:border-dust-50/20 bg-white dark:bg-flora-900 text-soil-900 dark:text-dust-50 px-3 py-2 text-sm outline-none focus:border-flora-500 focus:ring-2 focus:ring-flora-500/20"
                      />
                    </div>

                    <div className="block sm:col-span-2">
                      <label htmlFor={`bundle-item-price-${idx}`} className="block text-xs font-medium text-soil-700/80 dark:text-dust-200">
                        قیمت تک‌فروشی این آیتم (تومان)
                      </label>
                      <input
                        id={`bundle-item-price-${idx}`}
                        name={`bundleItemPrice_${idx}`}
                        type="number"
                        step="1000"
                        min="0"
                        placeholder="مثلاً ۱۲۰۰۰۰"
                        value={item.price || item.priceToman || ''}
                        onChange={(e) => {
                          const next = [...(form.bundleItems ?? [])];
                          const p = Math.max(0, Math.floor(Number(e.target.value) || 0));
                          next[idx] = {
                            ...next[idx],
                            price: p,
                            priceToman: p,
                          };
                          update('bundleItems', next);
                        }}
                        className="mt-1 w-full rounded-xl border border-soil-900/15 dark:border-dust-50/20 bg-white dark:bg-flora-900 text-soil-900 dark:text-dust-50 px-3 py-2 text-sm outline-none focus:border-flora-500 focus:ring-2 focus:ring-flora-500/20"
                      />
                    </div>

                    <div className="block">
                      <label htmlFor={`bundle-item-material-${idx}`} className="block text-xs font-medium text-soil-700/80 dark:text-dust-200">
                        متریال
                      </label>
                      <input
                        id={`bundle-item-material-${idx}`}
                        name={`bundleItemMaterial_${idx}`}
                        type="text"
                        placeholder="مثلاً سفال"
                        value={item.material ?? ''}
                        onChange={(e) => {
                          const next = [...(form.bundleItems ?? [])];
                          next[idx] = { ...next[idx], material: e.target.value };
                          update('bundleItems', next);
                        }}
                        className="mt-1 w-full rounded-xl border border-soil-900/15 dark:border-dust-50/20 bg-white dark:bg-flora-900 text-soil-900 dark:text-dust-50 px-3 py-2 text-sm outline-none focus:border-flora-500 focus:ring-2 focus:ring-flora-500/20"
                      />
                    </div>

                    <div className="block">
                      <label htmlFor={`bundle-item-diameter-${idx}`} className="block text-xs font-medium text-soil-700/80 dark:text-dust-200">
                        قطر (cm)
                      </label>
                      <input
                        id={`bundle-item-diameter-${idx}`}
                        name={`bundleItemDiameter_${idx}`}
                        type="number"
                        step="0.5"
                        min="0"
                        placeholder="قطر"
                        value={item.diameterCm || ''}
                        onChange={(e) => {
                          const next = [...(form.bundleItems ?? [])];
                          next[idx] = {
                            ...next[idx],
                            diameterCm: Math.max(0, Number(e.target.value) || 0),
                          };
                          update('bundleItems', next);
                        }}
                        className="mt-1 w-full rounded-xl border border-soil-900/15 dark:border-dust-50/20 bg-white dark:bg-flora-900 text-soil-900 dark:text-dust-50 px-3 py-2 text-sm outline-none focus:border-flora-500 focus:ring-2 focus:ring-flora-500/20"
                      />
                    </div>

                    <div className="block">
                      <label htmlFor={`bundle-item-height-${idx}`} className="block text-xs font-medium text-soil-700/80 dark:text-dust-200">
                        ارتفاع (cm)
                      </label>
                      <input
                        id={`bundle-item-height-${idx}`}
                        name={`bundleItemHeight_${idx}`}
                        type="number"
                        step="0.5"
                        min="0"
                        placeholder="ارتفاع"
                        value={item.heightCm || ''}
                        onChange={(e) => {
                          const next = [...(form.bundleItems ?? [])];
                          next[idx] = {
                            ...next[idx],
                            heightCm: Math.max(0, Number(e.target.value) || 0),
                          };
                          update('bundleItems', next);
                        }}
                        className="mt-1 w-full rounded-xl border border-soil-900/15 dark:border-dust-50/20 bg-white dark:bg-flora-900 text-soil-900 dark:text-dust-50 px-3 py-2 text-sm outline-none focus:border-flora-500 focus:ring-2 focus:ring-flora-500/20"
                      />
                    </div>

                    <div className="block">
                      <label htmlFor={`bundle-item-weight-${idx}`} className="block text-xs font-medium text-soil-700/80 dark:text-dust-200">
                        وزن (گرم)
                      </label>
                      <input
                        id={`bundle-item-weight-${idx}`}
                        name={`bundleItemWeight_${idx}`}
                        type="number"
                        step="1"
                        min="0"
                        placeholder="وزن"
                        value={item.weightGrams || ''}
                        onChange={(e) => {
                          const next = [...(form.bundleItems ?? [])];
                          next[idx] = {
                            ...next[idx],
                            weightGrams: Math.max(0, Math.floor(Number(e.target.value) || 0)),
                          };
                          update('bundleItems', next);
                        }}
                        className="mt-1 w-full rounded-xl border border-soil-900/15 dark:border-dust-50/20 bg-white dark:bg-flora-900 text-soil-900 dark:text-dust-50 px-3 py-2 text-sm outline-none focus:border-flora-500 focus:ring-2 focus:ring-flora-500/20"
                      />
                    </div>

                    {/* Bundle Item Color Options */}
                    <div className="col-span-full border-t border-soil-900/10 dark:border-dust-50/10 pt-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <span className="text-xs font-bold text-soil-900 dark:text-dust-50">
                          رنگ‌های این آیتم ({toFa((item.colorOptions ?? []).length)} رنگ)
                        </span>
                        <span className="text-[11px] text-soil-700/60 dark:text-dust-200/60">
                          مشتری در صفحه محصول می‌تواند برای این آیتم از بین این رنگ‌ها انتخاب کند.
                        </span>
                      </div>
                      <GlobalColorPicker
                        compact
                        globalColors={allGlobalColors}
                        selectedColors={item.colorOptions ?? []}
                        onToggleColor={(hex) => handleToggleBundleItemColor(idx, hex)}
                        onRemoveColor={(hex) => handleRemoveBundleItemColorByHex(idx, hex)}
                        onUpdateStock={(hex, stock) => handleUpdateBundleItemColorStock(idx, hex, stock)}
                        onUpdatePriceAdjustment={(hex, adj) => handleUpdateBundleItemColorPriceAdjustment(idx, hex, adj)}
                      />
                    </div>
                  </div>
                </div>
              ))}

              {(form.bundleItems ?? []).length === 0 && (
                <p className="text-xs text-soil-700/50 dark:text-dust-200/50">
                  هنوز آیتمی به محتویات بسته اضافه نشده است. برای تعریف اقلام دکمه «+ افزودن آیتم» را بزنید.
                </p>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-soil-900/10 dark:border-dust-50/10 bg-white dark:bg-flora-900 p-5">
        <h2 className="mb-2 text-sm font-black text-soil-900 dark:text-dust-50">ویژگی‌های نمایشی</h2>
        <p className="mb-4 text-xs text-soil-700/60 dark:text-dust-200/60">
          {isBundleActive
            ? 'این ویژگی‌ها مربوط به کل بسته است (مثلاً بسته‌بندی ضد ضربه). برای مشخصات هر گلدان، از توضیحات همان آیتم در پایین استفاده کنید.'
            : 'این ویژگی‌ها فقط برای نمایش در صفحه محصول هستند و روی عملکرد سیستم اثر ندارند.'}
        </p>

        <div className="flex gap-2">
          <label htmlFor="product-featureInput" className="sr-only">
            نام ویژگی جدید
          </label>
          <input
            id="product-featureInput"
            name="featureInput"
            list="known-feature-labels"
            value={featureInput}
            onChange={(e) => setFeatureInput(e.target.value)}
            onKeyDown={(e) => {
              // Enter would otherwise submit the whole product form — adding a
              // feature is the intent, not saving the product.
              if (e.key === 'Enter') {
                e.preventDefault();
                addFeatureFromInput();
              }
            }}
            placeholder="نام ویژگی جدید یا انتخاب از فهرست..."
            className={inputCls}
          />
          {/* Native autocomplete over the labels every other product already
              uses, so the shopkeeper does not invent a near-duplicate wording. */}
          <datalist id="known-feature-labels">
            {knownLabels.map((label) => (
              <option key={label} value={label} />
            ))}
          </datalist>
          <button
            type="button"
            onClick={addFeatureFromInput}
            disabled={!featureInput.trim()}
            className="mt-1.5 shrink-0 rounded-xl bg-flora-900 px-4 text-xs font-black text-white transition hover:bg-flora-700 disabled:opacity-40"
          >
            افزودن
          </button>
        </div>

        {form.features.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-2">
            {form.features.map((f, i) => (
              <li
                key={`${f.label}-${i}`}
                className="flex items-center gap-2 rounded-full border border-flora-500/30 dark:border-flora-500/20 bg-flora-100/50 dark:bg-flora-700/60 px-3 py-1.5 text-xs font-bold text-soil-900 dark:text-dust-50"
              >
                <span className="size-1.5 rounded-full bg-flora-500" />
                <span>{f.label}</span>
                <button
                  type="button"
                  onClick={() => removeFeature(i)}
                  aria-label={`حذف ${f.label}`}
                  className="ms-1 rounded-full text-soil-700/50 dark:text-dust-200/50 transition hover:text-red-600 dark:hover:text-red-400"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}

        {form.features.length === 0 && (
          <p className="mt-3 text-xs text-soil-700/50 dark:text-dust-200/50">
            هنوز ویژگی‌ای اضافه نشده است.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-soil-900/10 dark:border-dust-50/10 bg-white dark:bg-flora-900 p-5">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-black text-soil-900 dark:text-dust-50">تصاویر محصول</h2>
            <p className="mt-1 text-xs text-soil-700/60 dark:text-dust-200/60">
              تصاویر در فضای محلی سرور ذخیره می‌شوند (<code className="font-mono text-soil-900 dark:text-dust-50">/public/uploads</code>). نسبت ابعاد با بزرگنمایی مناسب حفظ می‌شود.
            </p>
          </div>
          <button
            type="button"
            onClick={() => update('images', [...form.images, ''])}
            className="text-xs font-bold text-flora-700 dark:text-flora-300 hover:text-flora-900 dark:hover:text-flora-300"
          >
            + افزودن تصویر
          </button>
        </div>
        <FormError message={fieldErrors.images} />

        <div className="mt-4 space-y-4">
          {form.images.map((url, i) => {
            const hasError = imageErrors[i];
            const isUploading = uploading[i];

            return (
              <div key={i} className="rounded-xl border border-soil-900/10 dark:border-dust-50/10 bg-dust-50 dark:bg-flora-950 p-4">
                {/* Image preview area with comfortable height and aspect ratio preservation */}
                <div className="relative mb-3 flex min-h-60 h-80 w-full items-center justify-center overflow-hidden rounded-xl border border-soil-900/5 dark:border-dust-50/10 bg-white dark:bg-flora-950 p-2">
                  {url && !hasError && (
                    <img
                      src={url}
                      alt={`پیش‌نمایش تصویر ${i + 1}`}
                      className="h-full w-full object-contain"
                      onError={() => setImageErrors((prev) => ({ ...prev, [i]: true }))}
                      onLoad={() => setImageErrors((prev) => ({ ...prev, [i]: false }))}
                    />
                  )}

                  {url && hasError && (
                    <div className="flex flex-col items-center justify-center p-6 text-center text-xs text-red-600 dark:text-red-400">
                      <span className="text-3xl mb-2">⚠️</span>
                      <p className="font-bold">تصویر در این مسیر یافت نشد یا قابل نمایش نیست</p>
                      <p className="mt-1 text-[11px] text-soil-700/60 dark:text-dust-200/60 dir-ltr font-mono">{url}</p>
                    </div>
                  )}

                  {!url && !isUploading && (
                    <div className="flex flex-col items-center justify-center text-xs text-soil-700/50 dark:text-dust-200/50">
                      <span className="text-3xl mb-2">🖼️</span>
                      <span>هنوز تصویری انتخاب یا آپلود نشده است</span>
                    </div>
                  )}

                  {isUploading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/85 dark:bg-flora-900/85 backdrop-blur-sm text-xs font-bold text-soil-900 dark:text-dust-50">
                      <div className="mb-2 size-8 animate-spin rounded-full border-3 border-flora-700 dark:border-flora-300 border-t-transparent" />
                      <span>در حال اعتبارسنجی و آپلود تصویر…</span>
                    </div>
                  )}

                  {url && !isUploading && (
                    <button
                      type="button"
                      onClick={() => {
                        const next = [...form.images];
                        next[i] = '';
                        update('images', next);
                        setImageErrors((prev) => ({ ...prev, [i]: false }));
                      }}
                      className="absolute top-3 end-3 rounded-lg bg-soil-900/70 dark:bg-black/70 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur transition hover:bg-red-700"
                    >
                      پاک کردن تصویر
                    </button>
                  )}
                </div>

                <div className="flex flex-col gap-2 md:flex-row md:items-center">
                  <label htmlFor={`product-image-url-${i}`} className="sr-only">
                    {`آدرس اینترنتی تصویر ${toFa(i + 1)}`}
                  </label>
                  <input
                    id={`product-image-url-${i}`}
                    name={`imageUrl_${i}`}
                    value={url}
                    onChange={(e) => {
                      const next = [...form.images];
                      next[i] = e.target.value;
                      update('images', next);
                      setImageErrors((prev) => ({ ...prev, [i]: false }));
                    }}
                    dir="ltr"
                    placeholder="/uploads/product/example.jpg"
                    className={`${inputCls} flex-1`}
                  />
                  <label htmlFor={`product-image-file-${i}`} className="cursor-pointer rounded-xl border border-soil-900/15 dark:border-dust-50/20 bg-white dark:bg-flora-900 px-4 py-2.5 text-center text-xs font-bold text-soil-900 dark:text-dust-50 transition hover:border-flora-700 hover:text-flora-700 dark:hover:border-flora-300 dark:hover:text-flora-300">
                    <input
                      id={`product-image-file-${i}`}
                      name={`imageFile_${i}`}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
                      className="hidden"
                      onChange={(e) => {
                        setImageErrors((prev) => ({ ...prev, [i]: false }));
                        uploadImage(i, e.target.files?.[0] ?? null);
                      }}
                    />
                    {isUploading ? 'در حال آپلود…' : 'آپلود فایل جدید'}
                  </label>
                  {form.images.length > 1 && (
                    <button
                      type="button"
                      onClick={() => update('images', form.images.filter((_, j) => j !== i))}
                      className="shrink-0 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/40 px-3.5 py-2.5 text-xs font-bold text-red-700 dark:text-red-300 transition hover:bg-red-100 dark:hover:bg-red-900/60"
                    >
                      حذف ردیف
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-soil-900/10 dark:border-dust-50/10 bg-white dark:bg-flora-900 p-5">
        <h2 className="mb-4 text-sm font-black text-soil-900 dark:text-dust-50">برچسب‌ها</h2>
        {allTags.length === 0 ? (
          <p className="text-xs text-soil-700/70 dark:text-dust-200/70">هنوز برچسبی ثبت نشده است.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {allTags.map((tag) => {
              const active = form.tagIds.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => {
                    update('tagIds', active
                      ? form.tagIds.filter((id) => id !== tag.id)
                      : [...form.tagIds, tag.id]);
                  }}
                  className={
                    'rounded-full px-3 py-1.5 text-xs font-bold transition ' +
                    (active ? 'bg-flora-900 text-white dark:bg-flora-700' : 'bg-dust-100 dark:bg-flora-950 text-soil-700 dark:text-dust-200 hover:bg-dust-200 dark:hover:bg-flora-900')
                  }
                >
                  {tag.name}
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-soil-900/10 dark:border-dust-50/10 bg-white dark:bg-flora-900 p-5 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-soil-900/10 dark:border-dust-50/10 pb-4">
          <div>
            <h2 className="text-sm font-black text-soil-900 dark:text-dust-50">
              قیمت‌گذاری محصول
            </h2>
            <p className="mt-1 text-xs text-soil-700/60 dark:text-dust-200/60">
              تعیین قیمت پایه و در صورت نیاز، فعال‌سازی تخفیف‌های پله‌ای برای خریدهای تعداد بالا
            </p>
          </div>
          <div className="flex items-center gap-2.5 rounded-xl border border-soil-900/10 dark:border-dust-50/10 bg-dust-50 dark:bg-flora-950 px-4 py-2 text-xs font-bold text-soil-900 dark:text-dust-50 cursor-pointer transition hover:bg-dust-100 dark:hover:bg-flora-900">
            <input
              id="product-allowBatchDiscount"
              name="allowBatchDiscount"
              type="checkbox"
              checked={form.allowBatchDiscount ?? true}
              onChange={(e) => {
                const checked = e.target.checked;
                update('allowBatchDiscount', checked);
                if (!checked && fieldErrors.tiers) {
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next.tiers;
                    return next;
                  });
                }
              }}
              className="accent-flora-700 size-4"
            />
            <label htmlFor="product-allowBatchDiscount" className="cursor-pointer">
              فعال‌سازی خرید عمده و تخفیف پلکانی
            </label>
          </div>
        </div>

        <div className="block max-w-sm">
          <label htmlFor="product-basePriceToman" className={labelCls}>
            {isBundleActive ? 'قیمت فروش نهایی این پکیج (تومان) *' : 'قیمت هر عدد (تومان) *'}
          </label>
          <input
            id="product-basePriceToman"
            name="basePriceToman"
            type="number"
            value={form.basePriceToman}
            onChange={(e) => update('basePriceToman', Number(e.target.value))}
            min={1000}
            className={fieldCls(fieldErrors.basePriceToman)}
          />
          {form.basePriceToman >= 1000 && (
            <span className="block mt-1.5 text-xs text-soil-700/80 dark:text-dust-200 font-medium">
              {formatToman(form.basePriceToman)} ({numberToWordsFa(form.basePriceToman)} تومان)
            </span>
          )}
          <FormError message={fieldErrors.basePriceToman} />
        </div>

        <div className="block max-w-sm">
          <label htmlFor="product-salePriceToman" className={labelCls}>
            قیمت با تخفیف ویژه (اختیاری)
          </label>
          <p className="mt-0.5 text-[11px] text-soil-700/60 dark:text-dust-200/60 leading-5">
            اگر این فیلد را پر کنید، قیمت پایه به عنوان قیمت خط‌خورده و این قیمت به عنوان قیمت نهایی نمایش داده می‌شود.
          </p>
          <input
            id="product-salePriceToman"
            name="salePriceToman"
            type="number"
            value={form.salePriceToman ?? ''}
            onChange={(e) => {
              const val = e.target.value === '' ? null : Number(e.target.value);
              update('salePriceToman', val);
            }}
            placeholder="مثلاً: ۹۵۰۰۰ (کمتر از قیمت پایه)"
            min={1000}
            className={fieldCls(fieldErrors.salePriceToman)}
          />
          {form.salePriceToman && form.salePriceToman >= 1000 && (
            <span className="block mt-1.5 text-xs text-red-600 dark:text-red-400 font-medium">
              {formatToman(form.salePriceToman)} ({numberToWordsFa(form.salePriceToman)} تومان)
              {form.basePriceToman > form.salePriceToman && (
                <span className="ms-2 font-bold text-emerald-700 dark:text-emerald-400">
                  ({toFa(Math.round(((form.basePriceToman - form.salePriceToman) / form.basePriceToman) * 100))}٪ تخفیف)
                </span>
              )}
            </span>
          )}
          <FormError message={fieldErrors.salePriceToman} />
        </div>

        {(form.allowBatchDiscount ?? true) && (
          <div className="pt-2">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <h3 className="text-xs font-bold text-soil-900 dark:text-dust-50">
                  پله‌های قیمت عمده و بسته‌ای (تومان)
                </h3>
                <p className="text-[11px] text-soil-700/60 dark:text-dust-200/60">
                  تعیین حداقل تعداد و قیمت واحد برای هر سطح خرید
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddTier}
                className="rounded-xl bg-flora-900 px-4 py-2 text-xs font-black text-white transition hover:bg-flora-700 cursor-pointer"
              >
                + افزودن پله جدید
              </button>
            </div>

            <div className="mb-3">
              <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-lg border border-emerald-200/60 dark:border-emerald-800/40 inline-block">
                💡 قیمت‌ها باید با افزایش تعداد، کاهش پیدا کنند (تخفیف عمده).
              </p>
            </div>

            {form.tiers.some((t) => t.minQuantity > 1 && t.unitPriceToman > form.basePriceToman) && (
              <div className="mb-3 flex items-center gap-2 rounded-xl border border-red-300 dark:border-red-900/40 bg-red-100/90 dark:bg-red-950/60 px-4 py-2.5 text-xs font-bold text-red-800 dark:text-red-200">
                <span>⚠️</span>
                <span>خطا: قیمت پله‌های بعدی باید کمتر از قیمت پایه باشد.</span>
              </div>
            )}

            <div className="space-y-3">
              {form.tiers.map((t, i) => {
                const discountPercent =
                  form.basePriceToman > 0
                    ? Math.round(((form.basePriceToman - t.unitPriceToman) / form.basePriceToman) * 100)
                    : 0;
                const isOverBase = form.basePriceToman > 0 && t.unitPriceToman > form.basePriceToman;

                return (
                  <div
                    key={i}
                    className="flex flex-col gap-3 rounded-xl border border-soil-900/10 dark:border-dust-50/10 bg-dust-50/50 dark:bg-flora-950/50 p-4 sm:flex-row sm:items-start"
                  >
                    <div className="grid flex-1 gap-3 sm:grid-cols-3">
                      <div className="block">
                        <label htmlFor={`tier-min-qty-${i}`} className={labelCls}>
                          حداقل تعداد
                        </label>
                        <input
                          id={`tier-min-qty-${i}`}
                          name={`tierMinQuantity_${i}`}
                          type="number"
                          min={1}
                          value={t.minQuantity}
                          onChange={(e) =>
                            updateTier(i, {
                              minQuantity: Math.max(1, Math.floor(Number(e.target.value) || 1)),
                            })
                          }
                          className={inputCls}
                        />
                      </div>
                      <div className="block">
                        <div className="flex items-center justify-between gap-1">
                          <label htmlFor={`tier-unit-price-${i}`} className={labelCls}>
                            {isBundleActive ? 'قیمت هر بسته در این پله' : 'قیمت هر عدد'}
                          </label>
                          {form.basePriceToman > 0 && (
                            <span
                              className={`text-xs font-bold ${
                                isOverBase
                                  ? 'text-red-600 dark:text-red-400'
                                  : discountPercent > 0
                                  ? 'text-emerald-700 dark:text-emerald-400'
                                  : 'text-soil-700/60 dark:text-dust-200/60'
                              }`}
                            >
                              ({toFa(discountPercent)}٪ تخفیف)
                            </span>
                          )}
                        </div>
                        <input
                          id={`tier-unit-price-${i}`}
                          name={`tierUnitPrice_${i}`}
                          type="number"
                          min={0}
                          step={1000}
                          value={t.unitPriceToman}
                          onChange={(e) =>
                            updateTier(i, {
                              unitPriceToman: Math.max(0, Math.floor(Number(e.target.value) || 0)),
                            })
                          }
                          className={inputCls}
                        />
                        {t.unitPriceToman >= 1000 && (
                          <span className="block mt-1 text-[11px] text-soil-700/60 dark:text-dust-200/60 font-medium">
                            ({numberToWordsFa(t.unitPriceToman)} تومان)
                          </span>
                        )}
                      </div>
                      <div className="block">
                        <label htmlFor={`tier-label-${i}`} className={labelCls}>
                          برچسب
                        </label>
                        <input
                          id={`tier-label-${i}`}
                          name={`tierLabel_${i}`}
                          value={t.label}
                          placeholder="مثلاً: خرده، بسته‌ای، عمده"
                          onChange={(e) => updateTier(i, { label: e.target.value })}
                          className={inputCls}
                        />
                      </div>
                    </div>

                    {form.tiers.length > 1 && (
                      <div className="pt-1 sm:pt-6 sm:self-start">
                        <button
                          type="button"
                          onClick={() => handleRemoveTier(i)}
                          className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-bold text-red-700 transition hover:bg-red-100 cursor-pointer"
                        >
                          <svg
                            className="size-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                          <span>حذف</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <FormError message={fieldErrors.tiers} />
          </div>
        )}
      </section>

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-xs font-bold text-red-700">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-flora-900 px-6 py-3 text-sm font-black text-white transition hover:bg-flora-700 disabled:opacity-50"
        >
          {pending ? 'در حال ثبت…' : initial.id ? 'ثبت تغییرات' : 'ایجاد محصول'}
        </button>
        {initial.id && (
          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            disabled={pending}
            className="rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/40 px-6 py-3 text-sm font-bold text-red-700 dark:text-red-300 transition hover:bg-red-100 dark:hover:bg-red-900/60 disabled:opacity-50 cursor-pointer"
          >
            حذف محصول
          </button>
        )}
      </div>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        title="حذف محصول"
        message="آیا از حذف این محصول مطمئن هستید؟ این عمل قابل بازگشت نیست."
        isDestructive={true}
        confirmText="حذف محصول"
        cancelText="انصراف"
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsDeleteModalOpen(false)}
      />
    </form>
  );
}
