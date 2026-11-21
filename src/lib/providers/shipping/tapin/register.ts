import { chunkItemsIntoBoxes } from '@/lib/shipping-utils';
import { logApiCall } from '@/lib/api-logger';
import {
  type ShippingAddressLike,
  type ShippingItemLike,
  type TapinProductPayload,
} from './rates';

export type TapinPackageConfig = {
  boxId: number;
  packageWeight: number; // Tare weight of empty box only (grams)
};

export type TapinRegisteredParcel = {
  barcode: string;
  trackingCode: string;
  orderId: string;
  boxId: number;
  packageWeight: number;
};

export type TapinRegisterResult = TapinRegisteredParcel[] & {
  barcode: string;
  trackingCode: string;
  orderId: string;
};

export type TapinRegisterPayload = {
  shop_id: string;
  register_type: number;
  manual_id?: string;
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
 * Constructs the exact payload for Tapin order registration.
 * Mirrors check-price payload with addition of register_type, manual_id, and specific package config.
 */
export function buildTapinRegisterPayload(
  address: ShippingAddressLike,
  items: ShippingItemLike[],
  boxId: number,
  packageWeight: number = 500,
  manualIdOrRegisterType?: string | number,
  registerTypeParam?: number,
): TapinRegisterPayload {
  let manualId: string | undefined;
  let registerType: number | undefined;

  if (typeof manualIdOrRegisterType === 'number') {
    registerType = manualIdOrRegisterType;
  } else if (typeof manualIdOrRegisterType === 'string') {
    manualId = manualIdOrRegisterType;
    registerType = registerTypeParam;
  } else if (registerTypeParam !== undefined) {
    registerType = registerTypeParam;
  }

  const shopId = process.env.TAPIN_SHOP_ID ? String(process.env.TAPIN_SHOP_ID).trim() : '';
  const resolvedRegisterType =
    registerType !== undefined ? registerType : Number(process.env.TAPIN_REGISTER_TYPE ?? 0) || 0;

  const fullAddress = `${address.line1 || ''} ${address.line2 || ''}`.trim();
  const rawCityCode =
    address.cityCode !== undefined && address.cityCode !== null ? String(address.cityCode) : '';
  const rawProvinceCode =
    address.provinceCode !== undefined && address.provinceCode !== null
      ? String(address.provinceCode)
      : '';

  const nameParts = (address.fullName || '').trim().split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] || 'مشتری';
  const lastName = nameParts.slice(1).join(' ') || 'فروشگاه';

  const mobile = (address.phone || '').trim();
  const postalCode = (address.postalCode || '').trim();

  // Map products. Tapin expects unit prices in Rials (Toman * 10).
  const products: TapinProductPayload[] = items.map((it) => {
    const count = Math.max(1, Number(it.quantity) || 1);
    const unitToman = Number(it.unitPriceToman ?? it.unitToman ?? 0);
    const unitRials = Math.max(0, Math.round(unitToman * 10));
    const title = (it.productName || it.name || 'محصول').trim();

    // The weight for Tapin MUST be the unit weight of a single product/bundle, NOT total line weight.
    const weight = Math.max(1, Number(it.weightGrams ?? 500));

    return {
      count,
      price: unitRials,
      title,
      weight,
      discount: 0,
      product_id: null,
    };
  });

  const payload: TapinRegisterPayload = {
    shop_id: shopId,
    register_type: resolvedRegisterType,
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
    package_weight: Number(packageWeight), // Box tare weight only
    box_id: Number(boxId),
    packet_type: 2,
    has_insurance: false,
    pre_paid_price: 0,
    packaging_price: 0,
    non_standard_package: false,
    parcel_turning: true,
    kiosk_id: 0,
    duration: 48,
    products,
  };

  if (manualId) {
    payload.manual_id = String(manualId);
  }

  return payload;
}

export type OrderShippingSource = {
  orderNumber?: string | null;
  shipFullName?: string | null;
  shipPhone?: string | null;
  shipProvinceCode?: number | string | null;
  shipCityCode?: number | string | null;
  shipPostalCode?: string | null;
  shipLine1?: string | null;
  shipLine2?: string | null;
  fullName?: string | null;
  phone?: string | null;
  provinceCode?: number | string | null;
  cityCode?: number | string | null;
  postalCode?: string | null;
  line1?: string | null;
  line2?: string | null;
  items: ShippingItemLike[];
};

/**
 * Registers a single parcel box with Tapin POST /api/v2/public/order/post/register/.
 */
export async function registerSingleTapinBox(
  address: ShippingAddressLike,
  items: ShippingItemLike[],
  boxId: number = 5,
  packageWeight: number = 1500,
  manualId?: string,
): Promise<TapinRegisteredParcel> {
  const rawCityCode =
    address.cityCode !== undefined && address.cityCode !== null
      ? String(address.cityCode).trim()
      : '';
  const rawProvinceCode =
    address.provinceCode !== undefined && address.provinceCode !== null
      ? String(address.provinceCode).trim()
      : '';

  if (!rawProvinceCode || !rawCityCode) {
    throw new Error('کد استان یا کد شهر گیرنده نامعتبر است.');
  }

  const token = (process.env.TAPIN_API_TOKEN || '').trim();
  const authHeader = token.startsWith('Bearer ')
    ? token
    : token.startsWith('jwt ')
    ? token
    : `Bearer ${token}`;

  const payload = buildTapinRegisterPayload(
    address,
    items,
    boxId,
    packageWeight,
    manualId,
  );

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch('https://api.tapin.ir/api/v2/public/order/post/register/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const data = await res.json().catch(() => null);
    logApiCall('tapin', '/api/v2/public/order/post/register/', payload, data);

    if (!res.ok || data?.returns?.status !== 200) {
      const errMsg =
        data?.returns?.message ||
        (data?.entries ? JSON.stringify(data.entries) : null) ||
        `خطا در ثبت سفارش در تاپین (کد خطا: ${data?.returns?.status || res.status})`;
      throw new Error(errMsg);
    }

    const entry = Array.isArray(data.entries) ? data.entries[0] : data.entries;
    const barcode = String(entry?.barcode || '').trim();
    const trackingCode = String(
      entry?.tracking_code || entry?.track_code || entry?.post_tracking_code || '',
    ).trim();
    const orderId = String(entry?.order_id || entry?.id || '').trim();

    return {
      barcode,
      trackingCode,
      orderId,
      boxId,
      packageWeight,
    };
  } catch (err: unknown) {
    const isTimeout = err instanceof Error && err.name === 'AbortError';
    if (isTimeout) {
      throw new Error('پاسخی از تاپین دریافت نشد (مهلت زمانی ۱۵ ثانیه پایان یافت).');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Registers an order with Tapin POST /api/v2/public/order/post/register/.
 * Supports:
 *   registerTapinOrder(order, selectedBoxId, packageWeight)
 * as well as array of package configs for backward compatibility.
 */
export async function registerTapinOrder(
  order: OrderShippingSource,
  selectedBoxIdOrPackages: number | TapinPackageConfig[] = 5,
  packageWeightParam: number = 500,
): Promise<TapinRegisterResult> {
  let packages: TapinPackageConfig[];

  if (typeof selectedBoxIdOrPackages === 'number') {
    packages = [{ boxId: selectedBoxIdOrPackages, packageWeight: packageWeightParam }];
  } else if (Array.isArray(selectedBoxIdOrPackages)) {
    if (selectedBoxIdOrPackages.length === 0) {
      throw new Error('حداقل یک بسته برای ثبت سفارش الزامی است.');
    }
    packages = selectedBoxIdOrPackages;
  } else {
    packages = [{ boxId: 5, packageWeight: 500 }];
  }

  const address: ShippingAddressLike = {
    fullName: order.shipFullName || order.fullName,
    phone: order.shipPhone || order.phone,
    provinceCode: order.shipProvinceCode ?? order.provinceCode,
    cityCode: order.shipCityCode ?? order.cityCode,
    postalCode: order.shipPostalCode || order.postalCode,
    line1: order.shipLine1 || order.line1,
    line2: order.shipLine2 || order.line2,
  };

  const rawCityCode =
    address.cityCode !== undefined && address.cityCode !== null
      ? String(address.cityCode).trim()
      : '';
  const rawProvinceCode =
    address.provinceCode !== undefined && address.provinceCode !== null
      ? String(address.provinceCode).trim()
      : '';

  if (!rawProvinceCode || !rawCityCode) {
    throw new Error('کد استان یا کد شهر گیرنده نامعتبر است.');
  }

  const token = (process.env.TAPIN_API_TOKEN || '').trim();
  const authHeader = token.startsWith('Bearer ')
    ? token
    : token.startsWith('jwt ')
    ? token
    : `Bearer ${token}`;

  // Distribute items across packages
  let itemChunks = chunkItemsIntoBoxes(order.items, 29000);
  if (itemChunks.length === 0 || (itemChunks.length === 1 && itemChunks[0].length === 0)) {
    itemChunks = [order.items];
  }

  // If order requires multiple boxes (>29kg) but only 1 package config was passed, replicate it
  if (packages.length === 1 && itemChunks.length > 1) {
    const basePkg = packages[0];
    packages = itemChunks.map(() => ({ ...basePkg }));
  } else if (packages.length > itemChunks.length) {
    // If admin explicitly requested more packages than default 29kg chunks,
    // re-chunk with lower weight per box so items are distributed across packages.
    const totalActualWeight = order.items.reduce((sum, it) => {
      const q = Math.max(1, it.quantity || 1);
      const w = Math.max(
        1,
        (it as Record<string, unknown>).lineWeightGrams
          ? Math.round(Number((it as Record<string, unknown>).lineWeightGrams) / q)
          : (it.weightGrams ?? 500),
      );
      return sum + w * q;
    }, 0);
    const targetChunkWeight = Math.max(100, Math.ceil(totalActualWeight / packages.length));
    const rechunked = chunkItemsIntoBoxes(order.items, targetChunkWeight);
    if (rechunked.length > 0 && rechunked[0].length > 0) {
      itemChunks = rechunked;
    }
  }

  // Ensure packages and itemChunks are synchronized
  while (packages.length < itemChunks.length) {
    packages.push({ ...packages[packages.length - 1] });
  }
  if (packages.length > itemChunks.length) {
    packages = packages.slice(0, itemChunks.length);
  }

  const results: TapinRegisteredParcel[] = [];

  for (let i = 0; i < packages.length; i++) {
    const pkg = packages[i];
    const pkgItems = itemChunks[i];
    if (!pkgItems || pkgItems.length === 0) continue;

    const manualId = order.orderNumber
      ? packages.length > 1
        ? `${order.orderNumber}-${i + 1}`
        : String(order.orderNumber)
      : undefined;

    const parcel = await registerSingleTapinBox(
      address,
      pkgItems,
      pkg.boxId,
      pkg.packageWeight,
      manualId,
    );
    results.push(parcel);
  }

  const primaryBarcode = results.map((r) => r.barcode).filter(Boolean).join(', ') || results[0]?.barcode || '';
  const primaryTracking = results.map((r) => r.trackingCode).filter(Boolean).join(', ') || results[0]?.trackingCode || '';
  const primaryOrderId = results.map((r) => r.orderId).filter(Boolean).join(', ') || results[0]?.orderId || '';

  return Object.assign(results, {
    barcode: primaryBarcode,
    trackingCode: primaryTracking,
    orderId: primaryOrderId,
  });
}

