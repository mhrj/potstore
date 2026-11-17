import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { filterComboboxOptions } from '../src/components/ui/SearchableCombobox';

describe('SearchableCombobox - filterComboboxOptions', () => {
  const sampleOptions = [
    { value: 8, label: 'تهران' },
    { value: 802, label: 'شهریار' },
    { value: 803, label: 'اسلام‌شهر' },
    { value: 1, label: 'آذربایجان شرقی' },
    { value: 2, label: 'آذربایجان غربی' },
    { value: 902, label: 'کاشان' },
  ];

  it('returns all options when query is empty or whitespace', () => {
    assert.equal(filterComboboxOptions(sampleOptions, '').length, sampleOptions.length);
    assert.equal(filterComboboxOptions(sampleOptions, '   ').length, sampleOptions.length);
  });

  it('filters options by case-insensitive partial substring match', () => {
    const results = filterComboboxOptions(sampleOptions, 'شهر');
    assert.equal(results.length, 2);
    assert.deepEqual(results.map((r) => r.label), ['شهریار', 'اسلام‌شهر']);
  });

  it('normalizes Arabic Yeh (ي) and Persian Yeh (ی) so search matches across keyboards', () => {
    // Query uses Arabic Yeh (ي) while options use Persian Yeh (ی)
    const queryArabic = 'آذربايجان';
    const results = filterComboboxOptions(sampleOptions, queryArabic);
    assert.equal(results.length, 2);
    assert.deepEqual(results.map((r) => r.label), ['آذربایجان شرقی', 'آذربایجان غربی']);
  });

  it('normalizes Arabic Kaf (ك) and Persian Keheh (ک)', () => {
    // Query uses Arabic Kaf (ك) while option has Persian Keheh (ک)
    const queryArabicKaf = 'كاشان';
    const results = filterComboboxOptions(sampleOptions, queryArabicKaf);
    assert.equal(results.length, 1);
    assert.equal(results[0].label, 'کاشان');
  });

  it('returns empty array when no options match the query', () => {
    const results = filterComboboxOptions(sampleOptions, 'شیراز');
    assert.equal(results.length, 0);
  });

  it('handles options with special characters and ZWNJ (نیم‌فاصله)', () => {
    const results = filterComboboxOptions(sampleOptions, 'اسلام');
    assert.equal(results.length, 1);
    assert.equal(results[0].label, 'اسلام‌شهر');
  });
});

describe('SearchableCombobox - State Management & Keyboard Handling', () => {
  type ComboboxState = {
    isOpen: boolean;
    isSearching: boolean;
    query: string;
    highlightedIndex: number;
    selectedValue: string | number | null;
  };

  function simulateKeyDown(
    state: ComboboxState,
    key: string,
    options: { value: string | number; label: string }[],
    selectedOptionLabel = ''
  ): ComboboxState {
    const next = { ...state };
    switch (key) {
      case 'Escape':
        if (next.isOpen) {
          next.isOpen = false;
          next.isSearching = false;
          next.query = selectedOptionLabel;
        }
        break;
      case 'Tab':
        if (next.isOpen) {
          next.isOpen = false;
          next.isSearching = false;
          next.query = selectedOptionLabel;
        }
        break;
      case 'Enter':
        if (next.isOpen && next.highlightedIndex >= 0 && options[next.highlightedIndex]) {
          const opt = options[next.highlightedIndex];
          next.isOpen = false;
          next.isSearching = false;
          next.query = opt.label;
          next.selectedValue = opt.value;
          next.highlightedIndex = -1;
        }
        break;
    }
    return next;
  }

  function simulateSelect(
    state: ComboboxState,
    option: { value: string | number; label: string }
  ): ComboboxState {
    return {
      ...state,
      isOpen: false,
      isSearching: false,
      highlightedIndex: -1,
      query: option.label,
      selectedValue: option.value,
    };
  }

  it('closes dropdown and resets query on Escape key', () => {
    const initial: ComboboxState = {
      isOpen: true,
      isSearching: true,
      query: 'ته',
      highlightedIndex: 0,
      selectedValue: 8,
    };
    const next = simulateKeyDown(initial, 'Escape', [], 'تهران');
    assert.equal(next.isOpen, false);
    assert.equal(next.isSearching, false);
    assert.equal(next.query, 'تهران');
  });

  it('closes dropdown on Tab key to allow natural field navigation', () => {
    const initial: ComboboxState = {
      isOpen: true,
      isSearching: false,
      query: 'تهران',
      highlightedIndex: -1,
      selectedValue: 8,
    };
    const next = simulateKeyDown(initial, 'Tab', [], 'تهران');
    assert.equal(next.isOpen, false);
  });

  it('immediately closes dropdown and sets value on option selection', () => {
    const initial: ComboboxState = {
      isOpen: true,
      isSearching: true,
      query: 'البر',
      highlightedIndex: 0,
      selectedValue: null,
    };
    const next = simulateSelect(initial, { value: 30, label: 'البرز' });
    assert.equal(next.isOpen, false);
    assert.equal(next.isSearching, false);
    assert.equal(next.query, 'البرز');
    assert.equal(next.selectedValue, 30);
  });
});
