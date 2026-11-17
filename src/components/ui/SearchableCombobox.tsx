'use client';

import React, { useState, useRef, useEffect, useId, useMemo } from 'react';
import { twMerge } from 'tailwind-merge';

export type ComboboxOption = {
  value: string | number;
  label: string;
};

export type SearchableComboboxProps = {
  options: ComboboxOption[];
  value?: string | number | null;
  onChange?: (value: string | number, option: ComboboxOption) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean | string;
  id?: string;
  name?: string;
  required?: boolean;
  className?: string;
  containerClassName?: string;
  emptyMessage?: string;
};

/**
 * Pure filter logic for combobox options.
 * Matches case-insensitively, normalizes Arabic Yeh/Kaf to Persian equivalents,
 * and handles trailing/leading whitespace.
 */
export function filterComboboxOptions<T extends { label: string }>(
  options: T[],
  query: string
): T[] {
  if (!query || !query.trim()) return options;

  const normalizedQuery = query
    .toLowerCase()
    .replace(/[\u064A]/g, 'ی')
    .replace(/[\u0643]/g, 'ک')
    .replace(/\s+/g, ' ')
    .trim();

  return options.filter((opt) => {
    const normalizedLabel = (opt.label || '')
      .toLowerCase()
      .replace(/[\u064A]/g, 'ی')
      .replace(/[\u0643]/g, 'ک')
      .replace(/\s+/g, ' ')
      .trim();
    return normalizedLabel.includes(normalizedQuery);
  });
}

export default function SearchableCombobox({
  options,
  value,
  onChange,
  placeholder = 'جستجو و انتخاب کنید…',
  disabled = false,
  error,
  id,
  name,
  required = false,
  className = '',
  containerClassName = '',
  emptyMessage = 'موردی یافت نشد',
}: SearchableComboboxProps) {
  const generatedId = useId();
  const inputId = id || `combobox-${generatedId}`;
  const listboxId = `listbox-${generatedId}`;

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Find the selected option by value (or label)
  const selectedOption = useMemo(() => {
    if (value === undefined || value === null || value === '') return null;
    return (
      options.find(
        (o) => String(o.value) === String(value) || o.label === String(value)
      ) || null
    );
  }, [options, value]);

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(selectedOption ? selectedOption.label : '');
  const [isSearching, setIsSearching] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // Sync display text when value or options change and user is not actively typing
  useEffect(() => {
    if (!isSearching) {
      setQuery(selectedOption ? selectedOption.label : value ? String(value) : '');
    }
  }, [selectedOption, value, isSearching]);

  // Filtered options based on user query
  const filteredOptions = useMemo(() => {
    if (!isSearching) return options;
    return filterComboboxOptions(options, query);
  }, [options, query, isSearching]);

  // Click outside listener: closes dropdown when clicking outside containerRef
  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDownOutside(e: MouseEvent | PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsSearching(false);
        // Reset query text to current selection if user blurred without selecting
        setQuery(selectedOption ? selectedOption.label : value ? String(value) : '');
      }
    }

    document.addEventListener('pointerdown', handlePointerDownOutside);
    document.addEventListener('mousedown', handlePointerDownOutside);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDownOutside);
      document.removeEventListener('mousedown', handlePointerDownOutside);
    };
  }, [isOpen, selectedOption, value]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('li');
      const item = items[highlightedIndex];
      if (item) {
        item.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleSelect = (option: ComboboxOption) => {
    setIsOpen(false);
    setIsSearching(false);
    setHighlightedIndex(-1);
    setQuery(option.label);
    onChange?.(option.value, option);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setIsSearching(true);
    setIsOpen(true);
    setHighlightedIndex(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setHighlightedIndex(0);
        } else if (filteredOptions.length > 0) {
          setHighlightedIndex((prev) => (prev + 1) % filteredOptions.length);
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setHighlightedIndex(filteredOptions.length - 1);
        } else if (filteredOptions.length > 0) {
          setHighlightedIndex((prev) =>
            (prev - 1 + filteredOptions.length) % filteredOptions.length
          );
        }
        break;
      case 'Enter':
        if (isOpen) {
          e.preventDefault();
          if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
            handleSelect(filteredOptions[highlightedIndex]);
          } else if (filteredOptions.length === 1) {
            handleSelect(filteredOptions[0]);
          }
        }
        break;
      case 'Escape':
        if (isOpen) {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(false);
          setIsSearching(false);
          setQuery(selectedOption ? selectedOption.label : value ? String(value) : '');
        }
        break;
      case 'Tab':
        if (isOpen) {
          setIsOpen(false);
          setIsSearching(false);
          setQuery(selectedOption ? selectedOption.label : value ? String(value) : '');
        }
        break;
    }
  };

  return (
    <div
      ref={containerRef}
      className={twMerge('relative w-full', containerClassName)}
      dir="rtl"
    >
      <div className="relative">
        <input
          ref={inputRef}
          id={inputId}
          name={name}
          type="text"
          value={query}
          required={required}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-activedescendant={
            isOpen && highlightedIndex >= 0
              ? `${inputId}-opt-${highlightedIndex}`
              : undefined
          }
          onChange={handleInputChange}
          onFocus={() => {
            if (!disabled) {
              setIsOpen(true);
            }
          }}
          onClick={() => {
            if (!disabled) {
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          className={twMerge(
            'w-full appearance-none rounded-xl ps-4 pe-10 py-2.5 text-sm outline-none transition cursor-text',
            'bg-white/80 border border-soil-900/15 text-soil-900 placeholder:text-soil-700/50',
            'focus:ring-2 focus:ring-flora-500/20 focus:border-flora-500',
            'dark:bg-flora-900 dark:border-dust-50/20 dark:text-dust-50 dark:placeholder:text-dust-200/50',
            'dark:focus:border-flora-300 dark:focus:ring-flora-300/20',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20 dark:border-red-400'
              : '',
            className
          )}
        />

        {/* Dropdown Toggle Chevron */}
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onPointerDown={(e) => {
            e.preventDefault();
          }}
          onClick={() => {
            if (disabled) return;
            setIsOpen((prev) => !prev);
            inputRef.current?.focus();
          }}
          aria-label={isOpen ? 'بستن لیست' : 'باز کردن لیست'}
          className="absolute inset-y-0 end-3 flex items-center text-soil-700/60 dark:text-dust-300/70 hover:text-soil-900 dark:hover:text-dust-50 transition-colors disabled:opacity-50 disabled:pointer-events-none"
        >
          <svg
            className={twMerge(
              'size-4 transition-transform duration-200',
              isOpen ? 'rotate-180' : ''
            )}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
      </div>

      {/* Floating Dropdown List */}
      {isOpen && !disabled && (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          tabIndex={-1}
          className={twMerge(
            'absolute z-50 mt-1.5 max-h-60 w-full overflow-auto rounded-xl',
            'bg-white dark:bg-flora-950 border border-soil-900/15 dark:border-dust-50/20',
            'shadow-xl py-1 text-sm outline-none'
          )}
        >
          {filteredOptions.length === 0 ? (
            <li className="px-4 py-3 text-center text-xs text-soil-700/60 dark:text-dust-200/60">
              {emptyMessage}
            </li>
          ) : (
            filteredOptions.map((option, index) => {
              const isSelected = selectedOption?.value === option.value;
              const isHighlighted = highlightedIndex === index;

              return (
                <li
                  key={option.value}
                  id={`${inputId}-opt-${index}`}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    handleSelect(option);
                  }}
                  onClick={() => handleSelect(option)}
                  className={twMerge(
                    'flex items-center justify-between px-3.5 py-2.5 cursor-pointer text-sm transition-colors',
                    isHighlighted
                      ? 'bg-flora-500/10 text-flora-900 dark:bg-flora-800/60 dark:text-dust-50 font-medium'
                      : 'text-soil-900 dark:text-dust-50',
                    isSelected
                      ? 'font-black text-flora-700 dark:text-flora-300'
                      : ''
                  )}
                >
                  <span className="truncate">{option.label}</span>
                  {isSelected && (
                    <span className="text-flora-600 dark:text-flora-300 font-bold ms-2">
                      ✓
                    </span>
                  )}
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}

