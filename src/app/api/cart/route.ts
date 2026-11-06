import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { addToCart, getCartTotals } from '@/lib/cart';

export const runtime = 'nodejs';

const colorOptionSchema = z.object({
  hexCode: z.string(),
  stock: z.coerce.number().int().min(0),
  priceAdjustment: z.coerce.number().int().default(0),
});

const addSchema = z.object({
  productId: z.string().cuid(),
  quantity: z.coerce.number().int().min(1).max(5000),
  color: z.union([z.string(), colorOptionSchema]).optional().nullable(),
  selectedColor: colorOptionSchema.optional().nullable(),
  bundleColors: z.record(z.string(), z.unknown()).optional().nullable(),
  colorAdjustment: z.coerce.number().int().optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: 'ابتدا وارد شوید' }, { status: 401 });
  }

  const totals = await getCartTotals(session.sub);
  return NextResponse.json(totals);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: 'ابتدا وارد شوید' }, { status: 401 });
  }

  const parsed = addSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: 'اطلاعات نامعتبر' }, { status: 400 });
  }

  try {
    const selectedColorObj =
      parsed.data.selectedColor ??
      (typeof parsed.data.color === 'object' && parsed.data.color !== null
        ? parsed.data.color
        : null);

    const colorHex =
      typeof parsed.data.color === 'string'
        ? parsed.data.color
        : selectedColorObj?.hexCode ?? null;

    let colorData: Record<string, unknown> | null = null;
    if (selectedColorObj) {
      colorData = {
        color: colorHex,
        selectedColor: selectedColorObj,
      };
    } else if (colorHex) {
      colorData = { color: colorHex };
    } else if (parsed.data.bundleColors) {
      colorData = { bundleColors: parsed.data.bundleColors };
    }

    await addToCart(
      session.sub,
      parsed.data.productId,
      parsed.data.quantity,
      colorData,
      colorHex,
      parsed.data.colorAdjustment,
    );
    const totals = await getCartTotals(session.sub);
    return NextResponse.json({ ok: true, totals });
  } catch (e) {
    return NextResponse.json(
      { message: e instanceof Error ? e.message : 'خطای غیرمنتظره' },
      { status: 400 },
    );
  }
}
