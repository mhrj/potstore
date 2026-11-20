export * from './tapin/locations';
export * from './tapin/rates';
export * from './tapin/boxes';
export * from './tapin/register';
export * from './tapin/financial';

import {
  calculateTapinRate,
  type ShippingAddressLike,
  type ShippingItemLike,
} from './tapin/rates';

export type ShippingProvider = 'TAPIN' | 'TIPAX';

export type CalculateRatesParams = {
  address: ShippingAddressLike;
  items: ShippingItemLike[];
  carrier?: ShippingProvider;
};

export type CalculateRatesResult = {
  costToman: number;
  carrier: string;
  carrierName: string;
  isFallback?: boolean;
};

/**
 * Modular shipping rate calculator.
 * Supports Tapin Pishtaz now, and designed for easy addition of Tipax or other carriers.
 */
export async function calculateShippingRates({
  address,
  items,
  carrier = 'TAPIN',
}: CalculateRatesParams): Promise<CalculateRatesResult> {
  switch (carrier) {
    case 'TAPIN':
    default: {
      const res = await calculateTapinRate(address, items);
      return {
        costToman: res.costToman,
        carrier: 'پست پیشتاز',
        carrierName: 'پست پیشتاز',
        isFallback: (res as { isFallback?: boolean }).isFallback,
      };
    }
  }
}

