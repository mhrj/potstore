import { logApiCall } from '@/lib/api-logger';

export type TapinCreditResult = {
  credit: number;      // Balance in Rials
  creditToman: number; // Balance in Toman
  limitation?: number | null;
  isOnlinePayment?: boolean;
};

export type TapinTransaction = {
  id: string;
  price: number;              // Amount in Rials
  priceToman: number;         // Amount in Toman
  payType: number;            // -1 = نامشخص, 0 = چک, 1 = فیش, 2 = آسان پرداخت
  payTypeDescription: string;
  status: number;             // 0 = در انتظار پرداخت, 1 = پرداخت شده
  statusDescription: string;
  createdAt: string;          // ISO datetime string
};

export type TapinTransactionsResult = {
  list: TapinTransaction[];
  total_count: number;
  page: number;
  count: number;
};

export function mapTapinStatus(status: number, defaultDesc?: string): { label: string; isSuccess: boolean } {
  if (status === 1) {
    return { label: defaultDesc || 'پرداخت شده', isSuccess: true };
  }
  if (status === 0) {
    return { label: defaultDesc || 'در انتظار پرداخت', isSuccess: false };
  }
  return { label: defaultDesc || 'نامشخص', isSuccess: false };
}

export function mapTapinPayType(payType: number, defaultDesc?: string): string {
  switch (payType) {
    case 0:
      return 'چک';
    case 1:
      return 'فیش';
    case 2:
      return 'آسان پرداخت';
    case -1:
      return 'نامشخص';
    default:
      return defaultDesc || 'نامشخص';
  }
}

function getTapinAuthHeader(): string {
  const token = (process.env.TAPIN_API_TOKEN || '').trim();
  if (token.startsWith('Bearer ') || token.startsWith('JWT ') || token.startsWith('jwt ')) {
    return token;
  }
  return `Bearer ${token}`;
}

/**
 * Fetches the store's current Tapin wallet credit.
 * Endpoint: POST https://api.tapin.ir/api/v2/public/transaction/credit/
 */
export async function getTapinCredit(): Promise<TapinCreditResult> {
  const shopId = process.env.TAPIN_SHOP_ID ? String(process.env.TAPIN_SHOP_ID).trim() : '';
  const payload = { shop_id: shopId };
  const authHeader = getTapinAuthHeader();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch('https://api.tapin.ir/api/v2/public/transaction/credit/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const data = await res.json().catch(() => null);
    logApiCall('tapin', '/api/v2/public/transaction/credit/', payload, data);

    if (!res.ok || data?.returns?.status !== 200) {
      const errMsg =
        data?.returns?.message || `خطا در دریافت موجودی تاپین (کد خطا: ${data?.returns?.status || res.status})`;
      throw new Error(errMsg);
    }

    const rawCredit = Number(data?.entries?.credit) || 0;
    const creditToman = Math.floor(rawCredit / 10);

    return {
      credit: rawCredit,
      creditToman,
      limitation: data?.entries?.limitation ?? null,
      isOnlinePayment: Boolean(data?.entries?.is_online_payment),
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
 * Fetches the store's Tapin credit transaction receipts list.
 * Endpoint: POST https://api.tapin.ir/api/v2/public/transaction/online-increase-credit/list/
 */
export async function getTapinTransactions(
  page: number = 1,
  count: number = 10,
): Promise<TapinTransactionsResult> {
  const shopId = process.env.TAPIN_SHOP_ID ? String(process.env.TAPIN_SHOP_ID).trim() : '';
  const payload = {
    shop_id: shopId,
    page: String(page),
    count: String(count),
  };
  const authHeader = getTapinAuthHeader();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(
      'https://api.tapin.ir/api/v2/public/transaction/online-increase-credit/list/',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      },
    );

    const data = await res.json().catch(() => null);
    logApiCall('tapin', '/api/v2/public/transaction/online-increase-credit/list/', payload, data);

    if (!res.ok || data?.returns?.status !== 200) {
      const errMsg =
        data?.returns?.message ||
        `خطا در دریافت لیست تراکنش‌های تاپین (کد خطا: ${data?.returns?.status || res.status})`;
      throw new Error(errMsg);
    }

    const rawList = Array.isArray(data?.entries?.list) ? data.entries.list : [];
    const totalCount = Number(data?.entries?.total_count) || rawList.length;

    const list: TapinTransaction[] = rawList.map((item: Record<string, unknown>) => {
      const priceRials = Number(item.price) || 0;
      const priceToman = Math.floor(priceRials / 10);
      const payType = item.pay_type !== undefined ? Number(item.pay_type) : -1;
      const status = item.status !== undefined ? Number(item.status) : 0;

      return {
        id: String(item.id || ''),
        price: priceRials,
        priceToman,
        payType,
        payTypeDescription: mapTapinPayType(payType, String(item.pay_type_description || '')),
        status,
        statusDescription: mapTapinStatus(status, String(item.status_description || '')).label,
        createdAt: String(item.create_at || item.created_at || ''),
      };
    });

    return {
      list,
      total_count: totalCount,
      page,
      count,
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

