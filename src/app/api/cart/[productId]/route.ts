import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { getCartTotals } from '@/lib/cart';

export const runtime = 'nodejs';

const patchSchema = z.object({
  quantity: z.coerce.number().int().min(1).max(5000),
  variantId: z.string().optional().nullable(),
  selectedColorHex: z.string().optional().nullable(),
});

type Params = { params: Promise<{ productId: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: 'ابتدا وارد شوید' }, { status: 401 });
  }
  const { productId } = await params;
  const url = new URL(req.url);
  const variantIdParam = url.searchParams.get('variantId');
  const selectedColorHexParam = url.searchParams.get('selectedColorHex');

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: 'تعداد نامعتبر' }, { status: 400 });
  }
  const variantId = parsed.data.variantId ?? variantIdParam ?? null;
  const selectedColorHex = parsed.data.selectedColorHex ?? selectedColorHexParam ?? undefined;

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      stock: true,
      isActive: true,
      bundleSize: true,
      minOrderQuantity: true,
    },
  });
  if (!product || !product.isActive) {
    return NextResponse.json({ message: 'محصول یافت نشد' }, { status: 404 });
  }

  let availableStock = product.stock;
  if (variantId) {
    const v = await prisma.productVariant.findFirst({
      where: { id: variantId, productId },
      select: { stock: true },
    });
    if (v) availableStock = v.stock;
  }

  const bundleSize = product.bundleSize || 1;
  const isBundle = bundleSize > 1;
  const minQty = isBundle
    ? Math.max(product.minOrderQuantity || 1, bundleSize)
    : (product.minOrderQuantity || 1);

  if (parsed.data.quantity < minQty) {
    return NextResponse.json(
      { message: `حداقل تعداد سفارش برای این محصول ${minQty} عدد است` },
      { status: 400 },
    );
  }

  if (isBundle && parsed.data.quantity % bundleSize !== 0) {
    return NextResponse.json(
      { message: `تعداد سفارش باید مضربی از ${bundleSize} باشد` },
      { status: 400 },
    );
  }

  if (availableStock < parsed.data.quantity) {
    return NextResponse.json(
      { message: 'حداکثر موجودی: ' + availableStock + ' عدد' },
      { status: 409 },
    );
  }

  const updated = await prisma.cartItem.updateMany({
    where: {
      userId: session.sub,
      productId,
      variantId: variantId ? variantId : null,
      ...(selectedColorHex !== undefined ? { selectedColorHex: selectedColorHex || null } : {}),
    },
    data: { quantity: parsed.data.quantity },
  });
  if (updated.count === 0) {
    return NextResponse.json({ message: 'کالا در سبد یافت نشد' }, { status: 404 });
  }

  const totals = await getCartTotals(session.sub);
  return NextResponse.json({ ok: true, totals });
}

export async function DELETE(req: Request, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: 'ابتدا وارد شوید' }, { status: 401 });
  }
  const { productId } = await params;
  const url = new URL(req.url);
  const variantId = url.searchParams.get('variantId') || null;
  const selectedColorHex = url.searchParams.get('selectedColorHex');

  await prisma.cartItem.deleteMany({
    where: {
      userId: session.sub,
      productId,
      variantId: variantId ? variantId : null,
      ...(selectedColorHex !== null ? { selectedColorHex: selectedColorHex || null } : {}),
    },
  });

  const totals = await getCartTotals(session.sub);
  return NextResponse.json({ ok: true, totals });
}
