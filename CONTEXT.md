# Design & Motion Rules: Pot Store Landing Page

This document captures the agreed motion rules, interaction design patterns, and performance constraints for the Pot Store landing page.

---

## 1. Core Principles: "Lighter" Feel

- **Air & Whitespace:** Generous vertical breathing room between major sections (`py-20` on mobile, `py-24` to `py-28` on desktop).
- **Reduced Visual Weight:** Softer borders (`border-soil-900/8` and `dark:border-dust-100/10`), semi-translucent backdrops, and subtle depth rather than heavy outlines.
- **Hardware-Accelerated Compositing:** All interactive micro-animations must animate **strictly via `transform` and `opacity`**.

---

## 2. Hard Constraints & Anti-Patterns

- **Zero Paint-Bound Animations:**
  - ❌ NEVER animate `box-shadow` directly. (Use a static `::after` pseudo-element with the target shadow, fading it in via `opacity`).
  - ❌ NEVER animate `filter` or `backdrop-filter`.
  - ❌ NEVER animate `background-position` or `background-color`.
- **Typography & Localization Rules (Persian / Farsi):**
  - ❌ NEVER use `letter-spacing` (breaks Persian cursive glyph connections).
  - ❌ NEVER use `text-transform: uppercase` (Persian script has no casing).
  - ✔ Always preserve zero-width non-joiner (ZWNJ / نیم‌فاصله).
- **Input & Device Adaptations:**
  - Pointer glow is disabled on touch devices (`@media (hover: none)`).
  - Micro-animations respect `prefers-reduced-motion: reduce` (instantly revealed, zero transform).

---

## 3. Motion System & Architecture

### A. Scroll Reveal (`useReveal`)
- Single module-level `IntersectionObserver` instance (threshold: `0.15`) observing all registered elements.
- When an element enters the viewport, adds `.is-in` and unobserves.
- CSS classes in `globals.css`:
  - `.reveal`: initial state (`opacity: 0; transform: translateY(16px); will-change: transform, opacity;`).
  - `.reveal.is-in`: target state (`opacity: 1; transform: translateY(0);`).
  - Staggered delays: `nth-child(1)` to `nth-child(6)` apply incremental `transition-delay`.

### B. Pointer Glow (`usePointerGlow`)
- Tracks mouse coordinates relative to container boundaries.
- Throttled via `requestAnimationFrame` to prevent layout thrashing.
- Updates CSS custom properties `--mx` and `--my` (in percentage or px) on the container.
- Renders an ambient radial gradient layer positioned via CSS custom properties.

### C. Prototype Motion Variants (`?motion=a|b`)
- **Variant A (Snappy & Subtle):**
  - Card reveal duration: `250ms ease-out`.
  - Image hover zoom: `scale(1.02)`.
  - Card hover lift: `translateY(-2px)`.
  - Glow radius: `280px`, subtle opacity `0.18`.
- **Variant B (Smooth & Expressive):**
  - Card reveal duration: `500ms cubic-bezier(0.16, 1, 0.3, 1)` with 6-step stagger.
  - Image hover zoom: `scale(1.04)`.
  - Card hover lift: `translateY(-3px)`.
  - Glow radius: `400px`, ambient opacity `0.26`.

---

## 4. Product Recommendation Engine Domain Model

This section documents the relation kinds, scoring algorithms, volume derivations, and architecture for product recommendations.

### A. Relation Kinds
1. **`SIMILAR`**: Suggests alternative pots sharing key physical and aesthetic traits.
2. **`COMPLEMENT`**: Suggests essential pairing items (specifically potting soil tailored to the pot volume).
3. **`BOUGHT_TOGETHER`**: Suggests products frequently purchased together based on co-occurrence in paid orders.

### B. Scoring Rules

#### 1. Similar Products (`scoreSimilar`)
Calculated against candidate products where `candidate.id !== target.id` and `candidate.isActive === true`.
- **Same Material**: `+40` (e.g. ceramic with ceramic, clay with clay).
- **Same Category**: `+15` (`candidate.categoryId === target.categoryId`).
- **Diameter Proximity**: `+15` if `|candidate.diameterCm - target.diameterCm| / target.diameterCm <= 0.20` (within ±20%).
- **Price Proximity**: `+10` if `|candidate.basePriceToman - target.basePriceToman| / target.basePriceToman <= 0.30` (within ±30%).
- **Same Color**: `+10` (`candidate.color.trim().toLowerCase() === target.color.trim().toLowerCase()`).
- **In Stock**: `+20` (`candidate.stock > 0`).
- **Maximum Possible Score**: `110`. Top 8 recommendations persisted per product.

#### 2. Complementary Products (`scoreComplement`)
Recommends potting soil when browsing a pot.
- **Category Filter**: `candidate.category.slug === 'soil-growth'` and `candidate.isActive === true`.
- **Pot Volume Calculation**:
  $$\text{Pot Volume (L)} = \frac{\pi \times (\frac{\text{diameterCm}}{2})^2 \times \text{heightCm}}{1000}$$
- **Soil Volume Derivation**:
  Derived directly from product dimensions ($V = \frac{\pi \times (D/2)^2 \times H}{1000}$) or bag capacity.
- **Match Criteria**:
  $$\text{Soil Volume} \in [1.0 \times \text{Pot Volume}, 1.3 \times \text{Pot Volume}]$$
  (Soil settles after watering, hence a 1.0x to 1.3x fill volume is ideal).
- **Scoring**:
  - Proximity to ideal 1.15x ratio: up to `80` points.
  - In-stock availability (`stock > 0`): `+20` points.
  - Top 4 complements persisted per pot.

#### 3. Frequently Bought Together (`BOUGHT_TOGETHER`)
- Statistical Lift metric calculated across all orders where `paymentStatus === 'PAID'`:
  $$\text{Lift}(A, B) = \frac{\text{coCount}(A, B)}{\frac{\text{count}(A) \times \text{count}(B)}{\text{totalOrders}}}$$
- Stored score reflects Lift (e.g. Lift $> 1.0$ indicates positive correlation).

#### 4. Saucer (زیرگلدانی) Gap Analysis
> [!NOTE]
> Currently, the catalog lacks a dedicated saucer (`saucer` / `زیرگلدانی`) category. In Iranian indoor gardening, pots and water drainage saucers are classic complements.
> **Future Rule Roadmap**: Once the saucer category is created, `scoreComplement` will automatically pair pots with saucers matching:
> 1. `saucer.material === pot.material`
> 2. `saucer.diameterCm >= pot.diameterCm + 2` (providing adequate perimeter for drainage)

---

## 5. Implementation Vertical Slices (Issues Breakdown)

- **Slice 1: Schema & Database Layer**
  - Add `RelationKind` enum (`SIMILAR`, `COMPLEMENT`, `BOUGHT_TOGETHER`).
  - Add `ProductRelation` model with `fromId`, `toId`, `kind`, `score`, `manual`, and unique constraint `[fromId, toId, kind]`.
  - Execute additive `prisma db push` and `prisma generate`.

- **Slice 2: Pure Scoring Engine & Unit Tests**
  - Create `tests/recommendations.test.ts` covering `scoreSimilar`, `calculatePotVolumeLiter`, `scoreComplement`, and `calculateLift`.
  - Create `src/features/recommendations/scoring.ts` implementing tested formulas.

- **Slice 3: Rebuild Engine & Admin Hooks**
  - Create `src/features/recommendations/rebuild.ts` to compute top 8 SIMILAR and top 4 COMPLEMENT, respecting `manual: true` overrides.
  - Hook into `src/app/api/admin/products/[id]/route.ts` and `src/app/api/admin/products/route.ts` to trigger rebuild on product changes.

- **Slice 4: UI & Product Page Integration**
  - Create `src/features/recommendations/components/RelatedProducts.tsx` with accessible tabs («محصولات مشابه», «تکمیل‌کننده», «خریداران دیگر خریده‌اند») and empty-tab hiding.
  - Query recommendations in `src/app/products/[slug]/page.tsx` and render `ProductCard` items.

---

## 6. Product Variants (تنوع‌های محصول) Architecture & Decisions

### A. Grilling Decisions & Resolution
1. **Scope & Independence**:
   - Applies **exclusively to regular products** (`bundleSize === 1`).
   - Bundle products (`bundleSize > 1`, `bundleItems`, `minOrderQuantity`) remain 100% untouched and independent.
2. **Variant Definition & Attributes**:
   - `ProductVariant` supports a flexible Persian title (e.g. «سایز ۱۵», «سایز ۲۰», «سفید - بزرگ») with optional JSON attributes (dimensions/color).
   - Each variant has its own `priceToman`, `stock`, optional `sku`, and `attributes`.
3. **Tiered Pricing Interaction**:
   - Proportional scaling: The selected variant's `priceToman` acts as its base price. Tier volume discounts (`PriceTier`) apply proportionally to the variant price (e.g. 15% off at 5+ units reduces a 100,000 variant to 85,000 and a 200,000 variant to 170,000).
4. **Base Price Behavior**:
   - `basePriceToman` in catalog and card views acts as the "Starting from" (شروع از) price, dynamically synced to the lowest active variant price when variants are configured.

### B. Vertical Slices Breakdown
- **Slice 1: Schema & Data Model**
  - Model `ProductVariant`: `id`, `productId`, `title`, `priceToman`, `stock`, `sku`, `attributes`, timestamps.
  - Model `CartItem`: add `variantId` and `variantTitle`.
  - Model `OrderItem`: add snapshot fields `variantId` and `variantTitle`.
  - Additive `prisma db push` and `prisma generate`.
- **Slice 2: Pricing Logic & TDD Unit Tests**
  - Unit tests in `tests/variant-pricing.test.ts` verifying that choosing a variant updates line pricing and scales volume tiers proportionally.
  - Update `src/lib/pricing.ts` and `src/lib/cart.ts` to price variant lines using `variant.priceToman`.
- **Slice 3: Admin UI & API**
  - Add "تنوع‌های محصول" (Product Variants) manager in `src/features/admin/components/ProductForm.tsx` (visible only when `bundleSize === 1`).
  - Update admin API handlers (`src/app/api/admin/products/route.ts` and `[id]/route.ts`) to validate and persist variants.
- **Slice 4: Product Page UI**
  - In `ProductDetailView.tsx` and `TieredPricing.tsx`, render interactive variant selector pills.
  - Recalculate displayed price, live tier matrix, and cart submission payload when a variant is chosen.
- **Slice 5: Cart & Checkout Integration**
  - Update `CartItemRow.tsx` and checkout flow to display the chosen variant title and compute totals from the variant price.



