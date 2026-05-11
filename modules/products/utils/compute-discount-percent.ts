/**
 * Compute a rounded discount percentage between a promotional price and a
 * compare-at (original) price. Returns 0 when there is no valid discount
 * (missing compareAtPrice, non-positive price, or compareAtPrice <= price).
 *
 * @example
 * computeDiscountPercent(3600, 4800) // => 25
 * computeDiscountPercent(4800, 4800) // => 0
 * computeDiscountPercent(0, 4800)    // => 0
 */
export function computeDiscountPercent(price: number, compareAtPrice: number | null): number {
	if (!compareAtPrice || compareAtPrice <= price || price <= 0) return 0;
	return Math.round((1 - price / compareAtPrice) * 100);
}
