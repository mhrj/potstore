import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { addToCart } from '@/lib/cart';

export const runtime = 'nodejs';

const reorderSchema = z.object({
  orderId: z.string().min(1).max(64),
}).strict();

/**
 * Re-add every item from a past order into the user's cart.
 * Called from the dashboard via a plain HTML form POST.
 * Items whose product is missing or inactive are skipped silently.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.redirect(new URL('/login', req.url), { status: 303 });
  }

  const form = await req.formData();
  const parsed = reorderSchema.safeParse({ orderId: form.get('orderId') });
  if (!parsed.success) {
    return NextResponse.redirect(new URL('/dashboard', req.url), { status: 303 });
  }
  const { orderId } = parsed.data;

  const order = await prisma.order.findFirst({
    where: { id: orderId, userId: session.sub },
    select: {
      id: true,
      items: {
        select: {
          productId: true,
          quantity: true,
        },
      },
    },
  });

  if (!order) {
    return NextResponse.redirect(new URL('/dashboard', req.url), { status: 303 });
  }

  for (const item of order.items) {
    if (!item.productId) continue;
    try {
      await addToCart(session.sub, item.productId, item.quantity);
    } catch {
      // Skip products that are inactive or out of stock.
    }
  }

  return NextResponse.redirect(new URL('/cart', req.url), { status: 303 });
}
