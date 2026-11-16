'use client';

import { useMemo } from 'react';
import { IRAN_PROVINCES, getCitiesForProvince } from '@/lib/iran-data';
import { FormError } from '@/components/ui/FormError';
import Select from '@/components/ui/Select';

export type ProvinceCityValue = {
  province: string;
  city: string;
};

export type ProvinceCitySelectProps = {
  value: ProvinceCityValue;
  onChange: (value: ProvinceCityValue) => void;
  required?: boolean;
  disabled?: boolean;
  provinceLabel?: string;
  cityLabel?: string;
  provincePlaceholder?: string;
  cityPlaceholder?: string;
  className?: string;
  errorProvince?: string;
  errorCity?: string;
  idPrefix?: string;
};

export default function ProvinceCitySelect({
  value,
  onChange,
  required = false,
  disabled = false,
  provinceLabel = 'استان',
  cityLabel = 'شهر',
  provincePlaceholder = 'انتخاب استان',
  cityPlaceholder = 'انتخاب شهر',
  className = '',
  errorProvince,
  errorCity,
  idPrefix = 'region',
}: ProvinceCitySelectProps) {
  const availableCities = useMemo(() => {
    return getCitiesForProvince(value.province);
  }, [value.province]);

  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newProvince = e.target.value;
    onChange({
      province: newProvince,
      city: '',
    });
  };

  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCity = e.target.value;
    onChange({
      province: value.province,
      city: newCity,
    });
  };

  const isCityDisabled = disabled || !value.province;

  return (
    <div className={`grid gap-4 sm:grid-cols-2 w-full ${className}`} dir="rtl">
      {/* Province Select */}
      <label
        htmlFor={`${idPrefix}-province`}
        className="block text-xs font-bold text-soil-700/80 dark:text-dust-200"
      >
        <span>{provinceLabel}</span>
        {required && <span className="text-red-500 ms-0.5">*</span>}
        <Select
          id={`${idPrefix}-province`}
          name="province"
          value={value.province || ''}
          onChange={handleProvinceChange}
          required={required}
          disabled={disabled}
          error={Boolean(errorProvince)}
          containerClassName="mt-1"
        >
          <option value="" disabled className="dark:bg-flora-950 dark:text-dust-50">
            {provincePlaceholder}
          </option>
          {IRAN_PROVINCES.map((p) => (
            <option key={p.name} value={p.name} className="dark:bg-flora-950 dark:text-dust-50">
              {p.name}
            </option>
          ))}
        </Select>
        <FormError message={errorProvince} />
      </label>

      {/* City Select */}
      <label
        htmlFor={`${idPrefix}-city`}
        className="block text-xs font-bold text-soil-700/80 dark:text-dust-200"
      >
        <span>{cityLabel}</span>
        {required && <span className="text-red-500 ms-0.5">*</span>}
        <Select
          id={`${idPrefix}-city`}
          name="city"
          value={value.city || ''}
          onChange={handleCityChange}
          required={required}
          disabled={isCityDisabled}
          error={Boolean(errorCity)}
          containerClassName="mt-1"
        >
          <option value="" disabled className="dark:bg-flora-950 dark:text-dust-50">
            {value.province ? cityPlaceholder : 'ابتدا استان را انتخاب کنید'}
          </option>
          {availableCities.map((cityName) => (
            <option key={cityName} value={cityName} className="dark:bg-flora-950 dark:text-dust-50">
              {cityName}
            </option>
          ))}
          {/* If the current city is not in the list (legacy custom city), keep it visible as an option */}
          {value.city && !availableCities.includes(value.city) && (
            <option value={value.city} className="dark:bg-flora-950 dark:text-dust-50">{value.city}</option>
          )}
        </Select>
        <FormError message={errorCity} />
      </label>
    </div>
  );
}
