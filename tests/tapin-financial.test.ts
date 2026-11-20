import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  mapTapinStatus,
  mapTapinPayType,
  getTapinCredit,
  getTapinTransactions,
} from '../src/lib/providers/shipping/tapin/financial';

describe('Tapin Financial Helpers', () => {
  it('correctly maps status codes to Persian descriptions', () => {
    assert.deepStrictEqual(mapTapinStatus(1), { label: 'پرداخت شده', isSuccess: true });
    assert.deepStrictEqual(mapTapinStatus(0), { label: 'در انتظار پرداخت', isSuccess: false });
    assert.strictEqual(mapTapinStatus(-1).label, 'نامشخص');
  });

  it('correctly maps pay_type codes to Persian labels', () => {
    assert.strictEqual(mapTapinPayType(0), 'چک');
    assert.strictEqual(mapTapinPayType(1), 'فیش');
    assert.strictEqual(mapTapinPayType(2), 'آسان پرداخت');
    assert.strictEqual(mapTapinPayType(-1), 'نامشخص');
  });
});

describe('getTapinCredit API Service', () => {
  it('parses credit response and converts Rials to Toman', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      return new Response(
        JSON.stringify({
          returns: { status: 200, message: 'عملیات با موفقیت انجام شد.' },
          entries: { credit: 5000000, limitation: null, is_online_payment: true },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    };

    try {
      const result = await getTapinCredit();
      assert.strictEqual(result.credit, 5000000);
      assert.strictEqual(result.creditToman, 500000);
      assert.strictEqual(result.isOnlinePayment, true);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('throws descriptive error on API failure', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      return new Response(
        JSON.stringify({
          returns: { status: 332, message: 'توکن مورد نظر یافت نشد.' },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    };

    try {
      await assert.rejects(
        async () => {
          await getTapinCredit();
        },
        {
          message: 'توکن مورد نظر یافت نشد.',
        },
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe('getTapinTransactions API Service', () => {
  it('parses transaction list and maps amounts to Toman', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      return new Response(
        JSON.stringify({
          returns: { status: 200, message: 'عملیات با موفقیت انجام شد.' },
          entries: {
            list: [
              {
                id: 'tx-1234',
                price: 6487000,
                pay_type: 2,
                status: 1,
                create_at: '2026-11-15T22:17:28.523875',
              },
              {
                id: 'tx-5678',
                price: 1000000,
                pay_type: -1,
                status: 0,
                create_at: '2026-11-16T10:00:00',
              },
            ],
            count: 2,
            page: 1,
            total_count: 25,
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    };

    try {
      const result = await getTapinTransactions(1, 10);
      assert.strictEqual(result.total_count, 25);
      assert.strictEqual(result.list.length, 2);

      const tx1 = result.list[0];
      assert.strictEqual(tx1.id, 'tx-1234');
      assert.strictEqual(tx1.price, 6487000);
      assert.strictEqual(tx1.priceToman, 648700);
      assert.strictEqual(tx1.payTypeDescription, 'آسان پرداخت');
      assert.strictEqual(tx1.statusDescription, 'پرداخت شده');

      const tx2 = result.list[1];
      assert.strictEqual(tx2.payTypeDescription, 'نامشخص');
      assert.strictEqual(tx2.statusDescription, 'در انتظار پرداخت');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('handles empty transaction list gracefully', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      return new Response(
        JSON.stringify({
          returns: { status: 200, message: 'عملیات با موفقیت انجام شد.' },
          entries: { list: [], count: 0, page: 1, total_count: 0 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    };

    try {
      const result = await getTapinTransactions(1, 10);
      assert.strictEqual(result.total_count, 0);
      assert.strictEqual(result.list.length, 0);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

