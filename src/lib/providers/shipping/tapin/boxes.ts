import { unstable_cache } from 'next/cache';
import { cleanTitle } from './locations';
import { logApiCall } from '@/lib/api-logger';

export type TapinBox = {
  id: number;
  title: string;
  label?: string;
  weight: number; // max weight supported in grams
  length: number; // cm
  width: number;  // cm
  height: number; // cm
};

/**
 * Standard Iran Post boxes used by Tapin as safe fallbacks
 * when the remote box filter endpoint is unreachable or in test environments.
 */
export const DEFAULT_TAPIN_BOXES: TapinBox[] = [
  { id: 1, title: 'جعبه شماره ۱ (کوچک)', weight: 1000, length: 15, width: 10, height: 10 },
  { id: 2, title: 'جعبه شماره ۲', weight: 2500, length: 20, width: 15, height: 10 },
  { id: 3, title: 'جعبه شماره ۳ (متوسط)', weight: 5000, length: 25, width: 20, height: 15 },
  { id: 4, title: 'جعبه شماره ۴', weight: 10000, length: 30, width: 20, height: 20 },
  { id: 5, title: 'جعبه شماره ۵ (بزرگ - تا ۳۰ کیلوگرم)', weight: 30000, length: 40, width: 30, height: 25 },
  { id: 6, title: 'جعبه شماره ۶', weight: 30000, length: 45, width: 35, height: 30 },
  { id: 7, title: 'جعبه شماره ۷', weight: 30000, length: 50, width: 40, height: 35 },
  { id: 8, title: 'جعبه شماره ۸', weight: 30000, length: 55, width: 45, height: 40 },
  { id: 9, title: 'جعبه شماره ۹ (خیلی بزرگ)', weight: 30000, length: 60, width: 50, height: 45 },
];

/**
 * Fetches available packaging boxes from Tapin Packing Box API.
 * Calls POST https://api.tapin.ir/api/v2/public/order/post/packing-box/ with Bearer token.
 * Maps entries.list to return array of { id, title, length, width, height }.
 * Falls back to DEFAULT_TAPIN_BOXES if the endpoint is unavailable or returns an error.
 */
export async function fetchTapinBoxes(): Promise<TapinBox[]> {
  const rawToken = process.env.TAPIN_API_TOKEN || '';
  const token = rawToken.trim();
  const authHeader = token.startsWith('Bearer ')
    ? token
    : token.startsWith('jwt ')
    ? token
    : `Bearer ${token}`;

  const shopId = process.env.TAPIN_SHOP_ID ? String(process.env.TAPIN_SHOP_ID).trim() : '';

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch('https://api.tapin.ir/api/v2/public/order/post/packing-box/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify({
        shop_id: shopId,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      return DEFAULT_TAPIN_BOXES;
    }

    const data = await res.json().catch(() => null);
    logApiCall('tapin', '/api/v2/public/order/post/packing-box/', { shop_id: shopId }, data);

    const list = data?.entries?.list;
    if (data?.returns?.status === 200 && Array.isArray(list) && list.length > 0) {
      return list.map((b: Record<string, unknown>) => {
        const title = cleanTitle(b.title || `سایز ${b.pk ?? b.id}`);
        return {
          id: Number(b.pk ?? b.id),
          title,
          label: title,
          weight: Number(b.weight || 30000),
          length: Number(b.length || 0),
          width: Number(b.width || 0),
          height: Number(b.height || 0),
        };
      });
    }

    return DEFAULT_TAPIN_BOXES;
  } catch (_err: unknown) {
    return DEFAULT_TAPIN_BOXES;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Cached version of fetchTapinBoxes revalidated every 24 hours (86,400 seconds).
 */
export const getCachedTapinBoxes = unstable_cache(
  async () => fetchTapinBoxes(),
  ['tapin-boxes'],
  { revalidate: 86400 },
);

