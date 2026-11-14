import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getActiveAdmin } from '@/lib/auth';

type Params = { params: Promise<{ id: string }> };

const userPatchSchema = z
  .object({
    role: z.enum(['ADMIN', 'CUSTOMER']).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export async function PATCH(request: Request, { params }: Params) {
  const admin = await getActiveAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'دسترسی غیرمجاز است.' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const rawBody = await request.json().catch(() => null);
    const parsed = userPatchSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'اطلاعات ارسالی نامعتبر است.' },
        { status: 400 },
      );
    }
    const { role, isActive } = parsed.data;

    // Prevent modifying self
    if (id === admin.sub) {
      return NextResponse.json(
        { error: 'امکان تغییر نقش یا وضعیت حساب جاری شما وجود ندارد.' },
        { status: 400 },
      );
    }

    const data: { role?: 'ADMIN' | 'CUSTOMER'; isActive?: boolean } = {};

    if (role !== undefined) {
      data.role = role;
    }

    if (isActive !== undefined) {
      data.isActive = isActive;
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        fullName: true,
        phone: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    return NextResponse.json({ user });
  } catch (err) {
    console.error('Error updating user:', err);
    return NextResponse.json(
      { error: 'خطایی در بروزرسانی کاربر رخ داد.' },
      { status: 500 },
    );
  }
}
