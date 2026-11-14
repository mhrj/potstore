import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  const tiers = await prisma.priceTier.findMany();
  console.log('Tiers count:', tiers.length);
  const labels = [...new Set(tiers.map(t => t.label))];
  console.log('Unique labels:', labels);

  const contents = await prisma.staticContent.findMany();
  console.log('StaticContent keys:', contents.map(c => c.key));
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
