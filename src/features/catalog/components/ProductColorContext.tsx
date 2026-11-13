'use client';

import React, { createContext, useContext, useState } from 'react';

type ProductColorContextType = {
  selectedColor: string | null;
  setSelectedColor: (color: string) => void;
  selectedBundleColors: Record<number, string>;
  setSelectedBundleColor: (itemIndex: number, color: string) => void;
};

const ProductColorContext = createContext<ProductColorContextType | null>(null);

export function ProductColorProvider({
  children,
  initialColor = null,
  initialBundleColors = {},
}: {
  children: React.ReactNode;
  initialColor?: string | null;
  initialBundleColors?: Record<number, string>;
}) {
  const [selectedColor, setSelectedColor] = useState<string | null>(initialColor);
  const [selectedBundleColors, setSelectedBundleColors] = useState<Record<number, string>>(initialBundleColors);

  const setSelectedBundleColor = (itemIndex: number, color: string) => {
    setSelectedBundleColors((prev) => ({
      ...prev,
      [itemIndex]: color,
    }));
  };

  return (
    <ProductColorContext.Provider
      value={{
        selectedColor,
        setSelectedColor,
        selectedBundleColors,
        setSelectedBundleColor,
      }}
    >
      {children}
    </ProductColorContext.Provider>
  );
}

export function useProductColor() {
  const ctx = useContext(ProductColorContext);
  return ctx;
}
