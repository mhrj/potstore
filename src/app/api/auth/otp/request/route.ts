import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { toEn } from '@/lib/format';
import { sendVerificationSms } from '@/lib/sms';
import {
  generateOtpCode,
  hashOtpCode,
  OTP_EXPIRATION_SECONDS,
  OTP_RATE_LIMIT_SECONDS,
} from '@/lib/verification';

export const runtime = 'nodejs';

const otpRequestSchema = z
  .object({
    phone: z.string({ required_error: 'شماره موبایل را وارد کنید' }).trim().min(1, 'شماره موبایل را وارد کنید').max(30),
  })
  .strict();

export async function POST(req: Request) {
  try {
    const rawBody = await req.json().catch(() => null);
    const parsed = otpRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? 'اطلاعات ارسالی نامعتبر است.' },
        { status: 400 },
      );
    }

    const rawPhone = parsed.data.phone;

    if (rawPhone.includes('@')) {
      return NextResponse.json(
        { message: 'برای ورود با پیامک، فقط شماره موبایل را وارد کنید.' },
        { status: 400 },
      );
    }

    const normalizedPhone = toEn(rawPhone).replace(/\s+/g, '');

    if (!/^09\d{9}$/.test(normalizedPhone)) {
      return NextResponse.json(
        { message: 'شماره موبایل نامعتبر است (باید ۱۱ رقم و با ۰۹ شروع شود).' },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { phone: normalizedPhone },
      select: { id: true, phone: true, isActive: true },
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

    // Rate limiting: 1 request per OTP_RATE_LIMIT_SECONDS (120s)
    const rateLimitWindow = new Date(Date.now() - OTP_RATE_LIMIT_SECONDS * 1000);
    const recentRequest = await prisma.verificationCode.findFirst({
      where: {
        phone: normalizedPhone,
        type: 'LOGIN_OTP',
        createdAt: { gte: rateLimitWindow },
      },
    });

    if (recentRequest) {
      const elapsedSeconds = Math.floor((Date.now() - recentRequest.createdAt.getTime()) / 1000);
      const remainingSeconds = Math.max(1, OTP_RATE_LIMIT_SECONDS - elapsedSeconds);
      return NextResponse.json(
        {
          message: `لطفاً پیش از درخواست مجدد، ${remainingSeconds} ثانیه صبر کنید.`,
          remainingSeconds,
        },
        { status: 429 },
      );
    }

    // Invalidate active previous OTPs
    await prisma.verificationCode.updateMany({
      where: {
        phone: normalizedPhone,
        type: 'LOGIN_OTP',
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });

    const code = generateOtpCode();
    const codeHash = hashOtpCode(code);
    const expiresAt = new Date(Date.now() + OTP_EXPIRATION_SECONDS * 1000);

    await prisma.verificationCode.create({
      data: {
        phone: normalizedPhone,
        codeHash,
        type: 'LOGIN_OTP',
        expiresAt,
        userId: user.id,
      },
    });

    const smsResult = await sendVerificationSms(normalizedPhone, code);
    if (!smsResult.success) {
      console.warn(`[otp] Failed to send SMS to ${normalizedPhone}:`, smsResult.error);
    }

    return NextResponse.json({
      ok: true,
      message: 'کد تایید ۵ رقمی به شماره شما پیامک شد.',
      expiresInSeconds: OTP_EXPIRATION_SECONDS,
    });
  } catch (error) {
    console.error('[otp/request] Server error:', error);
    return NextResponse.json(
      { message: 'خطای سرور در ارسال پیامک' },
      { status: 500 },
    );
  }
}
