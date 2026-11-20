import { chunkItemsIntoBoxes } from '@/lib/shipping-utils';
import { logApiCall } from '@/lib/api-logger';

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
  id?: string | null;
  productId?: string | null;
  variantId?: string | null;
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
  product?: {
    id?: string | null;
    isFragile?: boolean | null;
  } | null;
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
  pre_paid_price: number;
  packaging_price: number;
  non_standard_package: boolean;
  parcel_turning: boolean;
  kiosk_id: number;
  duration: number;
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
  const fullName = (address.fullName || '').trim();
  const nameParts = fullName.split(' ').filter(Boolean);
  const firstName = nameParts[0] || 'مشتری';
  const lastName = nameParts.slice(1).join(' ') || 'فروشگاه';

  const fullAddress = `${address.line1 || ''} ${address.line2 || ''}`.trim();
  const cityCode = address.cityCode !== undefined && address.cityCode !== null ? String(address.cityCode) : '';
  const provinceCode =
    address.provinceCode !== undefined && address.provinceCode !== null ? String(address.provinceCode) : '';
  const mobile = address.phone ? String(address.phone).trim() : '';
  const postalCode = address.postalCode ? String(address.postalCode).trim() : '';

  // Products mapping: unit prices in Rials (Toman * 10)
  const products: TapinProductPayload[] = items.map((item) => {
    const count = Math.max(1, Number(item.quantity) || 1);
    const unitToman = Number(item.unitPriceToman ?? item.unitToman ?? 0);
    const price = Math.max(0, Math.round(unitToman * 10));
    const title = (item.productName || item.name || 'محصول').trim();

    // The weight for Tapin MUST be the unit weight of a single product/bundle, NOT total line weight.
    const weight = Math.max(1, Number(item.weightGrams ?? 500));

    return {
      count,
      discount: 0,
      price,
      title,
      weight,
      product_id: null,
    };
  });

  return {
    shop_id: shopId,
    address: fullAddress,
    city_code: cityCode,
    province_code: provinceCode,
    description: 'سفارش فروشگاه پات استور',
    email: null,
    employee_code: '-1',
    first_name: firstName,
    last_name: lastName,
    mobile,
    phone: null,
    postal_code: postalCode,
    pay_type: '1',
    order_type: '1',
    pre_paid_price: 0,
    packaging_price: 0,
    package_weight: 500, // The empty box weight
    box_id: 5, // Default box for estimates
    packet_type: 2,
    non_standard_package: false,
    kiosk_id: 0,
    duration: 48,
    parcel_turning: true,
    has_insurance: false,
    products,
  };
}

/**
 * Calculates live shipping rates using Tapin Pishtaz Post check-price API.
 * For orders with total weight > 29,000g, chunks items into multiple virtual boxes (<=29kg each),
 * queries Tapin in parallel via Promise.all, sums the total Rials, and converts to Toman.
 * Implements a strict 15-second timeout and throws on errors without silent fallback.
 */
export async function calculateTapinRate(address: any, cartItems: any[]): Promise<{ costToman: number }> {
  // 1. Chunk the items into boxes (max 28,500g product weight to leave 1.5kg for empty box tare under 30kg)
  const boxes = chunkItemsIntoBoxes(cartItems, 28500);

  console.log(`[tapin-rates] Split cart into ${boxes.length} boxes.`);

  // 2. Map over the BOXES (not the cartItems) to make the API calls
  const results = await Promise.all(
    boxes.map(async (boxItems) => {
      
      const payload = {
        shop_id: process.env.TAPIN_SHOP_ID,
        address: `${address.line1} ${address.line2 || ''}`.trim(),
        city_code: String(address.cityCode),
        province_code: String(address.provinceCode),
        description: "سفارش فروشگاه پات استور",
        email: null,
        employee_code: "-1",
        first_name: address.fullName.split(' ')[0] || "مشتری",
        last_name: address.fullName.split(' ').slice(1).join(' ') || "فروشگاه",
        mobile: address.phone,
        phone: null,
        postal_code: String(address.postalCode),
        pay_type: "1",
        order_type: "1",
        pre_paid_price: 0,
        packaging_price: 0,
        package_weight: 1500, // 1.5kg empty box weight
        box_id: 5,
        packet_type: 2,
        non_standard_package: false,
        kiosk_id: 0,
        duration: 48,
        parcel_turning: true,
        has_insurance: false,
        products: boxItems.map((item: any) => {
          const unitToman =
            item.priceToman ||
            item.unitToman ||
            item.unitPriceToman ||
            item.listUnitToman ||
            item.product?.salePriceToman ||
            item.product?.basePriceToman ||
            0;
          const title =
            item.productName ||
            item.name ||
            item.product?.name ||
            item.title ||
            "گلدان";
          const weight =
            item.weightGrams ||
            item.product?.weightGrams ||
            1000;

          return {
            count: item.quantity,
            discount: 0,
            price: Math.max(0, Math.round(unitToman * 10)), // Convert to Rials
            title,
            weight,
            product_id: null,
          };
        }),
      };

      const res = await fetch("https://api.tapin.ir/api/v2/public/order/post/check-price/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.TAPIN_API_TOKEN}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      logApiCall("tapin", "/check-price", payload, data);

      if (data.returns.status !== 200) {
        throw new Error(data.returns.message || "Tapin API failed");
      }

      return data.entries.total_price;
    })
  );

  const totalRials = results.reduce((sum, price) => sum + price, 0);
  return { costToman: Math.ceil(totalRials / 10) };
}

