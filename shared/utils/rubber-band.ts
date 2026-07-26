// Helper pur extrait de `swipeable-card.tsx` : un fichier de composants qui
// exporte aussi des non-composants casse le Fast Refresh.
const RUBBER_BAND_K_RATIO = 0.3;
const RUBBER_BAND_MAX_RATIO = 0.85;

/**
 * Compresses a linear swipe offset beyond `threshold` using a logarithmic curve,
 * reproducing the iOS rubber-band resistance felt when dragging list items past
 * their action zone.
 *
 * - Below threshold: identity (free movement).
 * - Above threshold: `threshold + log1p(over / k) * k`, where `k = width * 0.3`.
 * - Asymptote: `width * 0.85` — the card never fully spans the viewport.
 *
 * Safe with `width === 0` (returns identity), which lets the mock environment
 * in unit tests remain simple.
 */
export function applyRubberBand(offset: number, width: number, threshold: number): number {
	if (width <= 0) return offset;
	const sign = Math.sign(offset);
	const absOffset = Math.abs(offset);
	if (absOffset <= threshold) return offset;
	const k = Math.max(width * RUBBER_BAND_K_RATIO, 1);
	const over = absOffset - threshold;
	const compressed = threshold + Math.log1p(over / k) * k;
	const cap = width * RUBBER_BAND_MAX_RATIO;
	return sign * Math.min(compressed, cap);
}
