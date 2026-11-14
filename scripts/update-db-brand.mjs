import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  console.log('--- Updating PriceTier typos ---');
  // Update any PriceTier with typo "بستهای" to "بسته‌ای" (with ZWNJ \u200c)
  const updatedTiers = await prisma.priceTier.updateMany({
    where: { label: 'بستهای' },
    data: { label: 'بسته‌ای' },
  });
  console.log(`Updated ${updatedTiers.count} price tiers from بستهای to بسته‌ای.`);

  // Also ensure all minQuantity: 5 tiers have label 'بسته‌ای'
  const ensureBatchTiers = await prisma.priceTier.updateMany({
    where: { minQuantity: 5, label: { not: 'بسته‌ای' } },
    data: { label: 'بسته‌ای' },
  });
  console.log(`Updated ${ensureBatchTiers.count} minQuantity 5 tiers to بسته‌ای.`);

  console.log('--- Updating StaticContent ---');
  const CONTENTS = [
    {
      key: 'home_hero_title',
      title: 'عنوان اصلی صفحه نخست',
      body: 'به فضاهای خالی، جان بدهیم.',
    },
    {
      key: 'home_hero_subtitle',
      title: 'زیرعنوان صفحه نخست',
      body: 'از گلدانهای سفالی و سرامیکی دستساز تا خاک و ابزار نگهداری گیاهان؛ پات استور با همکاری بهترین کارگاههای ایران، هر آنچه برای سبز نگهداشتن فضای شما لازم است را فراهم میکند.',
    },
    {
      key: 'promo_title',
      title: 'عنوان بخش همکاری عمده',
      body: 'تأمین عمده برای گلخانهها، کافهها و پروژهها',
    },
    {
      key: 'promo_subtitle',
      title: 'زیرعنوان بخش همکاری عمده',
      body: 'اگر قصد تجهیز یک پروژه بزرگ یا تأمین محصولات برای کسبوکار خود را دارید، پات استور با شبکه گسترده تأمینکنندگان خود، بهترین کیفیت و قیمت را بدون واسطه در اختیار شما قرار میدهد.',
    },
    {
      key: 'about_title',
      title: 'عنوان صفحه درباره ما',
      body: 'درباره پات استور',
    },
    {
      key: 'about_body',
      title: 'متن صفحه درباره ما',
      body: 'پات استور یک تولیدکننده نیست؛ ما یک نمایشگاه کیوریتشده از بهترین گلدانها، خاک و ابزارهای گیاهان هستیم. ما با بهترین کارگاههای سفال، سرامیک و بتن در سراسر ایران شریک شدهایم تا محصولات باکیفیت را مستقیماً به دست شما برسانیم.\n\nما معتقدیم یک گلدان خوب، پایهی یک گیاه سالم است. به همین دلیل روی کیفیت مواد، اصولی بودن زهکشی و تنوع محصولات وسواس داریم. از یک عدد برای طاقچه خانه تا سفارشهای عمده برای پروژههای بزرگ، تیم ما بهترین انتخابها را برای شما بستهبندی و ارسال میکند.\n\nهدف ما این است که فرآیند خرید و نگهداری از گیاهان را برای شما ساده، لذتبخش و قابل اعتماد کنیم.',
    },
    {
      key: 'footer_text',
      title: 'متن فوتر',
      body: 'پات استور؛ تأمین‌کننده گلدان، خاک و ملزومات گیاهان برای فضاهای زنده و آرام.',
    },
    {
      key: 'email',
      title: 'ایمیل',
      body: 'info@potstore.ir',
    },
  ];

  for (const c of CONTENTS) {
    const upserted = await prisma.staticContent.upsert({
      where: { key: c.key },
      update: { title: c.title, body: c.body, isPublished: true },
      create: { key: c.key, title: c.title, body: c.body, isPublished: true },
    });
    console.log(`StaticContent updated: ${upserted.key} -> ${upserted.title}`);
  }

  console.log('\n--- Verification ---');
  const allContents = await prisma.staticContent.findMany();
  for (const item of allContents) {
    console.log(`[${item.key}]: ${item.body.slice(0, 50)}...`);
  }

  const allTiers = await prisma.priceTier.findMany({ select: { label: true } });
  const uniqueLabels = [...new Set(allTiers.map((t) => t.label))];
  console.log('Unique tier labels in DB:', uniqueLabels);
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
