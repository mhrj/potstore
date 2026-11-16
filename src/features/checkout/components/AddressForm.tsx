'use client';

import { useState, useTransition } from 'react';
import Select from '@/components/ui/Select';
import ProvinceCitySelect from '@/components/ui/ProvinceCitySelect';
import { FormError } from '@/components/ui/FormError';
import { IRANIAN_MOBILE_REGEX } from '@/lib/address';
import { saveAddressAction } from '@/features/checkout/actions/address-actions';

export type AddressRecord = {
  id: string;
  label: 'HOME' | 'WORK' | 'OTHER';
  fullName: string;
  phone: string;
  province: string;
  city: string;
  postalCode: string;
  line1: string;
  line2: string | null;
  isDefault: boolean;
};

const EMPTY_FORM = {
  label: 'HOME',
  fullName: '',
  phone: '',
  province: 'تهران',
  city: 'تهران',
  postalCode: '',
  line1: '',
  line2: '',
  isDefault: false,
};

type FormState = typeof EMPTY_FORM;

function toFormState(address?: AddressRecord): FormState {
  if (!address) return { ...EMPTY_FORM };
  return {
    label: address.label,
    fullName: address.fullName,
    phone: address.phone,
    province: address.province,
    city: address.city,
    postalCode: address.postalCode,
    line1: address.line1,
    line2: address.line2 ?? '',
    isDefault: address.isDefault,
  };
}

/**
 * Persian (۰-۹) and Arabic-Indic (٠-٩) digits are the ones a Persian keyboard
 * actually produces, so they are translated to ASCII before everything that is
 * not a digit is dropped.
 */
const DIGIT_TRANSLATIONS: Record<string, string> = {
  '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
  '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
};

export function toDigitsOnly(value: string): string {
  return value
    .replace(/[۰-۹٠-٩]/g, (digit) => DIGIT_TRANSLATIONS[digit] ?? digit)
    .replace(/\D+/g, '');
}

/**
 * Create/edit form for a shipping address.
 */
export default function AddressForm({
  address,
  onSaved,
  onCancel,
  idPrefix = 'address',
}: {
  address?: AddressRecord;
  onSaved: (address: AddressRecord) => void;
  onCancel?: () => void;
  idPrefix?: string;
}) {
  const editing = Boolean(address);
  const [form, setForm] = useState<FormState>(() => toFormState(address));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const target = event.target as HTMLInputElement;
    const name = target.name;
    let value: string | boolean =
      target.type === 'checkbox' ? target.checked : target.value;

    if (typeof value === 'string' && (name === 'phone' || name === 'postalCode')) {
      value = toDigitsOnly(value);
      if (name === 'phone') value = value.slice(0, 11);
      if (name === 'postalCode') value = value.slice(0, 10);
    }

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    if (name === 'phone') {
      setPhoneError(null);
    }

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    let hasPhoneError = false;
    if (!form.phone.trim() || !IRANIAN_MOBILE_REGEX.test(form.phone.trim())) {
      setPhoneError('شماره موبایل وارد شده معتبر نیست');
      hasPhoneError = true;
    } else {
      setPhoneError(null);
    }

    const newErrors: Record<string, string> = {};

    if (!form.fullName.trim()) {
      newErrors.fullName = 'نام و نام خانوادگی الزامی است';
    } else if (form.fullName.trim().length < 2) {
      newErrors.fullName = 'نام و نام خانوادگی باید حداقل ۲ کاراکتر باشد';
    }

    if (!form.province.trim()) {
      newErrors.province = 'نام استان الزامی است';
    }

    if (!form.city.trim()) {
      newErrors.city = 'نام شهر الزامی است';
    }

    if (!form.postalCode.trim()) {
      newErrors.postalCode = 'کد پستی الزامی است';
    } else if (!/^\d{10}$/.test(form.postalCode.trim())) {
      newErrors.postalCode = 'کد پستی باید دقیقاً ۱۰ رقم باشد';
    }

    if (!form.line1.trim()) {
      newErrors.line1 = 'آدرس دقیق الزامی است';
    } else if (form.line1.trim().length < 3) {
      newErrors.line1 = 'آدرس دقیق باید حداقل ۳ کاراکتر باشد';
    }

    if (hasPhoneError || Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    startTransition(async () => {
      const res = await saveAddressAction(form, address?.id);
      if (!res.success) {
        setError(res.error);
        return;
      }

      onSaved(res.address as AddressRecord);
      if (!editing) setForm({ ...EMPTY_FORM });
    });
  };

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border border-soil-900/10 dark:border-dust-50/10 bg-white dark:bg-flora-900 p-5"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-soil-900 dark:text-dust-50">
          {editing ? 'ویرایش آدرس' : 'افزودن آدرس جدید'}
        </h3>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="block">
          <label htmlFor={`${idPrefix}-fullName`} className="block text-xs font-bold text-soil-700/80 dark:text-dust-200">
            نام و نام خانوادگی
            <span className="text-red-500 ms-0.5">*</span>
          </label>
          <input
            id={`${idPrefix}-fullName`}
            name="fullName"
            value={form.fullName}
            onChange={handleChange}
            className={`mt-1 w-full rounded-xl border bg-dust-50 dark:bg-flora-950 px-3 py-2.5 text-sm text-soil-900 dark:text-dust-50 dark:placeholder:text-dust-400 outline-none transition ${
              errors.fullName
                ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                : 'border-soil-900/10 dark:border-dust-50/20 focus:border-flora-500 focus:dark:border-flora-500'
            }`}
            placeholder="مثلاً مریم رضایی"
          />
          <FormError message={errors.fullName} />
        </div>

        <div className="block">
          <label htmlFor={`${idPrefix}-phone`} className="block text-xs font-bold text-soil-700/80 dark:text-dust-200">
            شماره همراه
            <span className="text-red-500 ms-0.5">*</span>
          </label>
          <input
            id={`${idPrefix}-phone`}
            name="phone"
            value={form.phone}
            onChange={handleChange}
            dir="ltr"
            type="tel"
            maxLength={11}
            inputMode="numeric"
            className={`mt-1 w-full rounded-xl border bg-dust-50 dark:bg-flora-950 px-3 py-2.5 text-sm text-soil-900 dark:text-dust-50 dark:placeholder:text-dust-400 outline-none transition ${
              phoneError
                ? 'border-red-500 focus:ring-red-500'
                : 'border-soil-900/10 dark:border-dust-50/20 focus:border-flora-500 focus:dark:border-flora-500'
            }`}
            placeholder="09121234567"
          />
          {phoneError && <p className="mt-1 text-xs font-bold text-red-600 dark:text-red-400">{phoneError}</p>}
        </div>

        <div className="sm:col-span-2">
          <ProvinceCitySelect
            idPrefix={`${idPrefix}-region`}
            value={{ province: form.province, city: form.city }}
            onChange={(val) => {
              setForm((current) => ({
                ...current,
                province: val.province,
                city: val.city,
              }));
              if (errors.province && val.province) {
                setErrors((prev) => ({ ...prev, province: '' }));
              }
              if (errors.city && val.city) {
                setErrors((prev) => ({ ...prev, city: '' }));
              }
            }}
            required
            provinceLabel="استان"
            cityLabel="شهر"
            provincePlaceholder="انتخاب استان"
            cityPlaceholder="انتخاب شهر"
            errorProvince={errors.province}
            errorCity={errors.city}
          />
        </div>

        <div className="block">
          <label htmlFor={`${idPrefix}-postalCode`} className="block text-xs font-bold text-soil-700/80 dark:text-dust-200">
            کد پستی
            <span className="text-red-500 ms-0.5">*</span>
          </label>
          <input
            id={`${idPrefix}-postalCode`}
            name="postalCode"
            value={form.postalCode}
            onChange={handleChange}
            dir="ltr"
            maxLength={10}
            inputMode="numeric"
            className={`mt-1 w-full rounded-xl border bg-dust-50 dark:bg-flora-950 px-3 py-2.5 text-sm text-soil-900 dark:text-dust-50 dark:placeholder:text-dust-400 outline-none transition ${
              errors.postalCode
                ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                : 'border-soil-900/10 dark:border-dust-50/20 focus:border-flora-500 focus:dark:border-flora-500'
            }`}
            placeholder="1234567890"
          />
          <FormError message={errors.postalCode} />
        </div>

        <div className="block">
          <label htmlFor={`${idPrefix}-label`} className="block text-xs font-bold text-soil-700/80 dark:text-dust-200">
            برچسب آدرس
          </label>
          <Select
            id={`${idPrefix}-label`}
            name="label"
            value={form.label}
            onChange={handleChange}
            containerClassName="mt-1"
          >
            <option value="HOME">خانه</option>
            <option value="WORK">محل کار</option>
            <option value="OTHER">سایر</option>
          </Select>
        </div>
      </div>

      <div className="block">
        <label htmlFor={`${idPrefix}-line1`} className="block text-xs font-bold text-soil-700/80 dark:text-dust-200">
          آدرس دقیق
          <span className="text-red-500 ms-0.5">*</span>
        </label>
        <input
          id={`${idPrefix}-line1`}
          name="line1"
          value={form.line1}
          onChange={handleChange}
          className={`mt-1 w-full rounded-xl border bg-dust-50 dark:bg-flora-950 px-3 py-2.5 text-sm text-soil-900 dark:text-dust-50 dark:placeholder:text-dust-400 outline-none transition ${
            errors.line1
              ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
              : 'border-soil-900/10 dark:border-dust-50/20 focus:border-flora-500 focus:dark:border-flora-500'
          }`}
          placeholder="خیابان ولیعصر، کوچه ..."
        />
        <FormError message={errors.line1} />
      </div>

      <div className="block">
        <label htmlFor={`${idPrefix}-line2`} className="block text-xs font-bold text-soil-700/80 dark:text-dust-200">
          واحد / پلاک / توضیحات بیشتر
        </label>
        <input
          id={`${idPrefix}-line2`}
          name="line2"
          value={form.line2}
          onChange={handleChange}
          className="mt-1 w-full rounded-xl border border-soil-900/10 dark:border-dust-50/20 bg-dust-50 dark:bg-flora-950 px-3 py-2.5 text-sm text-soil-900 dark:text-dust-50 dark:placeholder:text-dust-400 outline-none transition focus:border-flora-500 focus:dark:border-flora-500"
          placeholder="پلاک ۱۲، طبقه ۳"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          id={`${idPrefix}-isDefault`}
          type="checkbox"
          name="isDefault"
          checked={form.isDefault}
          onChange={handleChange}
          className="h-4 w-4 accent-flora-700"
        />
        <label htmlFor={`${idPrefix}-isDefault`} className="text-xs font-bold text-soil-700/80 dark:text-dust-200 cursor-pointer">
          این آدرس پیش‌فرض باشد
        </label>
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/40 px-3 py-2 text-xs font-bold text-red-700 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 rounded-2xl bg-flora-900 text-white dark:bg-flora-500 dark:text-flora-950 dark:hover:bg-flora-700 px-6 py-3 text-sm font-black transition-colors hover:bg-flora-700 disabled:opacity-60 cursor-pointer"
        >
          {isPending ? 'در حال ذخیره…' : editing ? 'ثبت تغییرات' : 'ذخیره آدرس'}
        </button>
        {editing && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-2xl border border-soil-900/10 dark:border-dust-50/20 px-6 py-3 text-sm font-bold text-soil-900 dark:text-dust-50 transition-colors hover:bg-dust-50 dark:hover:bg-flora-950"
          >
            انصراف
          </button>
        )}
      </div>


    </form>
  );
}
