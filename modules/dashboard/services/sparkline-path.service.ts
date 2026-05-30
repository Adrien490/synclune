/**
 * Pure helper building an SVG `d` path for the KpiCard background sparkline.
 *
 * Renders into a fixed `100 x 32` viewBox (matching `kpi-card.tsx`'s
 * `viewBox="0 0 100 32"`). Returns `null` when there isn't enough signal to
 * draw a meaningful trend (< 2 points or a perfectly flat series), so callers
 * can simply omit the prop and skip rendering.
 */

const VIEWBOX_WIDTH = 100;
const VIEWBOX_HEIGHT = 32;
/** Vertical padding so the stroke never touches the card edges */
const PADDING_Y = 3;

export function buildSparklinePath(points: readonly number[]): string | null {
	if (points.length < 2) return null;

	const min = Math.min(...points);
	const max = Math.max(...points);
	const range = max - min;

	// Flat series → no trend to show.
	if (range === 0) return null;

	const usableHeight = VIEWBOX_HEIGHT - PADDING_Y * 2;
	const stepX = VIEWBOX_WIDTH / (points.length - 1);

	const coords = points.map((value, index) => {
		const x = index * stepX;
		// Invert Y: higher value → smaller y (towards the top).
		const y = PADDING_Y + (1 - (value - min) / range) * usableHeight;
		return `${round(x)} ${round(y)}`;
	});

	return `M ${coords.join(" L ")}`;
}

function round(n: number): number {
	return Math.round(n * 100) / 100;
}
