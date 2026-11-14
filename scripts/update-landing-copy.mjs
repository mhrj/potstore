import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function run() {
  console.log('--- Updating StaticContent for Landing Page ---');

  const updates = [
    {
      key: 'promo_title',
      title: 'عنوان بخش خرید هوشمندانه و تخفیف پلکانی',
      body: 'خرید هوشمندانه برای کافه‌ها، دفاتر و خانه‌ها',
    },
    {
      key: 'promo_subtitle',
      title: 'زیرعنوان بخش خرید هوشمندانه و تخفیف پلکانی',
      body: 'نیازی به ثبت درخواست سازمانی ندارید. سیستم ما تخفیف‌ها را به صورت خودکار محاسبه می‌کند. هرچه بیشتر خرید کنید، هزینه کمتری پرداخت خواهید کرد.',
    },
  ];

  for (const item of updates) {
    const res = await prisma.staticContent.upsert({
      where: { key: item.key },
      update: { title: item.title, body: item.body, isPublished: true },
      create: { key: item.key, title: item.title, body: item.body, isPublished: true },
    });
    console.log(`Updated StaticContent: [${res.key}] -> ${res.body}`);
  }

  console.log('\n--- Verification ---');
  const items = await prisma.staticContent.findMany({
    where: { key: { in: ['promo_title', 'promo_subtitle'] } },
  });
  for (const i of items) {
    console.log(`[${i.key}]: ${i.body}`);
  }
}

run()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

