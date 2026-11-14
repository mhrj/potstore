import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  const contents = await prisma.staticContent.findMany();
  for (const c of contents) {
    console.log(`=== ${c.key} ===`);
    console.log(c.body);
  }
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
