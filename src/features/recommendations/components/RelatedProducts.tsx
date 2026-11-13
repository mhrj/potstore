'use client';

import { useState } from 'react';
import ProductCard, { type ProductCardData } from '@/features/catalog/components/ProductCard';

export type RelatedProductsProps = {
  similar?: ProductCardData[];
  complement?: ProductCardData[];
  boughtTogether?: ProductCardData[];
  className?: string;
};

type TabKind = 'similar' | 'complement' | 'boughtTogether';

type TabDefinition = {
  id: TabKind;
  label: string;
  items: ProductCardData[];
};

export default function RelatedProducts({
  similar = [],
  complement = [],
  boughtTogether = [],
  className = '',
}: RelatedProductsProps) {
  const tabs: TabDefinition[] = [
    { id: 'similar' as const, label: 'محصولات مشابه', items: similar },
    { id: 'complement' as const, label: 'تکمیل‌کننده', items: complement },
    { id: 'boughtTogether' as const, label: 'خریداران دیگر خریده‌اند', items: boughtTogether },
  ].filter((t) => t.items.length > 0);

  const [activeTabId, setActiveTabId] = useState<TabKind>(tabs[0]?.id ?? 'similar');

  // If all tabs are empty, render nothing
  if (tabs.length === 0) {
    return null;
  }

  // Ensure active tab points to a non-empty tab
  const currentTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];

  return (
    <section
      aria-label="محصولات و پیشنهادهای مرتبط"
      className={`mt-16 lg:mt-24 pt-12 border-t border-soil-900/10 dark:border-dust-100/10 ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-soil-900 dark:text-dust-50">
            پیشنهادهای مرتبط
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-soil-700/70 dark:text-dust-200/70">
            محصولاتی که ممکن است برای گیاه و فضای شما مناسب باشند.
          </p>
        </div>

        {/* Tab Switcher - only show if more than 1 tab has products */}
        {tabs.length > 1 && (
          <div
            role="tablist"
            aria-label="دسته‌بندی پیشنهادها"
            className="inline-flex self-start sm:self-auto p-1 rounded-2xl bg-dust-100/80 dark:bg-flora-900/80 border border-soil-900/5 dark:border-dust-100/10 backdrop-blur"
          >
            {tabs.map((tab) => {
              const isActive = tab.id === currentTab.id;
              return (
                <button
                  key={tab.id}
                  id={`tab-${tab.id}`}
                  role="tab"
                  type="button"
                  aria-selected={isActive}
                  aria-controls={`panel-${tab.id}`}
                  onClick={() => setActiveTabId(tab.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-flora-500 ${
                    isActive
                      ? 'bg-white dark:bg-flora-800 text-flora-900 dark:text-white shadow-sm'
                      : 'text-soil-700/80 dark:text-dust-300/80 hover:text-soil-950 dark:hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Tab Panels */}
      <div
        id={`panel-${currentTab.id}`}
        role="tabpanel"
        aria-labelledby={`tab-${currentTab.id}`}
        className="mt-8"
      >
        <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
          {currentTab.items.map((product) => (
            <li key={product.id}>
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
