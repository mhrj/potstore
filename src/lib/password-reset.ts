import crypto from 'node:crypto';
import nodemailer from 'nodemailer';
import { getEnv } from '@/lib/env';

export type ResetEmailPayload = {
  to: string;
  resetUrl: string;
};

export async function createResetToken() {
  return crypto.randomBytes(32).toString('hex');
}

export function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function isPasswordResetTokenValid(tokenEntry: {
  usedAt: Date | null;
  expiresAt: Date;
} | null) {
  return !!tokenEntry && !tokenEntry.usedAt && tokenEntry.expiresAt.getTime() > Date.now();
}

export function getRecoverySupportMessage() {
  const contact = getEnv('SUPPORT_CONTACT');
  const supportUrl = getEnv('SUPPORT_URL');

  if (contact) {
    return `برای بازیابی رمز عبور، لطفاً از ${contact} استفاده کنید.`;
  }

  if (supportUrl) {
    return `برای بازیابی رمز عبور، لطفاً از مسیر پشتیبانی فروشگاه (${supportUrl}) استفاده کنید.`;
  }

  return 'برای بازیابی رمز عبور، لطفاً با پشتیبانی فروشگاه تماس بگیرید.';
}

export function isEmailDeliveryConfigured() {
  return !!(getEnv('SMTP_HOST') && getEnv('SMTP_USER') && getEnv('SMTP_PASS'));
}

function createTransporter() {
  const host = getEnv('SMTP_HOST');
  const port = parseInt(getEnv('SMTP_PORT', '587'), 10);
  const secureEnv = getEnv('SMTP_SECURE');
  const secure = secureEnv ? secureEnv === 'true' : port === 465;
  const user = getEnv('SMTP_USER');
  const pass = getEnv('SMTP_PASS');

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });
}

function renderPasswordResetEmail(resetUrl: string) {
  const html = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>بازیابی رمز عبور - پات استور</title>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #f7f5f2; font-family: Tahoma, Segoe UI, Arial, sans-serif; direction: rtl; text-align: right; color: #2d2422;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #ede8e3; box-shadow: 0 4px 16px rgba(0,0,0,0.04); overflow: hidden;">
    <tr>
      <td style="padding: 32px 28px; background: linear-gradient(135deg, #1b4332 0%, #2d6a4f 100%); text-align: center;">
        <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: bold;">پات استور</h1>
        <p style="margin: 8px 0 0 0; color: #d8f3dc; font-size: 14px;">فروشگاه تخصصی گلدان و سفال</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px 28px;">
        <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #1b4332;">درخواست بازیابی رمز عبور</h2>
        <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.8; color: #4a3b32;">
          کاربر گرامی،<br>
          درخواست بازیابی رمز عبور برای حساب کاربری شما در <strong>پات استور</strong> ثبت شده است. برای تعیین رمز عبور جدید، لطفاً روی دکمه زیر کلیک کنید:
        </p>

        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetUrl}" target="_blank" style="display: inline-block; background-color: #1b4332; color: #ffffff; font-size: 15px; font-weight: bold; text-decoration: none; padding: 14px 32px; border-radius: 12px; box-shadow: 0 4px 12px rgba(27,67,50,0.25);">
            تغییر رمز عبور
          </a>
        </div>

        <div style="background-color: #fdf8f5; border: 1px solid #fae8df; border-radius: 10px; padding: 14px 16px; margin: 24px 0 16px 0;">
          <p style="margin: 0; font-size: 13px; color: #8d4f38; line-height: 1.6;">
            ⏱ <strong>نکته مهم:</strong> این لینک به مدت <strong>۶۰ دقیقه</strong> معتبر است و پس از یک‌بار استفاده منقضی می‌شود.
          </p>
        </div>

        <p style="margin: 0 0 16px 0; font-size: 13px; line-height: 1.7; color: #726259;">
          اگر شما این درخواست را ثبت نکرده‌اید، لطفاً این ایمیل را نادیده بگیرید. رمز عبور شما بدون تغییر باقی خواهد ماند و هیچ خطری حساب شما را تهدید نمی‌کند.
        </p>

        <hr style="border: none; border-top: 1px solid #f0eae4; margin: 24px 0;">

        <p style="margin: 0; font-size: 12px; color: #9c8e85; line-height: 1.6;">
          اگر دکمه بالا کار نمی‌کند، آدرس زیر را کپی کرده و در مرورگر خود باز کنید:<br>
          <a href="${resetUrl}" style="color: #2d6a4f; word-break: break-all; direction: ltr; display: inline-block; text-align: left; margin-top: 6px;">${resetUrl}</a>
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 20px 28px; background-color: #fbf9f7; border-top: 1px solid #ede8e3; text-align: center;">
        <p style="margin: 0; font-size: 12px; color: #9c8e85;">
          این یک پیام خودکار است؛ لطفاً به این ایمیل پاسخ ندهید.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `پات استور - بازیابی رمز عبور

کاربر گرامی،
درخواست بازیابی رمز عبور برای حساب کاربری شما در پات استور ثبت شده است.

برای تغییر رمز عبور خود روی لینک زیر کلیک کنید (این لینک به مدت ۶۰ دقیقه معتبر است):
${resetUrl}

اگر شما این درخواست را ثبت نکرده‌اید، لطفاً این ایمیل را نادیده بگیرید؛ رمز عبور شما تغییری نخواهد کرد.

پات استور - فروشگاه تخصصی گلدان و سفال`;

  return { html, text };
}

export async function sendPasswordResetEmail(payload: ResetEmailPayload) {
  if (!isEmailDeliveryConfigured()) {
    console.info('[password-reset] SMTP not configured; skipping outbound message');
    return { queued: false, reason: 'not-configured' } as const;
  }

  const from = getEnv('EMAIL_FROM', 'پات استور <no-reply@localhost>');
  const transporter = createTransporter();
  const { html, text } = renderPasswordResetEmail(payload.resetUrl);

  await transporter.sendMail({
    from,
    to: payload.to,
    subject: 'بازیابی رمز عبور - فروشگاه پات استور',
    html,
    text,
  });

  return { queued: true, reason: 'sent' } as const;
}
