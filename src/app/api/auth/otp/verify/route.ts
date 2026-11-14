import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { toEn } from '@/lib/format';
import { createSessionCookie } from '@/lib/auth';
import { hashOtpCode, OTP_MAX_ATTEMPTS } from '@/lib/verification';

export const runtime = 'nodejs';

const otpVerifySchema = z
  .object({
    phone: z.string({ required_error: 'شماره موبایل الزامی است' }).trim().min(1, 'شماره موبایل الزامی است').max(30),
    code: z.string({ required_error: 'کد تایید الزامی است' }).trim().min(1, 'کد تایید الزامی است').max(10),
  })
  .strict();

export async function POST(req: Request) {
  try {
    const rawBody = await req.json().catch(() => null);
    const parsed = otpVerifySchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? 'اطلاعات ارسالی نامعتبر است.' },
        { status: 400 },
      );
    }

    const rawPhone = parsed.data.phone;
    const rawCode = parsed.data.code;

    const normalizedPhone = toEn(rawPhone).replace(/\s+/g, '');
    const normalizedCode = toEn(rawCode).replace(/\s+/g, '');

    if (!/^09\d{9}$/.test(normalizedPhone)) {
      return NextResponse.json(
        { message: 'شماره موبایل نامعتبر است (باید ۱۱ رقم و با ۰۹ شروع شود).' },
        { status: 400 },
      );
    }

    if (!/^\d{5}$/.test(normalizedCode)) {
      return NextResponse.json(
        { message: 'کد تایید باید ۵ رقم باشد.' },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { phone: normalizedPhone },
      select: { id: true, fullName: true, role: true, isActive: true },
    });

    if (!user) {
      return NextResponse.json(
        { message: 'این شماره در سیستم ثبت نشده است. لطفاً ابتدا ثبت‌نام کنید.' },
        { status: 404 },
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { message: 'حساب کاربری شما غیرفعال شده است.' },
        { status: 403 },
      );
    }

    const verification = await prisma.verificationCode.findFirst({
      where: {
        phone: normalizedPhone,
        type: 'LOGIN_OTP',
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!verification) {
      return NextResponse.json(
        { message: 'کد تایید منقضی شده یا نامعتبر است. لطفاً مجدداً درخواست دهید.' },
        { status: 400 },
      );
    }

    if (verification.attempts >= OTP_MAX_ATTEMPTS) {
      return NextResponse.json(
        { message: 'تعداد تلاش‌های مجاز به پایان رسید. لطفاً کد جدید دریافت کنید.' },
        { status: 429 },
      );
    }

    const expectedHash = hashOtpCode(normalizedCode);
    if (verification.codeHash !== expectedHash) {
      const newAttempts = verification.attempts + 1;
      await prisma.verificationCode.update({
        where: { id: verification.id },
        data: { attempts: newAttempts },
      });

      const remaining = OTP_MAX_ATTEMPTS - newAttempts;
      return NextResponse.json(
        {
          message:
            remaining > 0
              ? `کد وارد شده اشتباه است. (${remaining} تلاش باقی‌مانده)`
              : 'تعداد تلاش‌های مجاز به پایان رسید. لطفاً مجدداً کد درخواست کنید.',
        },
        { status: 400 },
      );
    }

    // Mark verification code as used
    await prisma.verificationCode.update({
      where: { id: verification.id },
      data: { usedAt: new Date() },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await createSessionCookie({
      id: user.id,
      role: user.role,
      fullName: user.fullName,
    });

    return NextResponse.json({
      ok: true,
      user: { id: user.id, fullName: user.fullName, role: user.role },
      redirectTo: user.role === 'ADMIN' ? '/admin' : '/dashboard',
    });
  } catch (error) {
    console.error('[otp/verify] Server error:', error);
    return NextResponse.json(
      { message: 'خطای سرور در تایید کد' },
      { status: 500 },
    );
  }
}
