import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Baseline tier multipliers relative to each product's basePriceToman.
// 1.00 = retail, 0.85 = -15% batch, 0.70 = -30% wholesale.
const TIER_DEFS = [
  { minQuantity: 1, multiplier: 1.0, label: 'خرده' },
  { minQuantity: 5, multiplier: 0.85, label: 'بسته‌ای' },
  { minQuantity: 20, multiplier: 0.7, label: 'عمده' },
];

async function main() {
  // -------------------------------------------------------------
  // Users
  // -------------------------------------------------------------
  const adminHash = await bcrypt.hash('admin1234', 12);
  const customerHash = await bcrypt.hash('user1234', 12);

  const admin = await prisma.user.upsert({
    where: { phone: '09120000000' },
    update: {},
    create: {
      phone: '09120000000',
      fullName: 'مدیر سیستم',
      passwordHash: adminHash,
      role: 'ADMIN',
    },
  });
  console.log('[seed] admin:', admin.phone);

  const customer = await prisma.user.upsert({
    where: { phone: '09121111111' },
    update: {},
    create: {
      phone: '09121111111',
      fullName: 'مشتری نمونه',
      passwordHash: customerHash,
      role: 'CUSTOMER',
    },
  });
  console.log('[seed] customer:', customer.phone);

  // -------------------------------------------------------------
  // Sample address for the demo customer (used by checkout flow)
  // -------------------------------------------------------------
  const existingAddress = await prisma.address.findFirst({
    where: { userId: customer.id },
  });
  if (!existingAddress) {
    await prisma.address.create({
      data: {
        userId: customer.id,
        label: 'HOME',
        fullName: 'مشتری نمونه',
        phone: '09121111111',
        province: 'تهران',
        city: 'تهران',
        postalCode: '1234567890',
        line1: 'خیابان ولیعصر، پلاک ۱۰۰',
        isDefault: true,
      },
    });
    console.log('[seed] sample address created');
  }

  // -------------------------------------------------------------
  // Categories
  // -------------------------------------------------------------
  const categories = [
    { name: 'سفال', slug: 'clay' },
    { name: 'سرامیک', slug: 'ceramic' },
    { name: 'بتن', slug: 'concrete' },
    { name: 'گلدان و دکور', slug: 'pots-decor' },
    { name: 'خاک و بستر کشت', slug: 'soil-growth' },
    { name: 'لوازم نگهداری', slug: 'tools-care' },
    { name: 'انتخاب محصول', slug: 'product-guide' },
  ];

  const categoryMap = new Map<string, string>();
  for (const cat of categories) {
    const createdCat = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name },
      create: { name: cat.name, slug: cat.slug, isActive: true },
    });
    categoryMap.set(cat.name, createdCat.id);
    console.log('[seed] category:', createdCat.name);
  }

  // -------------------------------------------------------------
  // Global Colors
  // -------------------------------------------------------------
  const globalColors = [
    { name: 'سفید مات', hexCode: '#FFFFFF' },
    { name: 'مشکی مات', hexCode: '#1F1F1F' },
    { name: 'تراکوتا', hexCode: '#C86A4B' },
    { name: 'طوسی روشن', hexCode: '#D3D3D3' },
    { name: 'طوسی تیره', hexCode: '#808080' },
    { name: 'خاکی / کرم', hexCode: '#E8D8C8' },
    { name: 'سبز صدری', hexCode: '#7A8B7B' },
    { name: 'قهوه‌ای سوخته', hexCode: '#4A3525' },
  ];

  for (const c of globalColors) {
    await prisma.globalColor.upsert({
      where: { name: c.name },
      update: { hexCode: c.hexCode },
      create: c,
    });
    console.log('[seed] global color:', c.name);
  }

  // -------------------------------------------------------------
  // Products
  // -------------------------------------------------------------
  const products = [
    {
      slug: 'clay-pot-terracotta-medium',
      name: 'گلدان سفالی تراکوتا متوسط',
      shortDesc: 'گلدان سفالی دست‌ساز با زهکشی عالی، مناسب گیاهان آپارتمانی',
      description:
        'این گلدان سفالی به‌صورت دست‌ساز در کارگاه ما تولید می‌شود. سفال به دلیل خاصیت نفس‌کشی، رطوبت اضافی خاک را تنظیم می‌کند و از پوسیدگی ریشه جلوگیری می‌کند.\n\nمناسب برای: سانسوریا، پتوس، فیکوس، زاموفیلیا.',
      material: 'سفال',
      color: 'تراکوتا',
      diameterCm: 20,
      heightCm: 18,
      weightGrams: 1400,
      stock: 120,
      unitsPerCarton: 6,
      bundleSize: 2,
      bundleItems: [
        {
          title: 'گلدان سفالی تراکوتا ۲۰cm',
          description: 'گلدان با دهانه ۲۰ و ارتفاع ۱۸ سانتی‌متر',
          material: 'سفال',
          diameterCm: 20,
          heightCm: 18,
          weightGrams: 800,
          price: 90000,
          colorOptions: ['#C86A4B', '#8D5B4C', '#E0A899'],
        },
        {
          title: 'گلدان سفالی تراکوتا ۱۵cm',
          description: 'گلدان با دهانه ۱۵ و ارتفاع ۱۴ سانتی‌متر',
          material: 'سفال',
          diameterCm: 15,
          heightCm: 14,
          weightGrams: 600,
          price: 75000,
          colorOptions: ['#C86A4B', '#4A3525', '#F5EBE6'],
        },
      ],
      basePriceToman: 150000,
      isFeatured: true,
      features: [{ label: 'سوراخ زهکشی دارد', enabled: true }],
    },
    {
      slug: 'ceramic-glazed-white-large',
      name: 'گلدان سرامیکی لعاب‌دار سفید',
      shortDesc: 'سرامیک لعاب‌دار براق، نگه‌دارنده رطوبت، مناسب گیاهان رطوبت‌دوست',
      description:
        'سرامیک لعاب‌دار سطح براق و مقاوم دارد و رطوبت را بیشتر در خاک نگه می‌دارد. مناسب گیاهان رطوبت‌دوست مثل سرخس و کالاتیا.',
      material: 'سرامیک',
      color: 'سفید',
      colorOptions: ['#FFFFFF', '#1A1A1A', '#2E7D32', '#D32F2F', '#0288D1', '#F57C00', '#7B1FA2', '#FBC02D'],
      diameterCm: 24,
      heightCm: 22,
      weightGrams: 1900,
      stock: 80,
      unitsPerCarton: 4,
      bundleSize: 1,
      bundleItems: null,
      basePriceToman: 220000,
      isFeatured: true,
      features: [{ label: 'سوراخ زهکشی دارد', enabled: true }],
    },
    {
      slug: 'concrete-pot-minimalist',
      name: 'گلدان بتنی مینیمال',
      shortDesc: 'گلدان بتنی مقاوم، مناسب فضای باز و پروژه‌های بزرگ',
      description:
        'گلدان بتنی با تراکم بالا، مقاوم به سرما و مناسب فضای باز. برای بالکن، تراس و پروژه‌های محوطه‌سازی.',
      material: 'بتن',
      color: 'خاکستری',
      colorOptions: ['#808080', '#D3D3D3', '#333333'],
      diameterCm: 30,
      heightCm: 28,
      weightGrams: 4500,
      stock: 45,
      unitsPerCarton: 2,
      bundleSize: 1,
      bundleItems: null,
      basePriceToman: 380000,
      isFeatured: true,
      features: [
        { label: 'سوراخ زهکشی دارد', enabled: true },
        { label: 'مقاوم به سرما', enabled: true },
      ],
    },
  ];

  for (const p of products) {
    const categoryId = categoryMap.get(p.material);
    const created = await prisma.product.upsert({
      where: { slug: p.slug },
      update: {
        categoryId,
        bundleSize: p.bundleSize ?? 1,
        bundleItems: p.bundleItems ?? undefined,
        colorOptions: p.colorOptions ?? undefined,
        allowBatchDiscount: true,
      },
      create: {
        ...p,
        categoryId,
        bundleSize: p.bundleSize ?? 1,
        bundleItems: p.bundleItems ?? undefined,
        colorOptions: p.colorOptions ?? undefined,
        allowBatchDiscount: true,
        images: {
          create: [
            {
              url: `https://placehold.co/800x800/E8D5C4/3E2723.png?text=${encodeURIComponent(p.name)}`,
              alt: p.name,
              sortOrder: 0,
            },
          ],
        },
        tiers: {
          create: TIER_DEFS.map((t) => ({
            minQuantity: t.minQuantity,
            unitPriceToman: Math.round((p.basePriceToman * t.multiplier) / 1000) * 1000,
            label: t.label,
          })),
        },
      },
    });
    console.log('[seed] product:', created.name);
  }

  // -------------------------------------------------------------
  // Editable site copy (about page + contact details)
  //
  // `update: {}` on purpose, matching the upserts above. Seeding must never
  // overwrite copy an admin has already edited through /admin/content — it only
  // fills in keys that do not exist yet.
  // -------------------------------------------------------------
  const CONTENT = [
    { key: 'home_hero_title', title: 'عنوان اصلی صفحه نخست', body: 'به فضاهای خالی، جان بدهیم.' },
    {
      key: 'home_hero_subtitle',
      title: 'زیرعنوان صفحه نخست',
      body: 'از گلدان‌های سفالی و سرامیکی دست‌ساز تا خاک و ابزار نگهداری گیاهان؛ پات استور با همکاری بهترین کارگاه‌های ایران، هر آنچه برای سبز نگه‌داشتن فضای شما لازم است را فراهم می‌کند.',
    },
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
    { key: 'about_title', title: 'عنوان صفحه درباره ما', body: 'درباره پات استور' },
    {
      key: 'about_body',
      title: 'متن صفحه درباره ما',
      body: 'از گلدون و خاک گرفته تا وسایل نگهداری گیاه، هرچی برای گل‌وگیاه‌هاتون لازم دارید، اینجا پیدا می‌کنید.\n\nچه تازه شروع کرده باشید، چه مدت‌هاست از گیاه‌هاتون مراقبت می‌کنید، سعی می‌کنیم انتخاب رو براتون راحت‌تر کنیم.\n\nپات استور؛ برای حال خوب گیاه‌هاتون 🌱',
    },
    { key: 'footer_text', title: 'متن فوتر', body: 'پات استور؛ تأمین‌کننده گلدان، خاک و ملزومات گیاهان برای فضاهای زنده و آرام.' },
    { key: 'address', title: 'نشانی', body: 'تهران، خیابان ولیعصر، پلاک ۱۰۰' },
    { key: 'phone', title: 'تلفن', body: '۰۲۱-۹۱۰۰۰۰۰۰' },
    { key: 'email', title: 'ایمیل', body: 'info@potstore.ir' },
    { key: 'hours', title: 'ساعات کاری', body: 'شنبه تا پنجشنبه، ۹ صبح تا ۶ عصر' },
  ];

  for (const block of CONTENT) {
    await prisma.staticContent.upsert({
      where: { key: block.key },
      update: {},
      create: { key: block.key, title: block.title, body: block.body, isPublished: true },
    });
    console.log('[seed] content:', block.key);
  }

  // -------------------------------------------------------------
  // Articles
  // -------------------------------------------------------------
  const articles = [
    {
      title: 'راهنمای جامع انتخاب گلدان مناسب برای گیاهان آپارتمانی',
      slug: 'pot-selection-guide',
      excerpt:
        'انتخاب گلدان فقط یک تصمیم دکوراتیو نیست؛ جنس گلدان، اندازه دهانه و وجود سوراخ زهکشی مستقیماً با طول عمر و تنفس ریشه گیاه ارتباط دارد.',
      content: `
        <h2>چرا جنس گلدان اهمیت دارد؟</h2>
        <p>بسیاری از علاقه‌مندان به گل و گیاه هنگام خرید، فقط به زیبایی ظاهری گلدان توجه می‌کنند، در حالی که جنس دیواره گلدان رفتار آب و اکسیژن را در خاک تعیین می‌کند.</p>
        
        <h3>۱. گلدان‌های سفالی سنتی</h3>
        <p>سفال خام به دلیل داشتن منافذ میکروسکوپی فراوان، به دیواره‌ها اجازه تنفس می‌دهد. این ویژگی باعث تبخیر سریع‌تر رطوبت اضافی و جلوگیری از خفگی ریشه می‌شود. این گلدان‌ها انتخابی ایده‌آل برای سانسوریا، زامیفولیا و انواع کاکتوس و ساکولنت هستند.</p>

        <h3>۲. گلدان‌های سرامیکی لعاب‌دار</h3>
        <p>لعاب شیشه‌ای روی سرامیک مانع از تبخیر سطحی رطوبت از دیواره‌ها می‌شود؛ بنابراین خاک دیرتر خشک می‌شود. گیاهانی که به رطوبت یکنواخت نیاز دارند مانند اسپاتی‌فیلوم و سرخس‌ها در این نوع گلدان عملکرد عالی دارند.</p>

        <blockquote>
          <strong>نکته کلیدی:</strong> هیچ‌گاه گیاهی را در گلدان بدون سوراخ زهکشی نکارید. انباشت آب در انتهای گلدان اصلی‌ترین علت پوسیدگی ریشه گیاهان آپارتمانی است.
        </blockquote>

        <h2>تناسب اندازه گلدان با گیاه</h2>
        <p>یک اشتباه رایج، کاشت گیاه کوچک در گلدان بسیار بزرگ است به امید آنکه سریع‌تر رشد کند! حجم زیاد خاک مرطوب که ریشه‌ای در آن نیست، ترشیده شده و باعث ایجاد قارچ و فساد ریشه خواهد شد.</p>
        <ul>
          <li>برای گیاهان کوچک، گلدانی انتخاب کنید که قطر دهانه آن تنها ۲ تا ۳ سانتی‌متر از توپ ریشه بزرگ‌تر باشد.</li>
          <li>برای درختچه‌ها و گیاهان بزرگ، افزایش قطر دهانه تا ۵ سانتی‌متر مناسب خواهد بود.</li>
        </ul>
      `,
      coverImage: '/images/products/clay-pot-1.jpg',
      tags: ['گلدان', 'نگهداری گیاه', 'زهکشی', 'راهنمای خرید'],
      isPublished: true,
    },
    {
      title: 'فرمول ترکیب خاک ایده‌آل برای گیاهان آپارتمانی',
      slug: 'indoor-plants-soil-mix',
      excerpt:
        'خاک سنگین باغچه دشمن گیاهان گلدانی است. با این ترکیب سه جزیی سبک و غنی، ریشه‌های گیاهان شما بیشترین رشد و جذب مواد غذایی را تجربه خواهند کرد.',
      content: `
        <h2>مشکل خاک معمولی باغچه در گلدان چیست؟</h2>
        <p>خاک باغچه در فضای بسته گلدان پس از چند بار آبیاری به شدت متراکم و فشرده می‌شود. این تراکم مانع از رسیدن اکسیژن به ریشه‌ها و تخلیه آب اضافی خواهد شد.</p>

        <h2>ترکیب استاندارد خاک گلدان</h2>
        <p>یک ترکیب حرفه‌ای و همه‌منظوره شامل اجزای زیر است:</p>
        <ul>
          <li><strong>پیت‌ماس (۴۰٪):</strong> برای حفظ مواد مغذی و ایجاد ساختار اسفنجی سبک.</li>
          <li><strong>پرلیت دانه متوسط (۳۰٪):</strong> برای ایجاد تهویه عالی و جلوگیری از فشردگی خاک.</li>
          <li><strong>کوکوپیت یا ورمی‌کمپوست (۳۰٪):</strong> برای تغذیه ارگانیک تدریجی ریشه‌ها.</li>
        </ul>

        <p>برای دریافت مشاوره تخصصی در انتخاب خاک متناسب با گیاه خود، می‌توانید از بخش مشاوره فروشگاه با کارشناسان ما در تماس باشید.</p>
      `,
      coverImage: '/images/products/ceramic-pot-1.jpg',
      tags: ['خاک', 'پیت‌ماس', 'پرلیت', 'نگهداری گیاه'],
      isPublished: true,
    },
  ];

  for (const art of articles) {
    await prisma.article.upsert({
      where: { slug: art.slug },
      update: {},
      create: art,
    });
    console.log('[seed] article:', art.slug);
  }

  console.log('\n[seed] done.');
  console.log('  admin    -> 09120000000 / admin1234');
  console.log('  customer -> 09121111111 / user1234');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
