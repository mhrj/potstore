/**
 * Admin-defined display features for a product.
 *
 * These live in `Product.features` as free-form JSON, so anything at all can be
 * in that column — rows written before this existed, rows written by a future
 * version of the form, or a hand-edited row. Every read therefore goes through
 * `parseFeatures`, which keeps only the entries that actually look like a
 * feature and drops the rest, instead of trusting the column's shape.
 */
export type ProductFeature = { label: string; enabled: boolean };

export function parseFeatures(raw: unknown): ProductFeature[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (f): f is ProductFeature =>
      typeof f === 'object' && f !== null &&
      typeof (f as ProductFeature).label === 'string' &&
      typeof (f as ProductFeature).enabled === 'boolean'
  );
}

export type ColorOption = { hexCode: string; stock: number; priceAdjustment: number; name?: string };

export type ProductVariantItem = {
  id?: string;
  title: string;
  priceToman: number;
  stock: number;
  sku?: string | null;
  attributes?: Record<string, unknown> | null;
};

export function parseProductVariants(raw: unknown): ProductVariantItem[] {
  if (!Array.isArray(raw)) return [];
  const items: ProductVariantItem[] = [];
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue;
    const rec = item as Record<string, unknown>;
    const title = typeof rec.title === 'string' ? rec.title.trim() : '';
    const priceToman =
      typeof rec.priceToman === 'number' && Number.isFinite(rec.priceToman)
        ? Math.max(0, Math.round(rec.priceToman))
        : 0;
    const stock =
      typeof rec.stock === 'number' && Number.isFinite(rec.stock)
        ? Math.max(0, Math.round(rec.stock))
        : 0;
    const sku = typeof rec.sku === 'string' && rec.sku.trim() ? rec.sku.trim() : null;
    const attributes =
      typeof rec.attributes === 'object' && rec.attributes !== null
        ? (rec.attributes as Record<string, unknown>)
        : null;

    if (!title || priceToman <= 0) continue;

    const variant: ProductVariantItem = {
      title,
      priceToman,
      stock,
      sku,
      attributes,
    };
    if (typeof rec.id === 'string') {
      variant.id = rec.id;
    }
    items.push(variant);
  }
  return items;
}

export type BundleItem = {
  title: string;
  description?: string;
  material: string;
  diameterCm: number;
  heightCm: number;
  weightGrams: number;
  priceToman?: number;
  price?: number;
  productId?: string;
  colorOptions?: ColorOption[];
};

export function normalizeHex(c: string): string {
  const trimmed = c.trim();
  const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(withHash)
    ? withHash.toUpperCase()
    : '';
}

export function parseColorOptions(raw: unknown, defaultStock: number = 0): ColorOption[] {
  if (!Array.isArray(raw)) return [];
  const results: ColorOption[] = [];

  for (const item of raw) {
    if (typeof item === 'string') {
      const hex = normalizeHex(item);
      if (hex) {
        results.push({ hexCode: hex, stock: Math.max(0, defaultStock), priceAdjustment: 0 });
      }
    } else if (typeof item === 'object' && item !== null) {
      const record = item as Record<string, unknown>;
      const rawHex = typeof record.hexCode === 'string' ? record.hexCode : typeof record.hex === 'string' ? record.hex : null;
      if (rawHex) {
        const hex = normalizeHex(rawHex);
        if (hex) {
          const rawStock = record.stock;
          let stockVal = defaultStock;
          if (typeof rawStock === 'number' && Number.isFinite(rawStock) && rawStock >= 0) {
            stockVal = Math.floor(rawStock);
          } else if (typeof rawStock === 'string' && !isNaN(Number(rawStock)) && Number(rawStock) >= 0) {
            stockVal = Math.floor(Number(rawStock));
          }

          let priceAdj = 0;
          if (typeof record.priceAdjustment === 'number' && Number.isFinite(record.priceAdjustment)) {
            priceAdj = Math.round(record.priceAdjustment);
          } else if (typeof record.priceAdjustment === 'string' && !isNaN(Number(record.priceAdjustment))) {
            priceAdj = Math.round(Number(record.priceAdjustment));
          }

          const rawName = typeof record.name === 'string' && record.name.trim() ? record.name.trim() : undefined;
          results.push({
            hexCode: hex,
            stock: Math.max(0, stockVal),
            priceAdjustment: priceAdj,
            ...(rawName ? { name: rawName } : {}),
          });
        }
      }
    }
  }

  return results;
}

export function parseBundleItems(raw: unknown, defaultStock: number = 0): BundleItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (it): it is Record<string, unknown> =>
        typeof it === 'object' &&
        it !== null &&
        typeof (it as Record<string, unknown>).title === 'string'
    )
    .map((it) => {
      const rawPrice = it.priceToman ?? it.price;
      const numPrice =
        typeof rawPrice === 'number' && Number.isFinite(rawPrice) && rawPrice > 0
          ? Math.floor(rawPrice)
          : undefined;

      return {
        title: String(it.title),
        description: typeof it.description === 'string' ? it.description : '',
        material: typeof it.material === 'string' ? it.material : '',
        diameterCm:
          typeof it.diameterCm === 'number' && Number.isFinite(it.diameterCm)
            ? it.diameterCm
            : 0,
        heightCm:
          typeof it.heightCm === 'number' && Number.isFinite(it.heightCm)
            ? it.heightCm
            : 0,
        weightGrams:
          typeof it.weightGrams === 'number' && Number.isFinite(it.weightGrams)
            ? Math.floor(it.weightGrams)
            : 0,
        priceToman: numPrice,
        price: numPrice,
        productId: typeof it.productId === 'string' && it.productId.trim() ? it.productId.trim() : undefined,
        colorOptions: parseColorOptions(it.colorOptions, defaultStock),
      };
    });
}

