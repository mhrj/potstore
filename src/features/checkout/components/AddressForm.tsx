'use client';

import { useState, useTransition, useMemo } from 'react';
import Select from '@/components/ui/Select';
import SearchableCombobox, { type ComboboxOption } from '@/components/ui/SearchableCombobox';
import type { TapinProvince } from '@/lib/providers/shipping/tapin/locations';
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
  provinceCode?: number | string | null;
  cityCode?: number | string | null;
  postalCode: string;
  line1: string;
  line2: string | null;
  isDefault: boolean;
};

const EMPTY_FORM = {
  label: 'HOME' as 'HOME' | 'WORK' | 'OTHER',
  fullName: '',
  phone: '',
  province: '',
  city: '',
  provinceCode: undefined as number | string | undefined,
  cityCode: undefined as number | string | undefined,
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
    provinceCode: address.provinceCode ?? undefined,
    cityCode: address.cityCode ?? undefined,
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
 * Create/edit form for a shipping address using live Tapin locations.
 */
export default function AddressForm({
  address,
  onSaved,
  onCancel,
  idPrefix = 'address',
  locations = [],
  provinces,
}: {
  address?: AddressRecord;
  onSaved: (address: AddressRecord) => void;
  onCancel?: () => void;
  idPrefix?: string;
  locations?: TapinProvince[];
  provinces?: TapinProvince[];
}) {
  const locList = useMemo(() => {
    if (locations && locations.length > 0) return locations;
    if (provinces && provinces.length > 0) return provinces;
    return [];
  }, [locations, provinces]);

  const editing = Boolean(address);
  const [form, setForm] = useState<FormState>(() => toFormState(address));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Resolve active province object (by provinceCode or by matching title for edit flow)
  const selectedProvince = useMemo(() => {
    if (form.provinceCode !== undefined && form.provinceCode !== null && form.provinceCode !== '') {
      const match = locList.find((l) => String(l.code) === String(form.provinceCode));
      if (match) return match;
    }
    if (form.province) {
      const match = locList.find((l) => l.title === form.province);
      if (match) return match;
    }
    return null;
  }, [locList, form.provinceCode, form.province]);

  // Province options for SearchableCombobox
  const provinceOptions: ComboboxOption[] = useMemo(() => {
    return locList.map((l) => ({
      value: l.code,
      label: l.title,
    }));
  }, [locList]);

  // City options filtered based on selected province
  const cityOptions: ComboboxOption[] = useMemo(() => {
    if (!selectedProvince) return [];
    const opts: ComboboxOption[] = selectedProvince.cities.map((c) => ({
      value: c.code,
      label: c.title,
    }));
    // If editing legacy address whose city is not present in Tapin city tree, keep it as an option
    if (form.city && !opts.some((o) => o.label === form.city)) {
      opts.push({
        value: form.city,
        label: form.city,
      });
    }
    return opts;
  }, [selectedProvince, form.city]);

  const handleProvinceChange = (val: string | number, opt: ComboboxOption) => {
    const code = Number(val);
    const prov = locList.find((l) => l.code === code) || { code, title: opt.label };
    setForm((current) => ({
      ...current,
      province: prov.title,
      provinceCode: prov.code,
      city: '',
      cityCode: undefined,
    }));
    if (errors.province) {
      setErrors((prev) => ({ ...prev, province: '' }));
    }
    if (errors.city) {
      setErrors((prev) => ({ ...prev, city: '' }));
    }
  };

  const handleCityChange = (val: string | number, opt: ComboboxOption) => {
    const code = Number(val);
    const c = selectedProvince?.cities.find((city) => city.code === code) || {
      code: isNaN(code) ? 0 : code,
      title: opt.label,
    };
    setForm((current) => ({
      ...current,
      city: c.title,
      cityCode: c.code,
    }));
    if (errors.city) {
      setErrors((prev) => ({ ...prev, city: '' }));
    }
  };

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
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
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    let hasPhoneError = false;
    const cleanPhone = toDigitsOnly(form.phone);
    if (!cleanPhone) {
      setPhoneError('شماره همراه الزامی است');
      hasPhoneError = true;
    } else if (!IRANIAN_MOBILE_REGEX.test(cleanPhone)) {
      setPhoneError('شماره همراه معتبر نیست (مثال: 09121234567)');
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
      className="space-y-4 rounded-2xl border border-soil-900/10 dark:border-dust-50/10 bg-white dark:bg-flora-900 p-5 shadow-xs"
    >
      <div className="flex items-center justify-between border-b border-soil-900/10 dark:border-dust-50/10 pb-3">
        <h3 className="font-bold text-soil-900 dark:text-dust-50 text-sm">
          {editing ? 'ویرایش آدرس' : 'افزودن آدرس جدید'}
        </h3>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-soil-700/70 hover:text-soil-900 dark:text-dust-200/70 dark:hover:text-dust-50"
          >
            انصراف
          </button>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-500/30 bg-red-50 dark:bg-red-950/40 p-3 text-xs text-red-600 dark:text-red-400"
        >
          {error}
        </div>
      )}

      {locList.length === 0 && (
        <div
          role="status"
          className="rounded-xl border border-amber-300/40 bg-amber-50 dark:bg-amber-950/40 p-3 text-xs text-amber-800 dark:text-amber-300"
        >
          در حال بارگذاری یا عدم دسترسی به سامانه تپین برای دریافت استان‌ها و شهرها...
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="block">
          <label htmlFor={`${idPrefix}-fullName`} className="block text-xs font-bold text-soil-700/80 dark:text-dust-200">
            نام و نام خانوادگی تحویل‌گیرنده
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

        {/* Province and City Searchable Comboboxes */}
        <div className="sm:col-span-2 grid gap-4 sm:grid-cols-2" dir="rtl">
          <div className="block">
            <label htmlFor={`${idPrefix}-province`} className="block text-xs font-bold text-soil-700/80 dark:text-dust-200 mb-1">
              استان
              <span className="text-red-500 ms-0.5">*</span>
            </label>
            <SearchableCombobox
              id={`${idPrefix}-province`}
              name="provinceCode"
              options={provinceOptions}
              value={selectedProvince?.code ?? form.province}
              onChange={handleProvinceChange}
              placeholder="جستجو و انتخاب استان…"
              disabled={locList.length === 0}
              error={Boolean(errors.province)}
              emptyMessage="استانی با این نام پیدا نشد"
            />
            <FormError message={errors.province} />
          </div>

          <div className="block">
            <label htmlFor={`${idPrefix}-city`} className="block text-xs font-bold text-soil-700/80 dark:text-dust-200 mb-1">
              شهر
              <span className="text-red-500 ms-0.5">*</span>
            </label>
            <SearchableCombobox
              id={`${idPrefix}-city`}
              name="cityCode"
              options={cityOptions}
              value={form.cityCode ?? form.city}
              onChange={handleCityChange}
              placeholder={selectedProvince ? 'جستجو و انتخاب شهر…' : 'ابتدا استان را انتخاب کنید'}
              disabled={!selectedProvince || cityOptions.length === 0}
              error={Boolean(errors.city)}
              emptyMessage="شهری با این نام پیدا نشد"
            />
            <FormError message={errors.city} />
          </div>
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
        <textarea
          id={`${idPrefix}-line1`}
          name="line1"
          value={form.line1}
          onChange={handleChange}
          rows={2}
          className={`mt-1 w-full rounded-xl border bg-dust-50 dark:bg-flora-950 px-3 py-2.5 text-sm text-soil-900 dark:text-dust-50 dark:placeholder:text-dust-400 outline-none transition resize-none ${
            errors.line1
              ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
              : 'border-soil-900/10 dark:border-dust-50/20 focus:border-flora-500 focus:dark:border-flora-500'
          }`}
          placeholder="خیابان، کوچه، پلاک، زنگ، واحد..."
        />
        <FormError message={errors.line1} />
      </div>

      <div className="block">
        <label htmlFor={`${idPrefix}-line2`} className="block text-xs font-bold text-soil-700/80 dark:text-dust-200">
          توضیحات تکمیلی (اختیاری)
        </label>
        <input
          id={`${idPrefix}-line2`}
          name="line2"
          value={form.line2}
          onChange={handleChange}
          className="mt-1 w-full rounded-xl border border-soil-900/10 dark:border-dust-50/20 bg-dust-50 dark:bg-flora-950 px-3 py-2.5 text-sm text-soil-900 dark:text-dust-50 dark:placeholder:text-dust-400 outline-none transition focus:border-flora-500 focus:dark:border-flora-500"
          placeholder="طبقه، زنگ، یا راهنمای دسترسی برای پیک..."
        />
      </div>

      <div className="flex items-center gap-2 pt-1">
        <input
          type="checkbox"
          id={`${idPrefix}-isDefault`}
          name="isDefault"
          checked={form.isDefault}
          onChange={handleChange}
          className="size-4 rounded-md border-soil-900/20 text-flora-700 focus:ring-flora-500 accent-flora-700"
        />
        <label htmlFor={`${idPrefix}-isDefault`} className="text-xs font-bold text-soil-700/90 dark:text-dust-200">
          به‌عنوان آدرس پیش‌فرض ذخیره شود
        </label>
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-soil-900/10 dark:border-dust-50/10">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="rounded-xl border border-soil-900/15 px-4 py-2.5 text-xs font-bold text-soil-800 transition hover:bg-dust-100 disabled:opacity-50 dark:border-dust-50/20 dark:text-dust-200 dark:hover:bg-flora-800"
          >
            انصراف
          </button>
        )}
        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl bg-flora-700 px-6 py-2.5 text-xs font-bold text-dust-50 shadow-sm transition hover:bg-flora-800 disabled:opacity-50"
        >
          {isPending ? 'در حال ثبت…' : editing ? 'ویرایش آدرس' : 'ثبت آدرس'}
        </button>
      </div>
    </form>
  );
}
