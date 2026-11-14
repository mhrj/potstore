import { requireUser } from '@/lib/auth';
import { getCartTotals } from '@/lib/cart';
import { prisma } from '@/lib/prisma';
import { CartView } from '@/features/checkout';

export default async function CartPage() {
  const user = await requireUser();
  const totals = await getCartTotals(user.id);

  const stocks =
    totals.lines.length > 0
      ? await prisma.product.findMany({
          where: { id: { in: totals.lines.map((l) => l.productId) } },
          select: { id: true, stock: true },
        })
      : [];

  const stockMap = Object.fromEntries(stocks.map((s) => [s.id, s.stock]));

  return <CartView totals={totals} stockMap={stockMap} />;
}