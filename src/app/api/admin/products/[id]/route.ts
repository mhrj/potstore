import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getActiveAdmin } from '@/lib/auth';
import { persistedImageUrlSchema } from '@/lib/image-validation';
import { rebuildProductRecommendations } from '@/features/recommendations/rebuild';

export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> };

const tierSchema = z.object({
  minQuantity: z.number({ invalid_type_error: 'تعداد پله باید عدد باشد' }).int('تعداد پله باید عدد صحیح باشد').min(1, 'تعداد پله باید حداقل ۱ باشد'),
  unitPriceToman: z.number({ invalid_type_error: 'قیمت پله باید عدد باشد' }).int('قیمت پله باید عدد صحیح باشد').min(0, 'قیمت پله نمی‌تواند منفی باشد'),
  label: z.string().max(50, 'برچسب پله حداکثر ۵۰ کاراکتر است').optional().default(''),
});

const tiersSchema = z
  .array(tierSchema)
  .max(15, 'حداکثر ۱۵ پله قیمت مجاز است')
  .default([])
  // A tier at 1 is what makes a single unit's price explicit when tiers are configured.
  .refine((tiers) => tiers.length === 0 || tiers.some((t) => t.minQuantity === 1), {
    message: 'یکی از پله‌های قیمت باید از تعداد ۱ شروع شود',
  })
  .refine(
    (tiers) => {
      if (tiers.length === 0) return true;
      const qtys = tiers.map((t) => t.minQuantity);
      return new Set(qtys).size === qtys.length;
    },
    {
      message: 'تعداد حداقل هر پله باید یکتا باشد (تکراری نباشد)',
    },
  );

const colorOptionSchema = z.union([
  z.object({
    hexCode: z.string(),
    stock: z.coerce.number().int().min(0),
    priceAdjustment: z.coerce.number().int().default(0),
  }),
  z.string().transform((hex) => ({ hexCode: hex, stock: 0, priceAdjustment: 0 })),
]);

const bundleItemSchema = z.object({
  title: z.string({ required_error: 'نام آیتم بسته الزامی است' }).min(1, 'نام آیتم بسته الزامی است').max(150, 'نام آیتم بسته حداکثر ۱۵۰ کاراکتر است'),
  description: z.string().max(500, 'توضیحات آیتم حداکثر ۵۰۰ کاراکتر است').optional().default(''),
  material: z.string().max(60, 'متریال حداکثر ۶۰ کاراکتر است').optional().default(''),
  diameterCm: z.number({ invalid_type_error: 'قطر باید عدد باشد' }).min(0, 'قطر نمی‌تواند منفی باشد').max(500, 'قطر حداکثر ۵۰۰ سانتی‌متر است').optional().default(0),
  heightCm: z.number({ invalid_type_error: 'ارتفاع باید عدد باشد' }).min(0, 'ارتفاع نمی‌تواند منفی باشد').max(500, 'ارتفاع حداکثر ۵۰۰ سانتی‌متر است').optional().default(0),
  weightGrams: z.number({ invalid_type_error: 'وزن باید عدد باشد' }).int('وزن باید عدد صحیح باشد').min(0, 'وزن نمی‌تواند منفی باشد').max(100000, 'وزن حداکثر ۱۰۰ کیلوگرم است').optional().default(0),
  priceToman: z.number().int().min(0).max(100000000).optional().nullable(),
  price: z.number().int().min(0).max(100000000).optional().nullable(),
  productId: z.string().optional().nullable(),
  colorOptions: z.array(colorOptionSchema).optional().default([]),
});

const schema = z.object({
  slug: z.string({ required_error: 'اسلاگ الزامی است' }).min(2, 'اسلاگ باید حداقل ۲ کاراکتر باشد').max(120, 'اسلاگ حداکثر ۱۲۰ کاراکتر است').regex(/^[a-z0-9-]+$/, 'اسلاگ فقط حروف کوچک، عدد و خط تیره'),
  sku: z.string().max(80, 'کد کالا حداکثر ۸۰ کاراکتر است').optional().nullable().or(z.literal('')),
  name: z.string({ required_error: 'نام محصول الزامی است' }).min(2, 'نام کالا باید حداقل ۲ حرف باشد').max(150, 'نام کالا حداکثر ۱۵۰ حرف است'),
  shortDesc: z.string().max(300, 'توضیح کوتاه حداکثر ۳۰۰ کاراکتر است').optional().default(''),
  description: z.string({ required_error: 'توضیحات کامل الزامی است' }).min(1, 'توضیحات کامل الزامی است').max(5000, 'توضیحات حداکثر ۵۰۰۰ کاراکتر است'),
  categoryId: z.string().cuid('شناسه دسته‌بندی نامعتبر است').optional().nullable().or(z.literal('')),
  material: z.string({ required_error: 'متریال الزامی است' }).min(2, 'متریال باید حداقل ۲ حرف باشد').max(60, 'متریال حداکثر ۶۰ حرف است'),
  color: z.string().max(60, 'رنگ حداکثر ۶۰ حرف است').optional().default(''),
  colorOptions: z.array(colorOptionSchema).optional().default([]),
  diameterCm: z.number({ invalid_type_error: 'قطر باید عدد باشد' }).min(0, 'قطر نمی‌تواند منفی باشد').max(500, 'قطر حداکثر ۵۰۰ سانتی‌متر است'),
  heightCm: z.number({ invalid_type_error: 'ارتفاع باید عدد باشد' }).min(0, 'ارتفاع نمی‌تواند منفی باشد').max(500, 'ارتفاع حداکثر ۵۰۰ سانتی‌متر است'),
  weightGrams: z.number({ invalid_type_error: 'وزن باید عدد باشد' }).int('وزن باید عدد صحیح باشد').min(0, 'وزن نمی‌تواند منفی باشد').max(100000, 'وزن حداکثر ۱۰۰ کیلوگرم است'),
  stock: z.number({ invalid_type_error: 'موجودی انبار باید عدد باشد' }).int('موجودی انبار باید عدد صحیح باشد').min(0, 'موجودی انبار نمی‌تواند منفی باشد').max(100000, 'موجودی بیش از حد مجاز است'),
  unitsPerCarton: z.number().int().min(1).max(200),
  bundleSize: z.number({ invalid_type_error: 'تعداد در بسته باید عدد باشد' }).int('تعداد در بسته باید عدد صحیح باشد').min(1, 'تعداد در بسته حداقل ۱ است').default(1),
  minOrderQuantity: z.number({ invalid_type_error: 'حداقل سفارش باید عدد باشد' }).int('حداقل سفارش باید عدد صحیح باشد').min(1, 'حداقل سفارش باید حداقل ۱ باشد').default(1),
  bundleItems: z.array(bundleItemSchema).max(50, 'حداکثر ۵۰ آیتم در بسته مجاز است').optional().nullable(),
  basePriceToman: z.number({ invalid_type_error: 'قیمت پایه باید عدد باشد' }).int('قیمت پایه باید عدد صحیح باشد').min(1000, 'قیمت پایه باید حداقل ۱,۰۰۰ تومان باشد'),
  salePriceToman: z
    .number({ invalid_type_error: 'قیمت با تخفیف ویژه باید عدد باشد' })
    .int('قیمت با تخفیف ویژه باید عدد صحیح باشد')
    .min(1000, 'قیمت تخفیف ویژه باید حداقل ۱,۰۰۰ تومان باشد')
    .optional()
    .nullable(),
  isActive: z.boolean(),
  isFeatured: z.boolean(),
  allowBatchDiscount: z.boolean().optional().default(true),
  isFragile: z.boolean().optional().default(false),
  // Display-only extras the admin names themselves; the semantic flags above
  // are separate columns because pricing and catalogue queries read them.
  features: z
    .array(z.object({ label: z.string().min(1, 'عنوان ویژگی الزامی است').max(80, 'عنوان ویژگی حداکثر ۸۰ کاراکتر است'), enabled: z.boolean() }))
    .max(20, 'حداکثر ۲۰ ویژگی مجاز است')
    .default([]),
  images: z.array(persistedImageUrlSchema, { required_error: 'حداقل یک تصویر الزامی است' }).min(1, 'حداقل یک تصویر الزامی است').max(10, 'حداکثر ۱۰ تصویر مجاز است'),
  tagIds: z.array(z.string().cuid('شناسه برچسب نامعتبر است')).max(20, 'حداکثر ۲۰ برچسب مجاز است').optional().default([]),
  tiers: tiersSchema,
}).refine(
  (data) => !data.salePriceToman || data.salePriceToman < data.basePriceToman,
  {
    message: 'قیمت با تخفیف ویژه باید کمتر از قیمت پایه باشد',
    path: ['salePriceToman'],
  },
);

async function ensureAdmin() {
  // Re-reads the account so a demoted or deactivated admin loses API access
  // immediately rather than when their 30-day session cookie expires.
  return getActiveAdmin();
}

export async function PATCH(req: Request, { params }: Params) {
  if (!(await ensureAdmin())) {
    return NextResponse.json({ message: 'دسترسی ندارید' }, { status: 403 });
  }
  const { id } = await params;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? 'اطلاعات نامعتبر' },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ message: 'محصول یافت نشد' }, { status: 404 });
  }

  const slugConflict = await prisma.product.findFirst({
    where: { slug: data.slug, NOT: { id } },
  });
  if (slugConflict) {
    return NextResponse.json({ message: 'این اسلاگ قبلاً استفاده شده' }, { status: 409 });
  }

  const sku = data.sku?.trim() || null;
  if (sku) {
    const skuConflict = await prisma.product.findFirst({
      where: { sku, NOT: { id } },
    });
    if (skuConflict) {
      return NextResponse.json({ message: 'این کد کالا (SKU) قبلاً استفاده شده است' }, { status: 409 });
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.productImage.deleteMany({ where: { productId: id } });
    await tx.priceTier.deleteMany({ where: { productId: id } });
    await tx.productTag.deleteMany({ where: { productId: id } });

    return tx.product.update({
      where: { id },
      data: {
        slug: data.slug,
        sku,
        name: data.name,
        shortDesc: data.shortDesc || null,
        description: data.description,
        categoryId: data.categoryId ? data.categoryId : null,
        material: data.material,
        color: data.color || null,
        colorOptions: data.colorOptions && data.colorOptions.length > 0 ? (data.colorOptions as Prisma.InputJsonValue) : Prisma.JsonNull,
        diameterCm: data.diameterCm,
        heightCm: data.heightCm,
        weightGrams: data.weightGrams,
        stock: data.stock,
        unitsPerCarton: data.unitsPerCarton,
        bundleSize: data.bundleSize ?? 1,
        minOrderQuantity: data.minOrderQuantity ?? 1,
        bundleItems: data.bundleItems && data.bundleItems.length > 0 ? (data.bundleItems as Prisma.InputJsonValue) : Prisma.JsonNull,
        basePriceToman: data.basePriceToman,
        salePriceToman: data.salePriceToman && data.salePriceToman > 0 ? data.salePriceToman : null,
        isActive: data.isActive,
        isFeatured: data.isFeatured,
        allowBatchDiscount: data.allowBatchDiscount,
        isFragile: data.isFragile,
        // Replaced wholesale, like images/tiers/tags above — the array the form
        // submits *is* the feature list, so there is nothing to merge.
        features: data.features,
        images: {
          create: data.images.map((url, i) => ({ url, sortOrder: i, alt: data.name })),
        },
        tiers: {
          create: data.tiers.map((t) => ({
            minQuantity: t.minQuantity,
            unitPriceToman: t.unitPriceToman,
            label: t.label || null,
          })),
        },
        tags: {
          create: data.tagIds.map((tagId) => ({ tagId })),
        },
      },
    });
  });

  try {
    await rebuildProductRecommendations(updated.id);
  } catch (recError) {
    console.error('[recommendations] Failed to rebuild recommendations after product update:', recError);
  }

  return NextResponse.json({ ok: true, product: updated });
}

export async function DELETE(_req: Request, { params }: Params) {
  if (!(await ensureAdmin())) {
    return NextResponse.json({ message: 'دسترسی ندارید' }, { status: 403 });
  }
  const { id } = await params;

  const existing = await prisma.product.findUnique({
    where: { id },
    include: { _count: { select: { orderItems: true } } },
  });
  if (!existing) {
    return NextResponse.json({ message: 'محصول یافت نشد' }, { status: 404 });
  }

  // Soft delete if the product has ever been ordered; hard delete otherwise.
  if (existing._count.orderItems > 0) {
    await prisma.product.update({
      where: { id },
      data: { isActive: false, isFeatured: false },
    });
    return NextResponse.json({ ok: true, softDeleted: true });
  }

  await prisma.product.delete({ where: { id } });
  return NextResponse.json({ ok: true, softDeleted: false });
}
