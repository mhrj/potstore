import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { toFa } from '@/lib/format';
import { getContentMap } from '@/lib/content';
import LandingPageView from '@/features/landing/components/LandingPageView';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: {
    absolute: 'پات استور | گلدان، خاک و ملزومات گیاهان',
  },
  description:
    'تأمین‌کننده برتر گلدان سفالی، پلیمری، پلاستیکی، سرامیکی، بتنی، خاک تخصصی و ابزار گیاهان — خرده و عمده. ارسال به سراسر ایران با درگاه پرداخت امن.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'پات استور | گلدان، خاک و ملزومات گیاهان',
    description:
      'کیوریتور و تأمین‌کننده گلدان، خاک و ابزار نگهداری گیاهان با بهترین کارگاه‌های ایران — خرده و عمده.',
    type: 'website',
  },
};

async function getFeatured() {
  return prisma.product.findMany({
    where: { isActive: true, isFeatured: true },
    select: {
      id: true,
      name: true,
      slug: true,
      basePriceToman: true,
      salePriceToman: true,
      stock: true,
      bundleSize: true,
      allowBatchDiscount: true,
      bundleItems: true,
      colorOptions: true,
      tiers: {
        orderBy: { minQuantity: 'asc' },
        select: { minQuantity: true, unitPriceToman: true },
      },
      images: {
        orderBy: { sortOrder: 'asc' },
        take: 1,
        select: { url: true, alt: true },
      },
    },
    take: 8,
    orderBy: { createdAt: 'desc' },
  });
}

async function getLandingImages() {
  const rows = await prisma.landingImage.findMany({
    where: { key: { not: 'journey' } },
    select: { key: true, url: true, alt: true },
  });
  return Object.fromEntries(rows.map((r) => [r.key, r])) as Record<
    string,
    { key: string; url: string; alt: string | null } | undefined
  >;
}

async function getWholesaleHighlight() {
  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      allowBatchDiscount: true,
      tiers: { some: {} },
    },
    select: {
      id: true,
      name: true,
      basePriceToman: true,
      tiers: {
        orderBy: { minQuantity: 'asc' },
        select: {
          minQuantity: true,
          unitPriceToman: true,
          label: true,
        },
      },
    },
  });

  let maxDiscount = 0;
  let maxDiscountMinQty = 20;
  let bestProduct: (typeof products)[number] | null = null;
  let bestProductMaxDiscount = 0;

  for (const product of products) {
    if (!product.basePriceToman || product.basePriceToman <= 0) continue;

    let productHighestDiscount = 0;
    for (const tier of product.tiers) {
      if (tier.minQuantity > 1 && tier.unitPriceToman < product.basePriceToman) {
        const discountPercent = Math.round(
          ((product.basePriceToman - tier.unitPriceToman) / product.basePriceToman) * 100,
        );
        if (discountPercent > maxDiscount) {
          maxDiscount = discountPercent;
          maxDiscountMinQty = tier.minQuantity;
        }
        if (discountPercent > productHighestDiscount) {
          productHighestDiscount = discountPercent;
        }
      }
    }

    if (productHighestDiscount > bestProductMaxDiscount && product.tiers.length > 1) {
      bestProductMaxDiscount = productHighestDiscount;
      bestProduct = product;
    }
  }

  if (!bestProduct || bestProductMaxDiscount <= 0 || !bestProduct.tiers.length) {
    return {
      hasWholesaleTiers: false,
      maxDiscount: 0,
      maxDiscountMinQty: 0,
      sampleProductName: null,
      tableRows: [] as Array<{ q: string; p: number; d: string }>,
    };
  }

  const sampleBasePrice = bestProduct.basePriceToman;
  const sampleTiers = bestProduct.tiers;

  const tableRows = sampleTiers.map((tier, idx) => {
    const nextTier = sampleTiers[idx + 1];
    let qtyLabel = '';
    if (!nextTier) {
      qtyLabel = `${toFa(tier.minQuantity)} به بالا`;
    } else if (nextTier.minQuantity - 1 === tier.minQuantity) {
      qtyLabel = `${toFa(tier.minQuantity)} عدد`;
    } else {
      qtyLabel = `${toFa(tier.minQuantity)} تا ${toFa(nextTier.minQuantity - 1)}`;
    }

    const discountPercent =
      sampleBasePrice > 0
        ? Math.round(((sampleBasePrice - tier.unitPriceToman) / sampleBasePrice) * 100)
        : 0;
    const discountText = discountPercent > 0 ? `${toFa(discountPercent)}٪` : '—';

    return {
      q: qtyLabel,
      p: tier.unitPriceToman,
      d: discountText,
    };
  });

  return {
    hasWholesaleTiers: true,
    maxDiscount,
    maxDiscountMinQty,
    sampleProductName: bestProduct.name,
    tableRows,
  };
}

export default async function HomePage() {
  const [products, landing, content, wholesaleHighlight] = await Promise.all([
    getFeatured(),
    getLandingImages(),
    getContentMap(),
    getWholesaleHighlight(),
  ]);

  return (
    <LandingPageView
      products={products}
      landing={landing}
      content={content}
      wholesaleHighlight={wholesaleHighlight}
    />
  );
}
