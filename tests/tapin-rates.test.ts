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
    // Package weight represents only the empty cardboard box (500g)
    assert.equal(payload.package_weight, 500);
    assert.equal(payload.box_id, 5);
    assert.equal(payload.packet_type, 2);
    assert.equal(payload.has_insurance, false);
    assert.equal(payload.pre_paid_price, 0);
    assert.equal(payload.packaging_price, 0);
    assert.equal(payload.non_standard_package, false);
    assert.equal(payload.parcel_turning, true);
    assert.equal(payload.kiosk_id, 0);
    assert.equal(payload.duration, 48);

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

  test('weight in products payload is the unit weight of a single product (8700g), NOT line weight (17400g)', () => {
    const address: ShippingAddressLike = {
      fullName: 'مشتری تست',
      phone: '09121112233',
      postalCode: '1234567890',
      line1: 'تهران',
    };

    const items: ShippingItemLike[] = [
      {
        productName: 'ست دو عددی گلدان',
        quantity: 2,
        unitPriceToman: 200000,
        weightGrams: 8700,
        lineWeightGrams: 17400,
      } as any,
    ];

    const payload = buildTapinPriceCheckPayload(address, items);
    assert.equal(payload.products.length, 1);
    assert.equal(payload.products[0].count, 2);
    // MUST be unit weight (8700g), NOT 17400g
    assert.equal(payload.products[0].weight, 8700);
  });

  test('package_weight is always 500g (empty box tare weight) across different items', () => {
    const address: ShippingAddressLike = {
      fullName: 'رضا کمالی',
      phone: '09121112233',
      postalCode: '1234567890',
      line1: 'اصفهان',
    };

    const items: ShippingItemLike[] = [
      {
        productName: 'گلدان سبک بزرگ',
        quantity: 2,
        unitPriceToman: 200000,
        weightGrams: 600,
      },
    ];

    const payload = buildTapinPriceCheckPayload(address, items);
    assert.equal(payload.package_weight, 500);
    assert.equal(payload.box_id, 5);
    assert.equal(payload.has_insurance, false);
    assert.equal(payload.pre_paid_price, 0);
    assert.equal(payload.packaging_price, 0);
    assert.equal(payload.non_standard_package, false);
    assert.equal(payload.parcel_turning, true);
    assert.equal(payload.kiosk_id, 0);
    assert.equal(payload.duration, 48);
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

  test('throws error when Tapin returns HTTP 200 with error status (e.g. 300 / 304)', async () => {
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

    const items: any[] = [
      {
        id: 'test-pot-1',
        productName: 'گلدان تستی',
        quantity: 1,
        priceToman: 100000,
        weightGrams: 500,
      },
    ];

    await assert.rejects(
      async () => {
        await calculateTapinRate(
          {
            fullName: 'کاربر تست',
            phone: '09120000000',
            provinceCode: 8,
            cityCode: 801,
            postalCode: '1234567890',
            line1: 'تهران',
          },
          items
        );
      },
      (err: Error) => {
        assert.equal(err.message, 'description is required');
        return true;
      }
    );
  });

  test('throws error when fetch throws or times out without silent fallback', async () => {
    globalThis.fetch = async () => {
      throw new Error('Connection refused or timeout');
    };

    const items: any[] = [
      {
        id: 'test-pot-1',
        productName: 'گلدان تستی',
        quantity: 1,
        priceToman: 100000,
        weightGrams: 500,
      },
    ];

    await assert.rejects(
      async () => {
        await calculateTapinRate(
          {
            fullName: 'کاربر تست',
            phone: '09120000000',
            provinceCode: 8,
            cityCode: 801,
            postalCode: '1234567890',
            line1: 'تهران',
          },
          items
        );
      },
      (err: Error) => {
        assert.equal(err.message, 'Connection refused or timeout');
        return true;
      }
    );
  });

  test('chunks a 39kg heavy order into exactly 2 boxes in parallel and sums up the prices', async () => {
    let callCount = 0;
    const capturedPayloads: any[] = [];

    globalThis.fetch = async (_url: any, init: any) => {
      callCount++;
      if (init?.body) {
        capturedPayloads.push(JSON.parse(String(init.body)));
      }
      return new Response(
        JSON.stringify({
          returns: { status: 200, message: 'OK' },
          entries: {
            total_price: 450000, // 450,000 Rials each box
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const address: ShippingAddressLike = {
      fullName: 'کاربر سفارش حجیم',
      phone: '09120000000',
      provinceCode: 8,
      cityCode: 801,
      postalCode: '1234567890',
      line1: 'تهران',
    };

    // 39 units of 1,000g = 39,000g -> splits into Box 1 (28 units) and Box 2 (11 units)
    const items: any[] = [
      {
        id: 'bulk-pot',
        productName: 'گلدان عمده',
        quantity: 39,
        priceToman: 100000,
        weightGrams: 1000,
      },
    ];

    const result = await calculateTapinRate(address, items);

    // Exactly 2 parallel calls executed
    assert.equal(callCount, 2);
    assert.equal(capturedPayloads.length, 2);

    // Each box has package_weight: 1500 (1.5kg empty box tare)
    assert.equal(capturedPayloads[0].package_weight, 1500);
    assert.equal(capturedPayloads[1].package_weight, 1500);

    // Box 1 has 28 units (28,000g), Box 2 has 11 units (11,000g)
    assert.equal(capturedPayloads[0].products[0].count, 28);
    assert.equal(capturedPayloads[1].products[0].count, 11);

    // Total quantity strictly conserved: 28 + 11 = 39
    assert.equal(capturedPayloads[0].products[0].count + capturedPayloads[1].products[0].count, 39);

    // Sum: 450,000 + 450,000 = 900,000 Rials = 90,000 Toman
    assert.equal(result.costToman, 90000);
  });

  test('throws error if ANY of the parallel multi-box calls fails', async () => {
    let callIndex = 0;
    globalThis.fetch = async () => {
      callIndex++;
      if (callIndex === 2) {
        // Second box fails
        return new Response(
          JSON.stringify({
            returns: { status: 500, message: 'Tapin internal server error' },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({
          returns: { status: 200, message: 'OK' },
          entries: { total_price: 400000 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const address: ShippingAddressLike = {
      fullName: 'کاربر تست خطا',
      phone: '09120000000',
      provinceCode: 8,
      cityCode: 801,
      postalCode: '1234567890',
      line1: 'تهران',
    };

    const items: any[] = [
      {
        id: 'bulk-pot',
        productName: 'گلدان عمده',
        quantity: 50,
        priceToman: 100000,
        weightGrams: 1000, // 50,000g -> 2 boxes
      },
    ];

    await assert.rejects(
      async () => {
        await calculateTapinRate(address, items);
      },
      (err: Error) => {
        assert.equal(err.message, 'Tapin internal server error');
        return true;
      }
    );
  });

  test('preserves distinct product counts across multiple boxes (4 heavy pots and 3 medium pots)', async () => {
    let callCount = 0;
    const capturedPayloads: any[] = [];

    globalThis.fetch = async (_url: any, init: any) => {
      callCount++;
      if (init?.body) {
        capturedPayloads.push(JSON.parse(String(init.body)));
      }
      return new Response(
        JSON.stringify({
          returns: { status: 200, message: 'OK' },
          entries: {
            total_price: 350000,
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const address: ShippingAddressLike = {
      fullName: 'کاربر تست پات',
      phone: '09120000000',
      provinceCode: 8,
      cityCode: 801,
      postalCode: '1234567890',
      line1: 'تهران',
    };

    // 4 heavy pots (8000g each) + 3 medium pots (5000g each)
    // Box 1 (max 29,000g): 3 heavy pots = 24,000g + 500g tare = 24,500g (remaining: 4,500g)
    // 4th heavy pot (8000g) and medium pots (5000g) cannot fit in Box 1.
    // Box 2: 1 heavy pot (8000g) + 3 medium pots (15000g) + 500g tare = 23,500g
    // Result: Box 1 = [3 heavy pots], Box 2 = [1 heavy pot, 3 medium pots]
    const items: any[] = [
      {
        id: 'heavy-pot',
        productName: 'گلدان سنگین',
        quantity: 4,
        priceToman: 150000,
        weightGrams: 8000,
      },
      {
        id: 'medium-pot',
        productName: 'گلدان متوسط',
        quantity: 3,
        priceToman: 50000,
        weightGrams: 5000,
      },
    ];

    const result = await calculateTapinRate(address, items);

    // Exactly 2 API calls
    assert.equal(callCount, 2);
    assert.equal(capturedPayloads.length, 2);

    // Box 1: exactly 3 heavy pots
    assert.equal(capturedPayloads[0].products.length, 1);
    const box1Heavy = capturedPayloads[0].products.find((p: any) => p.title === 'گلدان سنگین');
    assert.ok(box1Heavy);
    assert.equal(box1Heavy.count, 3);

    // Box 2: exactly 1 heavy pot and 3 medium pots
    assert.equal(capturedPayloads[1].products.length, 2);
    const box2Heavy = capturedPayloads[1].products.find((p: any) => p.title === 'گلدان سنگین');
    const box2Medium = capturedPayloads[1].products.find((p: any) => p.title === 'گلدان متوسط');
    assert.ok(box2Heavy);
    assert.ok(box2Medium);
    assert.equal(box2Heavy.count, 1);
    assert.equal(box2Medium.count, 3);

    // Total heavy pots strictly equal to 4 (NOT duplicated or overlapping)
    assert.equal(box1Heavy.count + box2Heavy.count, 4);

    // Total medium pots strictly equal to 3
    assert.equal(box2Medium.count, 3);

    // Sum of 2 boxes: 350,000 + 350,000 = 700,000 Rials = 70,000 Toman
    assert.equal(result.costToman, 70000);
  });
});
