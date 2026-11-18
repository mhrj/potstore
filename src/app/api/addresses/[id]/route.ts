import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { getSession } from '@/lib/auth';
import { normalizeAddressInput } from '@/lib/address';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> };

/**
 * Edit an address, or promote it to the default one.
 *
 * Ownership is checked with a `userId` filter rather than a post-fetch
 * comparison so a wrong id is indistinguishable from someone else's address.
 */
export async function PATCH(req: Request, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: 'ابتدا وارد شوید' }, { status: 401 });
  }

  const { id } = await params;

  const owned = await prisma.address.findFirst({
    where: { id, userId: session.sub },
    select: { id: true },
  });
  if (!owned) {
    return NextResponse.json({ message: 'آدرس یافت نشد' }, { status: 404 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ message: 'داده‌های آدرس نامعتبر است' }, { status: 400 });
  }

  try {
    const normalized = normalizeAddressInput(payload);

    const address = await prisma.$transaction(async (tx) => {
      if (normalized.isDefault) {
        await tx.address.updateMany({
          where: { userId: session.sub, isDefault: true, NOT: { id } },
          data: { isDefault: false },
        });
      }

      // Never leave the customer without a default address: demoting the only
      // default is ignored rather than silently creating a dangling state.
      const remainingDefaults = await tx.address.count({
        where: { userId: session.sub, isDefault: true, NOT: { id } },
      });
      const isDefault = normalized.isDefault || remainingDefaults === 0;

      return tx.address.update({
        where: { id },
        data: {
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
          isDefault,
        },
      });
    });

    return NextResponse.json({ ok: true, address });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: error.issues[0]?.message ?? 'داده‌های آدرس نامعتبر است' },
        { status: 400 },
      );
    }
    return NextResponse.json({ message: 'ویرایش آدرس ناموفق بود' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: 'ابتدا وارد شوید' }, { status: 401 });
  }

  const { id } = await params;

  const address = await prisma.address.findFirst({
    where: { id, userId: session.sub },
    select: { id: true, isDefault: true },
  });
  if (!address) {
    return NextResponse.json({ message: 'آدرس یافت نشد' }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.address.delete({ where: { id } });

    // Promote another address so checkout still has a default to preselect.
    if (address.isDefault) {
      const next = await tx.address.findFirst({
        where: { userId: session.sub },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      });
      if (next) {
        await tx.address.update({ where: { id: next.id }, data: { isDefault: true } });
      }
    }
  });

  return NextResponse.json({ ok: true });
}
