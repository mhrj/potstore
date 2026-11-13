import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { parseFeatures, parseBundleItems, parseColorOptions } from '@/lib/product-features';
import ProductForm from '@/features/admin/components/ProductForm';

type Props = { params: Promise<{ id: string }> };

export default async function EditProductPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      images: { orderBy: { sortOrder: 'asc' } },
      tiers: { orderBy: { minQuantity: 'asc' } },
      tags: { select: { tagId: true } },
      variants: { orderBy: { priceToman: 'asc' } },
    },
  });
  if (!product) notFound();

  // Every label any product already uses, so the form can offer them as
  // autocomplete suggestions — including this product's own, which is harmless
  // and keeps the list complete when editing the only product that has one.
  const allProducts = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      material: true,
      diameterCm: true,
      heightCm: true,
      weightGrams: true,
      basePriceToman: true,
      features: true,
    },
    orderBy: { name: 'asc' },
  });
  const labelSet = new Set<string>();
  for (const p of allProducts) {
    for (const f of parseFeatures(p.features)) labelSet.add(f.label);
  }
  const knownLabels = Array.from(labelSet).sort((a, b) => a.localeCompare(b, 'fa'));

  const catalogProducts = allProducts
    .filter((p) => p.id !== product.id)
    .map((p) => ({
      id: p.id,
      name: p.name,
      material: p.material,
      diameterCm: p.diameterCm,
      heightCm: p.heightCm,
      weightGrams: p.weightGrams,
      basePriceToman: p.basePriceToman,
    }));

  const [categories, globalColors] = await Promise.all([
    prisma.category.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.globalColor.findMany({
      select: { id: true, name: true, hexCode: true },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-black text-soil-900 dark:text-dust-50">ویرایش محصول</h1>
      <p className="mt-2 text-sm text-soil-700/70 dark:text-dust-200/70">{product.name}</p>
      <div className="mt-6">
        <ProductForm
          knownLabels={knownLabels}
          catalogProducts={catalogProducts}
          categories={categories}
          globalColors={globalColors}
          initial={{
            id: product.id,
            slug: product.slug,
            sku: product.sku ?? '',
            name: product.name,
            shortDesc: product.shortDesc ?? '',
            description: product.description,
            categoryId: product.categoryId ?? '',
            material: product.material,
            color: product.color ?? '',
            colorOptions: parseColorOptions(product.colorOptions, product.stock),
            diameterCm: product.diameterCm,
            heightCm: product.heightCm,
            weightGrams: product.weightGrams,
            stock: product.stock,
            unitsPerCarton: 1,
            bundleSize: product.bundleSize,
            minOrderQuantity: product.minOrderQuantity,
            bundleItems: parseBundleItems(product.bundleItems, product.stock),
            basePriceToman: product.basePriceToman,
            salePriceToman: product.salePriceToman,
            isActive: product.isActive,
            isFeatured: product.isFeatured,
            allowBatchDiscount: product.allowBatchDiscount,
            isFragile: product.isFragile,
            // The column is untyped JSON, so it is normalised on the way in as
            // well as on the way out — a malformed row must not break the form.
            features: parseFeatures(product.features),
            images: product.images.length ? product.images.map((i) => i.url) : [''],
            tagIds: product.tags.map((entry) => entry.tagId),
            tiers: product.tiers.map((t) => ({
              minQuantity: t.minQuantity,
              unitPriceToman: t.unitPriceToman,
              label: t.label ?? '',
            })),
            variants: product.variants.map((v) => ({
              id: v.id,
              title: v.title,
              priceToman: v.priceToman,
              stock: v.stock,
              sku: v.sku ?? '',
            })),
          }}
        />
      </div>
    </div>
  );
}
