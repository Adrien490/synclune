// ============================================================================
// KPI SPARKLINE BUILDER SERVICE
// Pure function: transforms number[] into SVG path data for sparklines
// ============================================================================

/**
 * Builds an SVG path string from an array of data points
 * Output is a smooth monotone cubic path suitable for a sparkline
 *
 * @param values - Array of numeric values (e.g. 7 days of revenue)
 * @param width - SVG viewport width (default 100)
 * @param height - SVG viewport height (default 32)
 * @returns SVG path `d` attribute string, or null if no meaningful data
 */
export function buildSparklinePath(values: number[], width = 100, height = 32): string | null {
	if (values.length < 2) return null;

	const max = Math.max(...values);
	const min = Math.min(...values);
	const range = max - min || 1;

	const padding = 2;
	const innerHeight = height - padding * 2;
	const stepX = width / (values.length - 1);

	const points = values.map((value, i) => ({
		x: i * stepX,
		y: padding + innerHeight - ((value - min) / range) * innerHeight,
	}));

	// Build SVG path with smooth curves (cardinal spline approximation)
	let d = `M ${points[0]!.x},${points[0]!.y}`;

	for (let i = 1; i < points.length; i++) {
		const prev = points[i - 1]!;
		const curr = points[i]!;
		const cpx = (prev.x + curr.x) / 2;
		d += ` C ${cpx},${prev.y} ${cpx},${curr.y} ${curr.x},${curr.y}`;
	}

	return d;
}
