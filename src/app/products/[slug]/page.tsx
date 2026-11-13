import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import ProductDetailView from '@/features/catalog/components/ProductDetailView';
import { getProductRecommendations } from '@/features/recommendations/rebuild';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ slug: string }> };

function excerpt(text: string, max: number): string {
  const collapsed = text.replace(/\s+/g, ' ').trim();
  if (collapsed.length <= max) return collapsed;

  const cut = collapsed.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  const body = lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut;
  return `${body.trimEnd()}…`;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const product = await prisma.product.findUnique({
    where: { slug },
    select: {
      name: true,
      shortDesc: true,
      description: true,
      images: { take: 1, orderBy: { sortOrder: 'asc' }, select: { url: true } },
    },
  });
  if (!product) return { title: 'محصول یافت نشد' };

  const description =
    product.shortDesc?.trim() ||
    (product.description ? excerpt(product.description, 160) : undefined);

  return {
    title: product.name,
    description,
    alternates: { canonical: `/products/${slug}` },
    openGraph: {
      title: `${product.name} | پات استور`,
      description,
      type: 'website',
      images: product.images[0]?.url ? [product.images[0].url] : [],
    },
  };
}

export default async function ProductPage({ params }: Params) {
  const { slug } = await params;

  const [product, session, globalColors] = await Promise.all([
    prisma.product.findFirst({
      where: { slug, isActive: true },
      select: {
        id: true,
        slug: true,
        name: true,
        shortDesc: true,
        description: true,
        sku: true,
        material: true,
        color: true,
        diameterCm: true,
        heightCm: true,
        weightGrams: true,
        unitsPerCarton: true,
        basePriceToman: true,
        salePriceToman: true,
        stock: true,
        bundleSize: true,
        bundleItems: true,
        colorOptions: true,
        minOrderQuantity: true,
        allowBatchDiscount: true,
        features: true,
        variants: {
          orderBy: { priceToman: 'asc' },
          select: {
            id: true,
            title: true,
            priceToman: true,
            stock: true,
            sku: true,
            attributes: true,
          },
        },
        images: {
          orderBy: { sortOrder: 'asc' },
          select: { id: true, url: true, alt: true },
        },
        tiers: {
          orderBy: { minQuantity: 'asc' },
          select: { minQuantity: true, unitPriceToman: true, label: true },
        },
        tags: {
          select: {
            tag: { select: { id: true, name: true, slug: true } },
          },
        },
        category: {
          select: { id: true, name: true, slug: true },
        },
      },
    }),
    getSession(),
    prisma.globalColor.findMany({
      select: { name: true, hexCode: true },
    }),
  ]);

  if (!product) notFound();

  const recommendations = await getProductRecommendations(product.id);

  return (
    <ProductDetailView
      product={product}
      isAuthed={Boolean(session)}
      globalColors={globalColors}
      recommendations={recommendations}
    />
  );
}
