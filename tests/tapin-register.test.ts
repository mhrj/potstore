import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  buildTapinRegisterPayload,
  registerTapinOrder,
  registerSingleTapinBox,
} from '../src/lib/providers/shipping/tapin/register';
import {
  fetchTapinBoxes,
  DEFAULT_TAPIN_BOXES,
} from '../src/lib/providers/shipping/tapin/boxes';

describe('Tapin Boxes Module', () => {
  it('returns default boxes if API returns non-200 or fails', async () => {
    // When API returns 349 or is offline, fetchTapinBoxes returns standard boxes
    const boxes = await fetchTapinBoxes();
    assert.ok(Array.isArray(boxes));
    assert.ok(boxes.length > 0);
    assert.strictEqual(boxes[0].id, DEFAULT_TAPIN_BOXES[0].id);
    const box5 = boxes.find((b) => b.id === 5);
    assert.ok(box5, 'Box 5 must be in available boxes');
    assert.strictEqual(box5.weight, 30000);
  });
});

describe('Tapin Register Payload Construction', () => {
  const address = {
    fullName: 'علی رضایی',
    phone: '09121234567',
    province: 'تهران',
    provinceCode: 8,
    city: 'تهران',
    cityCode: 301,
    postalCode: '1234567890',
    line1: 'خیابان ولیعصر کوچه بنفشه',
    line2: 'پلاک ۱۰ واحد ۳',
  };

  const items = [
    {
      productName: 'گلدان سرامیکی آفتاب',
      quantity: 2,
      unitPriceToman: 150000,
      weightGrams: 1200,
      isFragile: true,
    },
    {
      productName: 'زیرگلدانی بتنی',
      quantity: 1,
      unitPriceToman: 50000,
      weightGrams: 800,
      isFragile: false,
    },
  ];

  it('builds payload with register_type: 0 by default, empty box tare weight, and Rial prices', () => {
    const payload = buildTapinRegisterPayload(address, items, 5, 500);

    // register_type defaults to 0 (under review)
    assert.strictEqual(payload.register_type, 0);

    // empty box weight ONLY (tare weight), not sum of products
    assert.strictEqual(payload.package_weight, 500);
    assert.strictEqual(payload.box_id, 5);

    // recipient address mapping
    assert.strictEqual(payload.city_code, '301');
    assert.strictEqual(payload.province_code, '8');
    assert.strictEqual(payload.first_name, 'علی');
    assert.strictEqual(payload.last_name, 'رضایی');
    assert.strictEqual(payload.mobile, '09121234567');
    assert.strictEqual(payload.postal_code, '1234567890');
    assert.strictEqual(payload.address, 'خیابان ولیعصر کوچه بنفشه پلاک ۱۰ واحد ۳');

    // products mapping and Rial price conversion (Toman * 10)
    assert.strictEqual(payload.products.length, 2);
    assert.strictEqual(payload.products[0].title, 'گلدان سرامیکی آفتاب');
    assert.strictEqual(payload.products[0].count, 2);
    assert.strictEqual(payload.products[0].price, 1500000); // 150,000 * 10
    assert.strictEqual(payload.products[0].weight, 1200);

    assert.strictEqual(payload.products[1].title, 'زیرگلدانی بتنی');
    assert.strictEqual(payload.products[1].count, 1);
    assert.strictEqual(payload.products[1].price, 500000); // 50,000 * 10
    assert.strictEqual(payload.products[1].weight, 800);
  });

  it('allows overriding register_type (e.g. 2 for ready to ship)', () => {
    const payload = buildTapinRegisterPayload(address, items, 4, 600, 2);
    assert.strictEqual(payload.register_type, 2);
    assert.strictEqual(payload.box_id, 4);
    assert.strictEqual(payload.package_weight, 600);
    assert.strictEqual(payload.non_standard_package, false);
  });

  it('sets non_standard_package: true and box_id: 10 when isNonStandard is true', () => {
    const payload = buildTapinRegisterPayload(address, items, 5, 1500, 'PS-99', 0, true);
    assert.strictEqual(payload.non_standard_package, true);
    assert.strictEqual(payload.box_id, 10);
    assert.strictEqual(payload.package_weight, 1500);
    assert.strictEqual(payload.manual_id, 'PS-99');
  });
});

describe('Tapin Order Registration Service', () => {
  it('throws error if packages array is empty', async () => {
    await assert.rejects(
      async () => {
        await registerTapinOrder(
          {
            shipFullName: 'رضا کمالی',
            shipPhone: '09120000000',
            shipProvinceCode: 8,
            shipCityCode: 301,
            items: [],
          },
          [],
        );
      },
      {
        message: 'حداقل یک بسته برای ثبت سفارش الزامی است.',
      },
    );
  });

  it('throws error if destination province or city code is missing', async () => {
    await assert.rejects(
      async () => {
        await registerTapinOrder(
          {
            shipFullName: 'رضا کمالی',
            shipPhone: '09120000000',
            shipProvinceCode: null,
            shipCityCode: null,
            items: [],
          },
          [{ boxId: 5, packageWeight: 500 }],
        );
      },
      {
        message: 'کد استان یا کد شهر گیرنده نامعتبر است.',
      },
    );
  });

  it('handles Tapin error responses gracefully with clear Persian error message', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      return new Response(
        JSON.stringify({
          returns: {
            status: 322,
            message: 'فروشگاه مورد نظر یافت نشد',
          },
          entries: [],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    };

    try {
      await assert.rejects(
        async () => {
          await registerTapinOrder(
            {
              shipFullName: 'رضا کمالی',
              shipPhone: '09120000000',
              shipProvinceCode: 8,
              shipCityCode: 301,
              shipPostalCode: '1111111111',
              shipLine1: 'خیابان حافظ',
              items: [
                {
                  productName: 'محصول ۱',
                  quantity: 1,
                  unitPriceToman: 10000,
                  weightGrams: 500,
                },
              ],
            },
            [{ boxId: 5, packageWeight: 500 }],
          );
        },
        {
          message: 'فروشگاه مورد نظر یافت نشد',
        },
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('successfully extracts barcode and tracking_code from successful Tapin response', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      return new Response(
        JSON.stringify({
          returns: {
            status: 200,
            message: 'عملیات با موفقیت انجام شد',
          },
          entries: {
            barcode: '98765432101234567890',
            tracking_code: 'TPN-123456',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    };

    try {
      const parcels = await registerTapinOrder(
        {
          shipFullName: 'رضا کمالی',
          shipPhone: '09120000000',
          shipProvinceCode: 8,
          shipCityCode: 301,
          shipPostalCode: '1111111111',
          shipLine1: 'خیابان حافظ',
          items: [
            {
              productName: 'محصول ۱',
              quantity: 1,
              unitPriceToman: 10000,
              weightGrams: 500,
            },
          ],
        },
        [{ boxId: 5, packageWeight: 500 }],
      );

      assert.strictEqual(parcels.length, 1);
      assert.strictEqual(parcels[0].barcode, '98765432101234567890');
      assert.strictEqual(parcels[0].trackingCode, 'TPN-123456');
      assert.strictEqual(parcels[0].boxId, 5);
      assert.strictEqual(parcels[0].packageWeight, 500);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('registers multiple packages in sequence and aggregates barcodes and tracking codes', async () => {
    const originalFetch = globalThis.fetch;
    const capturedPayloads: any[] = [];
    let callCount = 0;

    globalThis.fetch = async (url: any, options: any) => {
      callCount++;
      if (options?.body) {
        capturedPayloads.push(JSON.parse(options.body));
      }
      return new Response(
        JSON.stringify({
          returns: { status: 200, message: 'موفق' },
          entries: {
            barcode: `BARCODE-BOX-${callCount}`,
            tracking_code: `TRACK-BOX-${callCount}`,
            order_id: `TPN-ORD-${callCount}`,
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    };

    try {
      const parcels = await registerTapinOrder(
        {
          orderNumber: 'PS-1002',
          shipFullName: 'محمد علوی',
          shipPhone: '09123334455',
          shipProvinceCode: 8,
          shipCityCode: 301,
          shipPostalCode: '1234567890',
          shipLine1: 'خیابان شریعتی',
          items: [
            { productName: 'گلدان بزرگ ۱', quantity: 1, unitPriceToman: 200000, weightGrams: 20000 },
            { productName: 'گلدان بزرگ ۲', quantity: 1, unitPriceToman: 200000, weightGrams: 15000 },
          ],
        },
        [
          { boxId: 5, packageWeight: 600 },
          { boxId: 4, packageWeight: 450 },
        ],
      );

      assert.strictEqual(parcels.length, 2);
      assert.strictEqual(capturedPayloads.length, 2);

      // Verify payload 1
      assert.strictEqual(capturedPayloads[0].box_id, 5);
      assert.strictEqual(capturedPayloads[0].package_weight, 600);
      assert.strictEqual(capturedPayloads[0].manual_id, 'PS-1002-1');

      // Verify payload 2
      assert.strictEqual(capturedPayloads[1].box_id, 4);
      assert.strictEqual(capturedPayloads[1].package_weight, 450);
      assert.strictEqual(capturedPayloads[1].manual_id, 'PS-1002-2');

      // Verify returned parcel properties
      assert.strictEqual(parcels[0].barcode, 'BARCODE-BOX-1');
      assert.strictEqual(parcels[0].trackingCode, 'TRACK-BOX-1');
      assert.strictEqual(parcels[1].barcode, 'BARCODE-BOX-2');
      assert.strictEqual(parcels[1].trackingCode, 'TRACK-BOX-2');

      // Verify primary combined fields
      assert.strictEqual(parcels.barcode, 'BARCODE-BOX-1, BARCODE-BOX-2');
      assert.strictEqual(parcels.trackingCode, 'TRACK-BOX-1, TRACK-BOX-2');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('automatically chunks a 39kg heavy order into 2 packages under 29kg limit', async () => {
    const originalFetch = globalThis.fetch;
    const capturedPayloads: any[] = [];
    let callCount = 0;

    globalThis.fetch = async (url: any, options: any) => {
      callCount++;
      if (options?.body) {
        capturedPayloads.push(JSON.parse(options.body));
      }
      return new Response(
        JSON.stringify({
          returns: { status: 200, message: 'موفق' },
          entries: {
            barcode: `BARCODE-39KG-${callCount}`,
            tracking_code: `TRACK-39KG-${callCount}`,
            order_id: `TPN-${callCount}`,
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    };

    try {
      // 39 items of 1000g each = 39,000g (39kg)
      const parcels = await registerTapinOrder(
        {
          orderNumber: 'PS-39KG',
          shipFullName: 'سارا امینی',
          shipPhone: '09129998877',
          shipProvinceCode: 8,
          shipCityCode: 301,
          shipPostalCode: '1999999999',
          shipLine1: 'خیابان نیلوفر',
          items: [
            { productName: 'گلدان بتنی استوانه‌ای', quantity: 39, unitPriceToman: 50000, weightGrams: 1000 },
          ],
        },
        // Single default box passed
        5,
        500,
      );

      assert.strictEqual(parcels.length, 2);
      assert.strictEqual(capturedPayloads.length, 2);

      // Box 1 must contain 28 units = 28,000g (<= 29kg limit)
      const box1TotalProductWeight = capturedPayloads[0].products.reduce(
        (sum: number, p: any) => sum + p.weight * p.count,
        0,
      );
      assert.strictEqual(box1TotalProductWeight, 28000);
      assert.ok(box1TotalProductWeight <= 29000);

      // Box 2 must contain remaining 11 units = 11,000g (<= 29kg limit)
      const box2TotalProductWeight = capturedPayloads[1].products.reduce(
        (sum: number, p: any) => sum + p.weight * p.count,
        0,
      );
      assert.strictEqual(box2TotalProductWeight, 11000);
      assert.ok(box2TotalProductWeight <= 29000);

      // Total quantity strictly conserved: 28 + 11 = 39
      assert.strictEqual(
        capturedPayloads[0].products[0].count + capturedPayloads[1].products[0].count,
        39,
      );

      assert.strictEqual(parcels[0].trackingCode, 'TRACK-39KG-1');
      assert.strictEqual(parcels[1].trackingCode, 'TRACK-39KG-2');
      assert.strictEqual(parcels.trackingCode, 'TRACK-39KG-1, TRACK-39KG-2');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('registerSingleTapinBox registers an individual box with manual_id and empty box tare weight', async () => {
    const originalFetch = globalThis.fetch;
    let capturedPayload: any = null;

    globalThis.fetch = async (url: any, options: any) => {
      capturedPayload = JSON.parse(options.body);
      return new Response(
        JSON.stringify({
          returns: { status: 200, message: 'عملیات با موفقیت انجام شد' },
          entries: {
            barcode: 'BARCODE-SINGLE-1',
            tracking_code: 'TRACK-SINGLE-1',
            order_id: 'TPN-BOX-1',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    };

    try {
      const parcel = await registerSingleTapinBox(
        {
          fullName: 'محمد رضایی',
          phone: '09213588041',
          provinceCode: 1,
          cityCode: 3351,
          postalCode: '3345892163',
          line1: 'شهریار، خیابان بهار',
        },
        [
          {
            productName: 'گلدان سرامیکی مدرن',
            quantity: 3,
            unitPriceToman: 250000,
            weightGrams: 8700,
          },
          {
            productName: 'گلدان بتنی کوچک',
            quantity: 1,
            unitPriceToman: 175400,
            weightGrams: 1500,
          },
        ],
        5,
        1500,
        'PS-1001-1',
      );

      assert.strictEqual(parcel.barcode, 'BARCODE-SINGLE-1');
      assert.strictEqual(parcel.trackingCode, 'TRACK-SINGLE-1');
      assert.strictEqual(parcel.orderId, 'TPN-BOX-1');
      assert.strictEqual(parcel.boxId, 5);
      assert.strictEqual(parcel.packageWeight, 1500);

      // Verify payload sent to Tapin
      assert.strictEqual(capturedPayload.manual_id, 'PS-1001-1');
      assert.strictEqual(capturedPayload.package_weight, 1500);
      assert.strictEqual(capturedPayload.box_id, 5);
      assert.strictEqual(capturedPayload.non_standard_package, false);
      assert.strictEqual(capturedPayload.products.length, 2);
      assert.strictEqual(capturedPayload.products[0].count, 3);
      assert.strictEqual(capturedPayload.products[0].weight, 8700);
      assert.strictEqual(capturedPayload.products[0].price, 2500000); // 250,000 * 10
      assert.strictEqual(capturedPayload.products[1].count, 1);
      assert.strictEqual(capturedPayload.products[1].weight, 1500);
      assert.strictEqual(capturedPayload.products[1].price, 1754000); // 175,400 * 10
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('registerSingleTapinBox and registerTapinOrder send non_standard_package: true and box_id: 10 when isNonStandard is true', async () => {
    const originalFetch = globalThis.fetch;
    const capturedPayloads: any[] = [];

    globalThis.fetch = async (url: any, options: any) => {
      capturedPayloads.push(JSON.parse(options.body));
      return new Response(
        JSON.stringify({
          returns: { status: 200, message: 'عملیات با موفقیت انجام شد' },
          entries: {
            barcode: 'BARCODE-NS-1',
            tracking_code: 'TRACK-NS-1',
            order_id: 'TPN-NS-1',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    };

    try {
      const parcel = await registerSingleTapinBox(
        {
          fullName: 'سارا محمدی',
          phone: '09121112233',
          provinceCode: 8,
          cityCode: 301,
          postalCode: '1234567890',
          line1: 'تهران، خیابان آزادی',
        },
        [
          {
            productName: 'گلدان بزرگ سفالی',
            quantity: 1,
            unitPriceToman: 400000,
            weightGrams: 5000,
          },
        ],
        5,
        1500,
        'PS-NS-1',
        true,
      );

      assert.strictEqual(parcel.isNonStandard, true);
      assert.strictEqual(parcel.boxId, 10);
      assert.strictEqual(capturedPayloads[0].non_standard_package, true);
      assert.strictEqual(capturedPayloads[0].box_id, 10);

      await registerTapinOrder(
        {
          orderNumber: 'PS-NS-2',
          shipFullName: 'سارا محمدی',
          shipPhone: '09121112233',
          shipProvinceCode: 8,
          shipCityCode: 301,
          shipPostalCode: '1234567890',
          shipLine1: 'تهران، خیابان آزادی',
          items: [
            {
              productName: 'گلدان بزرگ سفالی',
              quantity: 1,
              unitPriceToman: 400000,
              weightGrams: 5000,
            },
          ],
        },
        5,
        1500,
        true,
      );

      assert.strictEqual(capturedPayloads[1].non_standard_package, true);
      assert.strictEqual(capturedPayloads[1].box_id, 10);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

