import test, { describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateTapinRate,
  buildTapinPriceCheckPayload,
  FALLBACK_SHIPPING_COST_TOMAN,
  type ShippingAddressLike,
  type ShippingItemLike,
} from '../src/lib/providers/shipping/tapin/rates';

describe('Tapin Shipping Rates: buildTapinPriceCheckPayload', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      TAPIN_SHOP_ID: 'test-shop-123',
      TAPIN_API_TOKEN: 'test-token-xyz',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test('correctly maps address and items to the exact Tapin payload structure', () => {
    const address: ShippingAddressLike = {
      fullName: 'علی رضایی',
      phone: '09121234567',
      province: 'تهران',
      provinceCode: 8,
      city: 'تهران',
      cityCode: 801,
      postalCode: '1234567890',
      line1: 'خیابان ولیعصر، کوچه بنفشه',
      line2: 'پلاک ۱۰، واحد ۲',
    };

    const items: ShippingItemLike[] = [
      {
        productName: 'گلدان بتنی استوانه‌ای',
        quantity: 2,
        unitPriceToman: 150000,
        weightGrams: 800,
        packageLengthCm: 10,
        packageWidthCm: 10,
        packageHeightCm: 10,
        isFragile: true,
      },
      {
        productName: 'زیرگلدانی سرامیکی',
        quantity: 1,
        unitPriceToman: 50000,
        weightGrams: 300,
        packageLengthCm: 10,
        packageWidthCm: 10,
        packageHeightCm: 10,
        isFragile: false,
      },
    ];

    const payload = buildTapinPriceCheckPayload(address, items);

    assert.equal(payload.shop_id, 'test-shop-123');
    assert.equal(payload.description, 'سفارش فروشگاه پات استور');
    assert.equal(payload.address, 'خیابان ولیعصر، کوچه بنفشه پلاک ۱۰، واحد ۲');
    assert.equal(payload.city_code, '801');
    assert.equal(payload.province_code, '8');
    assert.equal(payload.email, null);
    assert.equal(payload.employee_code, '-1');
    assert.equal(payload.first_name, 'علی');
    assert.equal(payload.last_name, 'رضایی');
    assert.equal(payload.mobile, '09121234567');
    assert.equal(payload.phone, null);
    assert.equal(payload.postal_code, '1234567890');
    assert.equal(payload.pay_type, '1');
    assert.equal(payload.order_type, '1');
    // Actual weight: 800 * 2 + 300 = 1900g. Volumetric weight = 333 + 167 = 500g.
    // Max is 1900g.
    assert.equal(payload.package_weight, 1900);
    assert.equal(payload.box_id, 1);
    assert.equal(payload.packet_type, 2);
    assert.equal(payload.has_insurance, true);
    assert.equal(payload.content_type, 2);

    assert.equal(payload.products.length, 2);

    // Product 1: price in Rials (150,000 * 10 = 1,500,000)
    assert.deepEqual(payload.products[0], {
      count: 2,
      price: 1500000,
      title: 'گلدان بتنی استوانه‌ای',
      weight: 800,
      discount: 0,
      product_id: null,
    });

    // Product 2: price in Rials (50,000 * 10 = 500,000)
    assert.deepEqual(payload.products[1], {
      count: 1,
      price: 500000,
      title: 'زیرگلدانی سرامیکی',
      weight: 300,
      discount: 0,
      product_id: null,
    });
  });

  test('uses volumetric chargeable weight and disables insurance when not fragile', () => {
    const address: ShippingAddressLike = {
      fullName: 'رضا کمالی',
      phone: '09121112233',
      postalCode: '1234567890',
      line1: 'اصفهان',
    };

    // Bulky light item: 500g, 30x30x30cm (volumetric = 4500g)
    const items: ShippingItemLike[] = [
      {
        productName: 'گلدان سبک بزرگ',
        quantity: 1,
        unitPriceToman: 200000,
        weightGrams: 500,
        packageLengthCm: 30,
        packageWidthCm: 30,
        packageHeightCm: 30,
        isFragile: false,
      },
    ];

    const payload = buildTapinPriceCheckPayload(address, items);
    assert.equal(payload.package_weight, 4500);
    assert.equal(payload.has_insurance, false);
    assert.equal(payload.content_type, 2);
  });

  test('falls back to default first and last names if fullName is single word or empty', () => {
    const singleNameAddress: ShippingAddressLike = {
      fullName: 'علیرضا',
      phone: '09121234567',
      postalCode: '1111111111',
      line1: 'تهران',
      provinceCode: 8,
      cityCode: 801,
    };

    const p1 = buildTapinPriceCheckPayload(singleNameAddress, []);
    assert.equal(p1.first_name, 'علیرضا');
    assert.equal(p1.last_name, 'فروشگاه');

    const emptyNameAddress: ShippingAddressLike = {
      fullName: '',
      phone: '09121234567',
      postalCode: '1111111111',
      line1: 'تهران',
      provinceCode: 8,
      cityCode: 801,
    };
    const p2 = buildTapinPriceCheckPayload(emptyNameAddress, []);
    assert.equal(p2.first_name, 'مشتری');
    assert.equal(p2.last_name, 'فروشگاه');
  });
});

describe('Tapin Shipping Rates: calculateTapinRate network and conversion', () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      TAPIN_SHOP_ID: 'test-shop',
      TAPIN_API_TOKEN: 'test-token',
    };
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env = originalEnv;
  });

  test('converts Rials to Toman correctly (total_price / 10)', async () => {
    let capturedUrl = '';
    let capturedBody = '';

    globalThis.fetch = async (url: any, init: any) => {
      capturedUrl = String(url);
      capturedBody = init?.body ? String(init.body) : '';
      return new Response(
        JSON.stringify({
          returns: { status: 200, message: 'OK' },
          entries: {
            total_price: 685000, // 685,000 Rials = 68,500 Toman
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const address: ShippingAddressLike = {
      fullName: 'سارا احمدی',
      phone: '09129998877',
      provinceCode: 8,
      cityCode: 801,
      postalCode: '1234567890',
      line1: 'خیابان مطهری',
    };

    const items: ShippingItemLike[] = [
      {
        productName: 'گلدان سفید',
        quantity: 1,
        unitPriceToman: 100000,
        weightGrams: 500,
      },
    ];

    const result = await calculateTapinRate(address, items);

    assert.equal(capturedUrl, 'https://api.tapin.ir/api/v2/public/order/post/check-price/');
    assert.ok(capturedBody.includes('سارا'));
    assert.ok(capturedBody.includes('سفارش فروشگاه پات استور'));
    // 685,000 Rials / 10 = 68,500 Toman
    assert.equal(result.costToman, 68500);
  });

  test('returns fallback flat rate of 50,000 Toman when Tapin returns HTTP 200 with error status (e.g. 300 / 304)', async () => {
    globalThis.fetch = async () => {
      return new Response(
        JSON.stringify({
          returns: {
            status: 300,
            message: 'description is required',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const result = await calculateTapinRate(
      {
        fullName: 'کاربر تست',
        phone: '09120000000',
        provinceCode: 8,
        cityCode: 801,
        postalCode: '1234567890',
        line1: 'تهران',
      },
      []
    );

    assert.equal(result.costToman, FALLBACK_SHIPPING_COST_TOMAN);
    assert.equal(result.costToman, 50000);
  });

  test('returns fallback flat rate when fetch throws or times out', async () => {
    globalThis.fetch = async () => {
      throw new Error('Connection refused or timeout');
    };

    const result = await calculateTapinRate(
      {
        fullName: 'کاربر تست',
        phone: '09120000000',
        provinceCode: 8,
        cityCode: 801,
        postalCode: '1234567890',
        line1: 'تهران',
      },
      []
    );

    assert.equal(result.costToman, 50000);
  });

  test('immediately falls back without calling fetch if provinceCode or cityCode is missing', async () => {
    let fetchCalled = false;
    globalThis.fetch = async () => {
      fetchCalled = true;
      return new Response('{}', { status: 200 });
    };

    const result = await calculateTapinRate(
      {
        fullName: 'کاربر بدون کد',
        phone: '09120000000',
        provinceCode: null,
        cityCode: null,
        postalCode: '1234567890',
        line1: 'تهران',
      },
      []
    );

    assert.equal(fetchCalled, false);
    assert.equal(result.costToman, 50000);
    assert.equal(result.isFallback, true);
  });

  test('throws WEIGHT_LIMIT_EXCEEDED when total weight exceeds 30,000 grams', async () => {
    const address: ShippingAddressLike = {
      fullName: 'کاربر سنگین',
      phone: '09120000000',
      provinceCode: 8,
      cityCode: 801,
      postalCode: '1234567890',
      line1: 'تهران',
    };

    // 56.7 kg order
    const items: ShippingItemLike[] = [
      {
        productName: 'سفارش سنگین گلدان',
        quantity: 56,
        unitPriceToman: 100000,
        weightGrams: 1012, // 56 * 1012 = 56,672g > 30,000g
      },
    ];

    await assert.rejects(
      async () => {
        await calculateTapinRate(address, items);
      },
      (err: Error) => {
        assert.equal(err.message, 'WEIGHT_LIMIT_EXCEEDED');
        return true;
      }
    );
  });
});

