import { prisma } from '@/lib/prisma';
import { RelationKind, Prisma } from '@prisma/client';
import {
  scoreSimilar,
  scoreComplement,
  calculateLift,
  type ScorableProduct,
} from './scoring';
import type { ProductCardData } from '@/features/catalog/components/ProductCard';

type ProductRelationRow = {
  id: string;
  kind: RelationKind;
  score: number;
  manual: boolean;
  to: ProductCardData;
};

/**
 * Computes and persists top 8 SIMILAR, top 4 COMPLEMENT, and top BOUGHT_TOGETHER
 * recommendations for a specific product. Preserves manually pinned relations (manual: true).
 */
export async function rebuildProductRecommendations(
  productId: string,
  txClient?: Prisma.TransactionClient,
) {
  const db = txClient ?? prisma;

  const target = await db.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      name: true,
      shortDesc: true,
      material: true,
      categoryId: true,
      diameterCm: true,
      heightCm: true,
      basePriceToman: true,
      color: true,
      stock: true,
      isActive: true,
      category: { select: { slug: true } },
    },
  });

  if (!target || !target.isActive) return;

  const targetScorable: ScorableProduct = {
    id: target.id,
    name: target.name,
    shortDesc: target.shortDesc,
    material: target.material,
    categoryId: target.categoryId,
    categorySlug: target.category?.slug ?? null,
    diameterCm: target.diameterCm,
    heightCm: target.heightCm,
    basePriceToman: target.basePriceToman,
    color: target.color,
    stock: target.stock,
    isActive: target.isActive,
  };

  // Fetch all other active candidate products
  const candidates = await db.product.findMany({
    where: {
      isActive: true,
      id: { not: productId },
    },
    select: {
      id: true,
      name: true,
      shortDesc: true,
      material: true,
      categoryId: true,
      diameterCm: true,
      heightCm: true,
      basePriceToman: true,
      color: true,
      stock: true,
      isActive: true,
      category: { select: { slug: true } },
    },
  });

  const scorableCandidates: ScorableProduct[] = candidates.map((c) => ({
    id: c.id,
    name: c.name,
    shortDesc: c.shortDesc,
    material: c.material,
    categoryId: c.categoryId,
    categorySlug: c.category?.slug ?? null,
    diameterCm: c.diameterCm,
    heightCm: c.heightCm,
    basePriceToman: c.basePriceToman,
    color: c.color,
    stock: c.stock,
    isActive: c.isActive,
  }));

  // 1. Compute SIMILAR: top 8
  const similarRanked = scorableCandidates
    .map((c) => ({
      candidateId: c.id,
      score: scoreSimilar(targetScorable, c),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  // 2. Compute COMPLEMENT: top 4
  const complementRanked = scorableCandidates
    .map((c) => ({
      candidateId: c.id,
      score: scoreComplement(targetScorable, c),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  // 3. Compute BOUGHT_TOGETHER from PAID orders
  const paidOrdersWithTarget = await db.order.findMany({
    where: {
      paymentStatus: 'PAID',
      items: { some: { productId } },
    },
    select: {
      id: true,
      items: {
        select: { productId: true },
      },
    },
  });

  const totalPaidOrders = await db.order.count({
    where: { paymentStatus: 'PAID' },
  });

  const boughtTogetherRanked: Array<{ candidateId: string; score: number }> = [];

  if (totalPaidOrders > 0 && paidOrdersWithTarget.length > 0) {
    const coCounts = new Map<string, number>();
    for (const order of paidOrdersWithTarget) {
      for (const item of order.items) {
        if (item.productId && item.productId !== productId) {
          coCounts.set(item.productId, (coCounts.get(item.productId) ?? 0) + 1);
        }
      }
    }

    const targetOrderCount = paidOrdersWithTarget.length;

    for (const [otherId, coCount] of coCounts.entries()) {
      const otherOrderCount = await db.order.count({
        where: {
          paymentStatus: 'PAID',
          items: { some: { productId: otherId } },
        },
      });

      const lift = calculateLift(coCount, targetOrderCount, otherOrderCount, totalPaidOrders);
      if (lift > 1.0) {
        boughtTogetherRanked.push({ candidateId: otherId, score: lift });
      }
    }

    boughtTogetherRanked.sort((a, b) => b.score - a.score);
  }

  const topBoughtTogether = boughtTogetherRanked.slice(0, 4);

  // Persist computed relations into database in a transaction
  const executePersistence = async (client: Prisma.TransactionClient) => {
    // Keep manual entries: remove only automated relations
    await client.productRelation.deleteMany({
      where: {
        fromId: productId,
        manual: false,
      },
    });

    const relationsToUpsert = [
      ...similarRanked.map((s) => ({
        kind: RelationKind.SIMILAR,
        toId: s.candidateId,
        score: s.score,
      })),
      ...complementRanked.map((c) => ({
        kind: RelationKind.COMPLEMENT,
        toId: c.candidateId,
        score: c.score,
      })),
      ...topBoughtTogether.map((b) => ({
        kind: RelationKind.BOUGHT_TOGETHER,
        toId: b.candidateId,
        score: b.score,
      })),
    ];

    for (const r of relationsToUpsert) {
      await client.productRelation.upsert({
        where: {
          fromId_toId_kind: {
            fromId: productId,
            toId: r.toId,
            kind: r.kind,
          },
        },
        create: {
          fromId: productId,
          toId: r.toId,
          kind: r.kind,
          score: r.score,
          manual: false,
        },
        update: {
          score: r.score,
        },
      });
    }
  };

  if (txClient) {
    await executePersistence(txClient);
  } else {
    await prisma.$transaction(async (tx) => {
      await executePersistence(tx);
    });
  }
}

/**
 * Rebuilds recommendations for all active products in the store.
 */
export async function rebuildAllRecommendations() {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: { id: true },
  });

  for (const product of products) {
    await rebuildProductRecommendations(product.id);
  }
}

/**
 * Fetches structured product recommendations for display on the product detail page.
 * If no relations exist yet, automatically triggers a rebuild on demand.
 */
export async function getProductRecommendations(productId: string) {
  let relations = (await prisma.productRelation.findMany({
    where: {
      fromId: productId,
      to: { isActive: true },
    },
    orderBy: [
      { manual: 'desc' },
      { score: 'desc' },
    ],
    select: {
      id: true,
      kind: true,
      score: true,
      manual: true,
      to: {
        select: {
          id: true,
          name: true,
          slug: true,
          shortDesc: true,
          material: true,
          diameterCm: true,
          basePriceToman: true,
          salePriceToman: true,
          stock: true,
          bundleSize: true,
          allowBatchDiscount: true,
          bundleItems: true,
          colorOptions: true,
          images: {
            orderBy: { sortOrder: 'asc' },
            take: 1,
            select: { url: true, alt: true },
          },
          tiers: {
            orderBy: { minQuantity: 'asc' },
            select: { minQuantity: true, unitPriceToman: true, label: true },
          },
        },
      },
    },
  })) as ProductRelationRow[];

  // On-demand lazy rebuild if unseeded
  if (relations.length === 0) {
    await rebuildProductRecommendations(productId);
    relations = (await prisma.productRelation.findMany({
      where: {
        fromId: productId,
        to: { isActive: true },
      },
      orderBy: [
        { manual: 'desc' },
        { score: 'desc' },
      ],
      select: {
        id: true,
        kind: true,
        score: true,
        manual: true,
        to: {
          select: {
            id: true,
            name: true,
            slug: true,
            shortDesc: true,
            material: true,
            diameterCm: true,
            basePriceToman: true,
            salePriceToman: true,
            stock: true,
            bundleSize: true,
            allowBatchDiscount: true,
            bundleItems: true,
            colorOptions: true,
            images: {
              orderBy: { sortOrder: 'asc' },
              take: 1,
              select: { url: true, alt: true },
            },
            tiers: {
              orderBy: { minQuantity: 'asc' },
              select: { minQuantity: true, unitPriceToman: true, label: true },
            },
          },
        },
      },
    })) as ProductRelationRow[];
  }

  const similar = relations
    .filter((r) => r.kind === RelationKind.SIMILAR)
    .map((r) => r.to);

  const complement = relations
    .filter((r) => r.kind === RelationKind.COMPLEMENT)
    .map((r) => r.to);

  const boughtTogether = relations
    .filter((r) => r.kind === RelationKind.BOUGHT_TOGETHER)
    .map((r) => r.to);

  return {
    similar,
    complement,
    boughtTogether,
  };
}

