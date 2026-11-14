import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getCartTotals } from '@/lib/cart';
import { calculateShippingCost, resolveCityCode } from '@/lib/postex';
import { calcShippingToman } from '@/lib/pricing';
import Container from '@/components/ui/Container';
import { CheckoutForm } from '@/features/checkout';
import { redirect } from 'next/navigation';

export default async function CheckoutPage() {
  const user = await requireUser();

  const [addresses, totals] = await Promise.all([
    prisma.address.findMany({
      where: { userId: user.id },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    }),
    getCartTotals(user.id),
  ]);

  if (totals.lines.length === 0) {
    redirect('/cart');
  }

  // Pre-calculate shipping rates with Postex helper for all available addresses
  let originCity = 'تهران';
  try {
    const settings = await prisma.storeSettings.findUnique({
      where: { id: 'singleton' },
    });
    if (settings?.originCity) {
      originCity = settings.originCity;
    }
  } catch {
    // fallback
  }
  const fromCityCode = resolveCityCode(originCity);
  const initialShippingRates: Record<string, number> = {};

  await Promise.all(
    addresses.map(async (a) => {
      const rate = await calculateShippingCost({
        originCity,
        from_city_code: fromCityCode,
        destinationCity: a.city || a.province,
        weightGrams: totals.totalWeightGrams,
        fallbackTotals: totals,
      });
      initialShippingRates[a.id] =
        typeof rate === 'number'
          ? rate
          : calcShippingToman(totals, a.city || a.province);
    }),
  );

  return (
    <Container className="py-12">
      <h1 className="text-2xl font-black text-soil-900 dark:text-dust-50">تکمیل خرید</h1>
      <p className="mt-2 text-sm text-soil-700/70 dark:text-dust-200/70">
        آدرس تحویل سفارش را انتخاب یا ثبت کنید، سپس برای پرداخت امن به درگاه منتقل می‌شوید.
      </p>

      <div className="mt-8">
        <CheckoutForm
          addresses={addresses.map((a) => ({
            id: a.id,
            label: a.label,
            fullName: a.fullName,
            phone: a.phone,
            province: a.province,
            city: a.city,
            postalCode: a.postalCode,
            line1: a.line1,
            line2: a.line2,
            isDefault: a.isDefault,
          }))}
          totals={totals}
          initialShippingRates={initialShippingRates}
        />
      </div>
    </Container>
  );
}
