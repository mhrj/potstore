import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { getSession } from '@/lib/auth';
import { normalizeAddressInput } from '@/lib/address';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

/** The signed-in customer's own addresses, default first. */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: 'ابتدا وارد شوید' }, { status: 401 });
  }

  const addresses = await prisma.address.findMany({
    where: { userId: session.sub },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
  });

  return NextResponse.json({ ok: true, addresses });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: 'ابتدا وارد شوید' }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ message: 'داده‌های آدرس نامعتبر است' }, { status: 400 });
  }

  try {
    const normalized = normalizeAddressInput(payload);
    const existing = await prisma.address.findMany({ where: { userId: session.sub } });
    const shouldDefault = normalized.isDefault || existing.length === 0;

    if (shouldDefault) {
      await prisma.address.updateMany({
        where: { userId: session.sub, isDefault: true },
        data: { isDefault: false },
      });
    }

    const address = await prisma.address.create({
      data: {
        userId: session.sub,
        label: normalized.label,
        fullName: normalized.fullName,
        phone: normalized.phone,
        province: normalized.province,
        provinceCode: normalized.provinceCode,
        city: normalized.city,
        cityCode: normalized.cityCode,
        postalCode: normalized.postalCode,
        line1: normalized.line1,
        line2: normalized.line2,
        isDefault: shouldDefault,
      },
    });

    return NextResponse.json({ ok: true, address });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: error.issues[0]?.message ?? 'داده‌های آدرس نامعتبر است' },
        { status: 400 },
      );
    }

    return NextResponse.json({ message: 'ثبت آدرس ناموفق بود' }, { status: 500 });
  }
}
