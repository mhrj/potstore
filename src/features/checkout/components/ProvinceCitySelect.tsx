'use client';

import { useMemo } from 'react';
import type { TapinProvince } from '@/lib/providers/shipping/tapin/locations';
import SearchableCombobox from '@/components/ui/SearchableCombobox';
import Skeleton from '@/components/ui/Skeleton';
import { FormError } from '@/components/ui/FormError';

export type ProvinceCitySelectProps = {
  locations?: TapinProvince[];
  provinces?: TapinProvince[];
  selectedProvinceCode?: number | string | null;
  selectedCityCode?: number | string | null;
  onProvinceChange?: (province: { code: number; title: string }) => void;
  onCityChange?: (city: { code: number; title: string }) => void;
  // Supported for full backward-compatibility with existing forms
  value?: {
    province: string;
    city: string;
    provinceCode?: number | string;
    cityCode?: number | string;
  };
  onChange?: (val: {
    province: string;
    city: string;
    provinceCode?: number;
    cityCode?: number;
  }) => void;
  required?: boolean;
  disabled?: boolean;
  isLoading?: boolean;
  error?: string;
  errorProvince?: string;
  errorCity?: string;
  provinceLabel?: string;
  cityLabel?: string;
  provincePlaceholder?: string;
  cityPlaceholder?: string;
  className?: string;
  idPrefix?: string;
};

export default function ProvinceCitySelect({
  locations,
  provinces,
  selectedProvinceCode,
  selectedCityCode,
  onProvinceChange,
  onCityChange,
  value,
  onChange,
  required = false,
  disabled = false,
  isLoading = false,
  error,
  errorProvince,
  errorCity,
  provinceLabel = 'استان',
  cityLabel = 'شهر',
  provincePlaceholder = 'انتخاب یا جستجوی استان…',
  cityPlaceholder = 'انتخاب یا جستجوی شهر…',
  className = '',
  idPrefix = 'region',
}: ProvinceCitySelectProps) {
  // Use provided live Tapin locations
  const provinceList = useMemo<TapinProvince[]>(() => {
    if (locations && Array.isArray(locations) && locations.length > 0) {
      return locations;
    }
    if (provinces && Array.isArray(provinces) && provinces.length > 0) {
      return provinces;
    }
    return [];
  }, [locations, provinces]);

  // Resolve current province code based on props (selectedProvinceCode, or value.provinceCode, or value.province title)
  const currentProvinceCode = useMemo(() => {
    if (selectedProvinceCode !== undefined && selectedProvinceCode !== null && selectedProvinceCode !== '') {
      return Number(selectedProvinceCode);
    }
    if (value?.provinceCode !== undefined && value.provinceCode !== null && value.provinceCode !== '') {
      return Number(value.provinceCode);
    }
    if (value?.province) {
      const match = provinceList.find((p) => p.title === value.province);
      return match ? match.code : undefined;
    }
    return undefined;
  }, [selectedProvinceCode, value?.provinceCode, value?.province, provinceList]);

  // Resolve current active province
  const activeProvince = useMemo(() => {
    if (currentProvinceCode !== undefined) {
      return provinceList.find((p) => p.code === currentProvinceCode);
    }
    return undefined;
  }, [currentProvinceCode, provinceList]);

  // Cities for the currently selected province
  const availableCities = useMemo(() => {
    return activeProvince?.cities ?? [];
  }, [activeProvince]);

  // Resolve current city code
  const currentCityCode = useMemo(() => {
    if (selectedCityCode !== undefined && selectedCityCode !== null && selectedCityCode !== '') {
      return Number(selectedCityCode);
    }
    if (value?.cityCode !== undefined && value.cityCode !== null && value.cityCode !== '') {
      return Number(value.cityCode);
    }
    if (value?.city && availableCities.length > 0) {
      const match = availableCities.find((c) => c.title === value.city);
      return match ? match.code : undefined;
    }
    return undefined;
  }, [selectedCityCode, value?.cityCode, value?.city, availableCities]);

  // Formatted options for SearchableCombobox
  const provinceOptions = useMemo(() => {
    return provinceList.map((p) => ({
      value: p.code,
      label: p.title,
    }));
  }, [provinceList]);

  const cityOptions = useMemo(() => {
    const list: { value: string | number; label: string }[] = availableCities.map((c) => ({
      value: c.code,
      label: c.title,
    }));

    // If there's an existing custom or legacy city not in provider list, preserve it as an option
    if (value?.city && !availableCities.some((c) => c.title === value.city)) {
      list.push({
        value: value.city,
        label: value.city,
      });
    }

    return list;
  }, [availableCities, value?.city]);

  if (isLoading) {
    return (
      <div className={`grid gap-4 sm:grid-cols-2 w-full ${className}`} dir="rtl">
        <div>
          <div className="h-4 w-16 mb-1.5 rounded bg-dust-200/60 dark:bg-flora-800" />
          <Skeleton className="h-[42px] w-full rounded-xl" />
        </div>
        <div>
          <div className="h-4 w-12 mb-1.5 rounded bg-dust-200/60 dark:bg-flora-800" />
          <Skeleton className="h-[42px] w-full rounded-xl" />
        </div>
      </div>
    );
  }

  const isCityDisabled = disabled || !activeProvince || availableCities.length === 0;

  return (
    <div className={`grid gap-4 sm:grid-cols-2 w-full ${className}`} dir="rtl">
      {provinceList.length === 0 && (
        <div
          role="status"
          className="sm:col-span-2 rounded-xl border border-amber-300/40 bg-amber-50 dark:bg-amber-950/40 p-3 text-xs text-amber-800 dark:text-amber-300"
        >
          در حال بارگذاری یا عدم دسترسی به سامانه تپین برای دریافت استان‌ها و شهرها...
        </div>
      )}

      {/* Province Searchable Combobox */}
      <div className="block">
        <label
          htmlFor={`${idPrefix}-province`}
          className="block text-xs font-bold text-soil-700/80 dark:text-dust-200 mb-1"
        >
          <span>{provinceLabel}</span>
          {required && <span className="text-red-500 ms-0.5">*</span>}
        </label>
        <SearchableCombobox
          id={`${idPrefix}-province`}
          name="provinceCode"
          options={provinceOptions}
          value={currentProvinceCode ?? value?.province}
          onChange={(val, opt) => {
            const code = Number(val);
            const selected = provinceList.find((p) => p.code === code) || {
              code,
              title: opt.label,
            };

            if (onProvinceChange) {
              onProvinceChange({ code: selected.code, title: selected.title });
            }
            if (onChange) {
              onChange({
                province: selected.title,
                city: '',
                provinceCode: selected.code,
                cityCode: undefined,
              });
            }
          }}
          placeholder={provincePlaceholder}
          required={required}
          disabled={disabled || provinceList.length === 0}
          error={Boolean(errorProvince || error)}
          emptyMessage="استانی با این نام پیدا نشد"
        />
        <FormError message={errorProvince || error} />
      </div>

      {/* City Searchable Combobox */}
      <div className="block">
        <label
          htmlFor={`${idPrefix}-city`}
          className="block text-xs font-bold text-soil-700/80 dark:text-dust-200 mb-1"
        >
          <span>{cityLabel}</span>
          {required && <span className="text-red-500 ms-0.5">*</span>}
        </label>
        <SearchableCombobox
          id={`${idPrefix}-city`}
          name="cityCode"
          options={cityOptions}
          value={currentCityCode ?? value?.city}
          onChange={(val, opt) => {
            const code = Number(val);
            const selected = availableCities.find((c) => c.code === code) || {
              code: isNaN(code) ? 0 : code,
              title: opt.label,
            };

            if (onCityChange) {
              onCityChange({ code: selected.code, title: selected.title });
            }
            if (onChange && activeProvince) {
              onChange({
                province: activeProvince.title,
                city: selected.title,
                provinceCode: activeProvince.code,
                cityCode: selected.code,
              });
            }
          }}
          placeholder={activeProvince ? cityPlaceholder : 'ابتدا استان را انتخاب کنید'}
          required={required}
          disabled={isCityDisabled}
          error={Boolean(errorCity)}
          emptyMessage="شهری با این نام پیدا نشد"
        />
        <FormError message={errorCity} />
      </div>
    </div>
  );
}
