import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getCartTotals } from '@/lib/cart';
import { calcShippingToman } from '@/lib/pricing';
import { fetchTapinLocations } from '@/lib/providers/shipping/tapin/locations';
import { calculateTapinRate } from '@/lib/providers/shipping/tapin/rates';
import Container from '@/components/ui/Container';
import { CheckoutForm } from '@/features/checkout';
import { redirect } from 'next/navigation';

export default async function CheckoutPage() {
  const user = await requireUser();

  const [addresses, totals, locations] = await Promise.all([
    prisma.address.findMany({
      where: { userId: user.id },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    }),
    getCartTotals(user.id),
    fetchTapinLocations().catch((err) => {
      console.error('Failed to fetch Tapin locations in CheckoutPage:', err);
      return [];
    }),
  ]);

  if (totals.lines.length === 0) {
    redirect('/cart');
  }

  // Pre-calculate shipping rate with Tapin for the active/default address
  const isFreeShipping = totals.payableToman >= 5_000_000;
  const initialShippingRates: Record<string, number> = {};
  let initialShippingError: string | null = null;

  const activeAddress = addresses.find((a) => a.isDefault) ?? addresses[0];

  if (activeAddress) {
    if (isFreeShipping) {
      initialShippingRates[activeAddress.id] = 0;
    } else {
      try {
        const rate = await calculateTapinRate(activeAddress, totals.lines);
        initialShippingRates[activeAddress.id] = rate.costToman;
      } catch (_err) {
        initialShippingError = 'خطا در محاسبه هزینه ارسال. لطفاً دوباره تلاش کنید.';
      }
    }
  }

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
            provinceCode: a.provinceCode,
            city: a.city,
            cityCode: a.cityCode,
            postalCode: a.postalCode,
            line1: a.line1,
            line2: a.line2,
            isDefault: a.isDefault,
          }))}
          totals={totals}
          initialShippingRates={initialShippingRates}
          initialShippingError={initialShippingError}
          locations={locations}
          provinces={locations}
        />
      </div>
    </Container>
  );
}
