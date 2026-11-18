import { calculateChargeableWeight } from '@/lib/shipping-utils';

export const FALLBACK_SHIPPING_COST_TOMAN = 50000;
export const MAX_POST_WEIGHT_GRAMS = 30000;
export const WEIGHT_LIMIT_EXCEEDED_MESSAGE =
  'سفارش شما بیش از ۳۰ کیلوگرم است و امکان ارسال با پست پیشتاز وجود ندارد. لطفاً سفارش خود را به دو بخش تقسیم کنید یا با پشتیبانی تماس بگیرید.';

export type ShippingAddressLike = {
  fullName?: string | null;
  phone?: string | null;
  province?: string | null;
  provinceCode?: number | string | null;
  city?: string | null;
  cityCode?: number | string | null;
  postalCode?: string | null;
  line1?: string | null;
  line2?: string | null;
};

export type ShippingItemLike = {
  productName?: string | null;
  name?: string | null;
  quantity: number;
  unitPriceToman?: number | null;
  unitToman?: number | null;
  weightGrams?: number | null;
  lineWeightGrams?: number | null;
  packageLengthCm?: number | null;
  packageWidthCm?: number | null;
  packageHeightCm?: number | null;
  isFragile?: boolean | null;
};

export type TapinProductPayload = {
  count: number;
  price: number;
  title: string;
  weight: number;
  discount: number;
  product_id: null;
};

export type TapinPriceCheckPayload = {
  shop_id: string;
  description: string;
  address: string;
  city_code: string;
  province_code: string;
  email: null;
  employee_code: string;
  first_name: string;
  last_name: string;
  mobile: string;
  phone: null;
  postal_code: string;
  pay_type: string;
  order_type: string;
  package_weight: number;
  box_id: number;
  packet_type: number;
  has_insurance: boolean;
  content_type: number;
  products: TapinProductPayload[];
};

/**
 * Maps application address and order/cart items to the exact payload structure
 * confirmed for Tapin Post / Pishtaz price checking.
 */
export function buildTapinPriceCheckPayload(
  address: ShippingAddressLike,
  items: ShippingItemLike[],
): TapinPriceCheckPayload {
  const shopId = process.env.TAPIN_SHOP_ID || '';

  const fullAddress = `${address.line1 || ''} ${address.line2 || ''}`.trim();
  const rawCityCode = address.cityCode !== undefined && address.cityCode !== null ? String(address.cityCode) : '';
  const rawProvinceCode =
    address.provinceCode !== undefined && address.provinceCode !== null ? String(address.provinceCode) : '';

  const nameParts = (address.fullName || '').trim().split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] || 'مشتری';
  const lastName = nameParts.slice(1).join(' ') || 'فروشگاه';

  const mobile = (address.phone || '').trim();
  const postalCode = (address.postalCode || '').trim();

  // Package weight uses volumetric chargeable weight (or actual weight if greater)
  const { chargeableWeight } = calculateChargeableWeight(
    items.map((it) => {
      const itemQty = it.quantity || 1;
      const itemWeight =
        it.weightGrams ??
        (it.lineWeightGrams ? Math.round(it.lineWeightGrams / itemQty) : 500);
      return {
        weightGrams: itemWeight,
        packageLengthCm: it.packageLengthCm,
        packageWidthCm: it.packageWidthCm,
        packageHeightCm: it.packageHeightCm,
        quantity: itemQty,
      };
    }),
  );
  const packageWeight = Math.max(100, Math.round(chargeableWeight));

  const hasInsurance = items.some((it) => it.isFragile === true);

  // Map products. Note: Tapin expects unit prices in Rials (Toman * 10).
  const products: TapinProductPayload[] = items.map((it) => {
    const itemQty = it.quantity || 1;
    const unitToman = it.unitPriceToman ?? it.unitToman ?? 0;
    const unitRials = Math.max(0, Math.round(unitToman * 10));
    const title = (it.productName || it.name || 'محصول').trim();
    const weight = Math.max(
      1,
      it.weightGrams ?? (it.lineWeightGrams ? Math.round(it.lineWeightGrams / itemQty) : 500),
    );

    return {
      count: itemQty,
      price: unitRials,
      title,
      weight,
      discount: 0,
      product_id: null,
    };
  });

  return {
    shop_id: shopId,
    description: 'سفارش فروشگاه پات استور',
    address: fullAddress,
    city_code: rawCityCode,
    province_code: rawProvinceCode,
    email: null,
    employee_code: '-1',
    first_name: firstName,
    last_name: lastName,
    mobile,
    phone: null,
    postal_code: postalCode,
    pay_type: '1',
    order_type: '1',
    package_weight: packageWeight,
    box_id: 1,
    packet_type: 2,
    has_insurance: hasInsurance,
    content_type: 2,
    products,
  };
}

/**
 * Calculates live shipping rates using Tapin Pishtaz Post check-price API.
 * Converts Rials returned by Tapin into Toman (divided by 10, rounded up).
 * Implements a strict 15-second timeout and graceful fallback to 50,000 Toman.
 */
export async function calculateTapinRate(
  address: ShippingAddressLike,
  items: ShippingItemLike[],
): Promise<{ costToman: number; rawRials?: number; isFallback?: boolean }> {
  const totalWeight = items.reduce((sum, item) => {
    const qty = Math.max(1, item.quantity || 1);
    const itemWeight =
      item.weightGrams !== undefined && item.weightGrams !== null
        ? item.weightGrams
        : item.lineWeightGrams
        ? Math.round(item.lineWeightGrams / qty)
        : 500;
    return sum + itemWeight * qty;
  }, 0);

  if (totalWeight > MAX_POST_WEIGHT_GRAMS) {
    throw new Error('WEIGHT_LIMIT_EXCEEDED');
  }

  const rawCityCode =
    address.cityCode !== undefined && address.cityCode !== null
      ? String(address.cityCode).trim()
      : '';
  const rawProvinceCode =
    address.provinceCode !== undefined && address.provinceCode !== null
      ? String(address.provinceCode).trim()
      : '';

  // If address has missing or empty province/city codes (e.g. legacy address),
  // immediately fallback to default rate instead of calling Tapin with invalid codes.
  if (!rawProvinceCode || !rawCityCode) {
    console.warn(
      `[tapin-rates] Missing provinceCode (${rawProvinceCode || 'empty'}) or cityCode (${rawCityCode || 'empty'}). Falling back to default rate directly without calling Tapin.`,
    );
    return { costToman: FALLBACK_SHIPPING_COST_TOMAN, isFallback: true };
  }

  const token = (process.env.TAPIN_API_TOKEN || '').trim();
  const authHeader = token.startsWith('Bearer ')
    ? token
    : token.startsWith('jwt ')
    ? token
    : `Bearer ${token}`;

  const payload = buildTapinPriceCheckPayload(address, items);

  console.log('[tapin-rates] Sending Payload:', JSON.stringify(payload, null, 2));

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch('https://api.tapin.ir/api/v2/public/order/post/check-price/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || data?.returns?.status !== 200) {
      console.error(
        '[tapin-rates] Tapin API Error:',
        data?.returns?.message,
        data?.entries,
      );
      throw new Error(data?.returns?.message || 'Tapin API failed');
    }

    const totalPriceRials = Number(data?.entries?.total_price);
    if (!Number.isFinite(totalPriceRials) || totalPriceRials < 0) {
      console.warn(
        '[tapin-rates] Invalid total_price received from Tapin:',
        data?.entries?.total_price,
      );
      return { costToman: FALLBACK_SHIPPING_COST_TOMAN, isFallback: true };
    }

    // Convert Rials to Toman
    const costToman = Math.ceil(totalPriceRials / 10);
    return {
      costToman,
      rawRials: totalPriceRials,
      isFallback: false,
    };
  } catch (err: unknown) {
    const isTimeout = err instanceof Error && err.name === 'AbortError';
    console.warn(
      `[tapin-rates] Request failed (${isTimeout ? '15s timeout' : (err as Error)?.message}), using fallback flat rate:`,
      FALLBACK_SHIPPING_COST_TOMAN,
    );
    return { costToman: FALLBACK_SHIPPING_COST_TOMAN, isFallback: true };
  } finally {
    clearTimeout(timeoutId);
  }
}

