import { z } from 'zod';
import { toEn } from '@/lib/format';

export const IRANIAN_MOBILE_REGEX = /^09(1[0-9]|2[0-9]|3[0-9]|9[0-9]|0[1-5]|41)\d{7}$/;

export const addressLabelSchema = z.enum(['HOME', 'WORK', 'OTHER']).default('HOME');

export const addressInputSchema = z
  .object({
    label: addressLabelSchema.optional(),
    fullName: z
      .string({ required_error: 'نام و نام خانوادگی الزامی است' })
      .trim()
      .min(2, 'نام و نام خانوادگی الزامی است')
      .max(80, 'نام کامل بیش از حد مجاز است'),
    phone: z.preprocess(
      (val) => (typeof val === 'string' ? toEn(val).trim() : val),
      z
        .string({ required_error: 'شماره موبایل الزامی است' })
        .trim()
        .min(1, 'شماره موبایل الزامی است')
        .regex(IRANIAN_MOBILE_REGEX, 'شماره موبایل وارد شده معتبر نیست'),
    ),
    province: z
      .string({ required_error: 'نام استان الزامی است' })
      .trim()
      .min(2, 'نام استان الزامی است'),
    provinceCode: z.preprocess((val) => {
      if (val === undefined || val === null || val === '') return null;
      const num = Number(val);
      return isNaN(num) ? null : num;
    }, z.number().int().nullable().optional()),
    city: z
      .string({ required_error: 'نام شهر الزامی است' })
      .trim()
      .min(2, 'نام شهر الزامی است'),
    cityCode: z.preprocess((val) => {
      if (val === undefined || val === null || val === '') return null;
      const num = Number(val);
      return isNaN(num) ? null : num;
    }, z.number().int().nullable().optional()),
    postalCode: z.preprocess(
      (val) => (typeof val === 'string' ? toEn(val).trim() : val),
      z
        .string({ required_error: 'کد پستی الزامی است' })
        .trim()
        .min(1, 'کد پستی الزامی است')
        .regex(/^\d{10}$/, 'کد پستی باید دقیقاً ۱۰ رقم باشد'),
    ),
    line1: z
      .string({ required_error: 'آدرس اصلی الزامی است' })
      .trim()
      .min(3, 'آدرس اصلی الزامی است'),
    line2: z.string().trim().max(200, 'آدرس تکمیلی بیش از حد مجاز است').optional().transform((value) => {
      if (!value) return null;
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    }),
    isDefault: z.boolean().optional().default(false),
  })
  .transform((value) => ({
    label: value.label ?? 'HOME',
    fullName: value.fullName.trim(),
    phone: value.phone.replace(/\s+/g, ''),
    province: value.province.trim(),
    provinceCode: value.provinceCode ?? null,
    city: value.city.trim(),
    cityCode: value.cityCode ?? null,
    postalCode: value.postalCode.replace(/\s+/g, ''),
    line1: value.line1.trim(),
    line2: value.line2 && value.line2.trim() ? value.line2.trim() : null,
    isDefault: !!value.isDefault,
  }));

export type AddressInput = z.infer<typeof addressInputSchema>;

export function normalizeAddressInput(input: unknown): AddressInput {
  return addressInputSchema.parse(input);
}
