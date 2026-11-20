import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { formatToman, toFa } from '@/lib/format';
import {
  getTapinCredit,
  getTapinTransactions,
  mapTapinPayType,
  mapTapinStatus,
  type TapinCreditResult,
  type TapinTransactionsResult,
} from '@/lib/providers/shipping/tapin/financial';

type Props = {
  searchParams: Promise<{ page?: string }>;
};

function formatPersianDateTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return toFa(dateStr);
    return new Intl.DateTimeFormat('fa-IR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(d);
  } catch {
    return toFa(dateStr);
  }
}

export default async function TapinFinancialPage({ searchParams }: Props) {
  await requireAdmin();

  const { page: rawPage } = await searchParams;
  const page = Math.max(1, parseInt(rawPage || '1', 10) || 1);
  const pageSize = 10;

  let creditData: TapinCreditResult | null = null;
  let transactionsData: TapinTransactionsResult | null = null;
  let creditError: string | null = null;
  let transactionsError: string | null = null;

  const [creditResult, transactionsResult] = await Promise.allSettled([
    getTapinCredit(),
    getTapinTransactions(page, pageSize),
  ]);

  if (creditResult.status === 'fulfilled') {
    creditData = creditResult.value;
  } else {
    creditError = creditResult.reason instanceof Error
      ? creditResult.reason.message
      : 'خطا در دریافت موجودی تاپین';
  }

  if (transactionsResult.status === 'fulfilled') {
    transactionsData = transactionsResult.value;
  } else {
    transactionsError = transactionsResult.reason instanceof Error
      ? transactionsResult.reason.message
      : 'خطا در دریافت لیست تراکنش‌ها';
  }

  const transactions = transactionsData?.list ?? [];
  const totalCount = transactionsData?.total_count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const hasPagination = totalCount > pageSize;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-black text-soil-900 dark:text-dust-50">مالی تاپین</h1>
        <p className="mt-2 text-sm text-soil-700/70 dark:text-dust-200/70">
          مشاهده و مدیریت اعتبار کیف پول و صورت‌حساب تراکنش‌های پستی تاپین
        </p>
      </div>

      {/* Credit Overview Card */}
      <section className="rounded-2xl border border-soil-900/10 dark:border-dust-50/10 bg-white dark:bg-flora-950 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-soil-700/70 dark:text-dust-200/70">
              اعتبار کیف پول تاپین (موجودی حساب پستی)
            </span>

            {creditError ? (
              <div className="mt-2 text-sm font-bold text-amber-700 dark:text-amber-400">
                ⚠️ {creditError}
              </div>
            ) : (
              <div className="mt-3 flex items-baseline gap-2">
                <span className="font-mono text-3xl font-black text-flora-900 dark:text-flora-300">
                  {formatToman(creditData?.creditToman ?? 0)}
                </span>
                <span className="text-sm font-bold text-soil-700/80 dark:text-dust-200/80">
                  تومان
                </span>
                <span className="ms-2 font-mono text-xs text-soil-700/50 dark:text-dust-300/50" dir="ltr">
                  ({toFa((creditData?.credit ?? 0).toLocaleString('en-US'))} ریال)
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center rounded-xl bg-flora-100 dark:bg-flora-900/70 px-3 py-1.5 text-xs font-bold text-flora-800 dark:text-flora-200 border border-flora-300 dark:border-flora-700">
              💳 درگاه متصل تاپین
            </span>
          </div>
        </div>
      </section>

      {/* Transactions Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-soil-900 dark:text-dust-50">
            تراکنش‌های افزایش اعتبار
          </h2>
          {totalCount > 0 && (
            <span className="text-xs text-soil-700/70 dark:text-dust-200/70">
              {toFa(totalCount)} تراکنش ثبت‌شده
            </span>
          )}
        </div>

        {transactionsError ? (
          <div className="rounded-2xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/40 p-6 text-center text-sm font-bold text-red-700 dark:text-red-300">
            {transactionsError}
          </div>
        ) : transactions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-soil-900/15 dark:border-dust-50/20 bg-white/50 dark:bg-flora-950/30 p-12 text-center text-sm text-soil-700/70 dark:text-dust-200/70">
            هنوز تراکنشی ثبت نشده است.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-soil-900/10 dark:border-dust-50/10 bg-white dark:bg-flora-900">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-dust-50 dark:bg-flora-950 text-soil-700/70 dark:text-dust-200/70">
                  <tr>
                    <th className="px-4 py-3.5 text-start font-medium">شناسه تراکنش</th>
                    <th className="px-4 py-3.5 text-start font-medium">تاریخ و زمان</th>
                    <th className="px-4 py-3.5 text-start font-medium">مبلغ</th>
                    <th className="px-4 py-3.5 text-start font-medium">نوع پرداخت</th>
                    <th className="px-4 py-3.5 text-start font-medium">وضعیت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-soil-900/5 dark:divide-dust-50/10">
                  {transactions.map((tx) => {
                    const statusInfo = mapTapinStatus(tx.status, tx.statusDescription);
                    return (
                      <tr key={tx.id} className="hover:bg-dust-50/50 dark:hover:bg-flora-950/40 transition">
                        {/* Transaction ID */}
                        <td className="px-4 py-3.5 font-mono text-xs text-soil-900 dark:text-dust-100">
                          <span title={tx.id} dir="ltr" className="select-all">
                            {tx.id.length > 18 ? `${tx.id.slice(0, 18)}…` : tx.id}
                          </span>
                        </td>

                        {/* Date */}
                        <td className="px-4 py-3.5 text-xs text-soil-700/80 dark:text-dust-200/80">
                          {formatPersianDateTime(tx.createdAt)}
                        </td>

                        {/* Amount */}
                        <td className="px-4 py-3.5 font-bold text-soil-900 dark:text-dust-50">
                          {formatToman(tx.priceToman)}{' '}
                          <span className="text-[11px] font-normal text-soil-700/60 dark:text-dust-300/60">
                            تومان
                          </span>
                        </td>

                        {/* Payment Type */}
                        <td className="px-4 py-3.5 text-xs text-soil-800 dark:text-dust-200">
                          {mapTapinPayType(tx.payType, tx.payTypeDescription)}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5">
                          <span
                            className={
                              'inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-bold border ' +
                              (statusInfo.isSuccess
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                                : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800')
                            }
                          >
                            {statusInfo.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {hasPagination && (
              <div className="flex items-center justify-between border-t border-soil-900/10 dark:border-dust-50/10 px-4 py-3 text-xs">
                <span className="text-soil-700/70 dark:text-dust-200/70">
                  صفحه {toFa(page)} از {toFa(totalPages)}
                </span>
                <div className="flex items-center gap-2">
                  {page > 1 ? (
                    <Link
                      href={`/admin/tapin-financial?page=${page - 1}`}
                      className="rounded-lg border border-soil-900/15 dark:border-dust-50/15 px-3 py-1.5 font-bold text-soil-900 dark:text-dust-50 hover:bg-dust-100 dark:hover:bg-flora-950 transition"
                    >
                      قبلی
                    </Link>
                  ) : (
                    <span className="rounded-lg border border-soil-900/10 dark:border-dust-50/10 px-3 py-1.5 text-soil-700/30 dark:text-dust-400/30 cursor-not-allowed">
                      قبلی
                    </span>
                  )}

                  {page < totalPages ? (
                    <Link
                      href={`/admin/tapin-financial?page=${page + 1}`}
                      className="rounded-lg border border-soil-900/15 dark:border-dust-50/15 px-3 py-1.5 font-bold text-soil-900 dark:text-dust-50 hover:bg-dust-100 dark:hover:bg-flora-950 transition"
                    >
                      بعدی
                    </Link>
                  ) : (
                    <span className="rounded-lg border border-soil-900/10 dark:border-dust-50/10 px-3 py-1.5 text-soil-700/30 dark:text-dust-400/30 cursor-not-allowed">
                      بعدی
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

