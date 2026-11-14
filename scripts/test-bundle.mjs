import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  const bundles = await prisma.product.findMany({
    where: { bundleSize: { gt: 1 } },
    select: { slug: true, name: true, bundleSize: true, basePriceToman: true, bundleItems: true },
  });
  console.log(JSON.stringify(bundles, null, 2));
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
