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

  // Pre-calculate shipping rates with Tapin for all available addresses
  const isFreeShipping = totals.payableToman >= 5_000_000;
  const initialShippingRates: Record<string, number> = {};
  let initialWeightLimitError: string | null = null;

  if (totals.totalWeightGrams > 30000) {
    initialWeightLimitError =
      'سفارش شما بیش از ۳۰ کیلوگرم است و امکان ارسال با پست پیشتاز وجود ندارد. لطفاً سفارش خود را به دو بخش تقسیم کنید یا با پشتیبانی تماس بگیرید.';
  } else {
    await Promise.all(
      addresses.map(async (a) => {
        if (isFreeShipping) {
          initialShippingRates[a.id] = 0;
          return;
        }
        try {
          const rate = await calculateTapinRate(a, totals.lines);
          initialShippingRates[a.id] = rate.costToman;
        } catch (err) {
          if (err instanceof Error && err.message === 'WEIGHT_LIMIT_EXCEEDED') {
            initialWeightLimitError =
              'سفارش شما بیش از ۳۰ کیلوگرم است و امکان ارسال با پست پیشتاز وجود ندارد. لطفاً سفارش خود را به دو بخش تقسیم کنید یا با پشتیبانی تماس بگیرید.';
            return;
          }
          console.warn(`[checkout] Tapin rate failed for address ${a.id}:`, err);
          initialShippingRates[a.id] = calcShippingToman(totals, a.city || a.province);
        }
      }),
    );
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
          initialWeightLimitError={initialWeightLimitError}
          locations={locations}
          provinces={locations}
        />
      </div>
    </Container>
  );
}
