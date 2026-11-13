import Link from 'next/link';
import { formatToman, formatWeight } from '@/lib/format';
import { numberToWordsFa } from '@/lib/number-to-words';
import Container from '@/components/ui/Container';
import CartItemRow from '@/features/checkout/components/CartItemRow';
import type { CartTotals } from '@/lib/pricing';

type CartViewProps = {
  totals: CartTotals;
  stockMap: Record<string, number>;
};

export default function CartView({ totals, stockMap }: CartViewProps) {
  if (totals.lines.length === 0) {
    return (
      <Container className="py-20 text-center max-w-lg mx-auto">
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-flora-50 text-2xl dark:bg-flora-900/50">
          🪴
        </div>
        <h1 className="text-2xl font-black text-soil-900 dark:text-dust-50">سبد خرید شما خالی است!</h1>
        <p className="mt-3 text-sm leading-7 text-soil-700/80 dark:text-dust-200/80">
          هنوز گلدانی انتخاب نکرده‌اید. نگاهی به مجموعه ما بیندازید تا فضایتان سبز شود.
        </p>
        <Link
          href="/products"
          className="mt-6 inline-block rounded-full bg-flora-900 text-white dark:bg-flora-500 dark:text-flora-950 dark:hover:bg-flora-700 px-6 py-3 text-sm font-bold shadow-lg shadow-flora-900/20 transition-colors hover:bg-flora-700"
        >
          مشاهده محصولات
        </Link>
      </Container>
    );
  }

  return (
    <Container className="py-12">
      <h1 className="text-2xl font-black text-soil-900 dark:text-dust-50">سبد خرید</h1>
      <div className="mt-8 grid gap-8 lg:grid-cols-12">
        <ul className="space-y-4 lg:col-span-8">
          {totals.lines.map((l) => (
            <CartItemRow
              key={`${l.productId}-${l.variantId ?? 'default'}`}
              line={l}
              stock={stockMap[l.productId] ?? 0}
            />
          ))}
        </ul>

        <aside className="lg:col-span-4">
          <div className="sticky top-6 rounded-2xl bg-white dark:bg-flora-900 dark:border dark:border-dust-50/10 p-6 shadow-[0_12px_32px_-12px_rgba(62,39,35,0.22)] dark:shadow-none">
            <h2 className="font-black text-soil-900 dark:text-dust-50">خلاصه سفارش</h2>
            <dl className="mt-4 space-y-3 text-sm text-soil-900 dark:text-dust-50">
              <div className="flex justify-between">
                <dt>جمع کالاها</dt>
                <dd>{formatToman(totals.subtotalToman)}</dd>
              </div>
              <div className="flex justify-between text-flora-700 dark:text-flora-300">
                <dt>خرید عمده و تخفیف پلکانی</dt>
                <dd>−{formatToman(totals.discountToman)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>وزن کل</dt>
                <dd>{formatWeight(totals.totalWeightGrams)}</dd>
              </div>
              <div className="flex justify-between border-t border-soil-900/10 dark:border-dust-50/10 pt-3 text-base font-black">
                <dt>قابل پرداخت</dt>
                <dd className="text-end">
                  <div>{formatToman(totals.payableToman)}</div>
                  {totals.payableToman >= 1000 && (
                    <div className="text-[11px] font-normal text-soil-700/70 dark:text-dust-200/70 mt-0.5">
                      ({numberToWordsFa(totals.payableToman)} تومان)
                    </div>
                  )}
                </dd>
              </div>
            </dl>
            <Link
              href="/checkout"
              className="mt-6 block rounded-xl bg-flora-900 text-white dark:bg-flora-500 dark:text-flora-950 dark:hover:bg-flora-700 px-6 py-3.5 text-center text-sm font-black transition-colors hover:bg-flora-700"
            >
              تکمیل خرید
            </Link>
            <div className="mt-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200/80 dark:border-amber-700/50 px-4 py-3 text-xs font-bold text-amber-700 dark:text-amber-300">
              📦 توجه: مرسولات فقط در روزهای <strong>یکشنبه</strong> و <strong>چهارشنبه</strong> ارسال می‌شوند.
            </div>
          </div>
        </aside>
      </div>
    </Container>
  );
}
