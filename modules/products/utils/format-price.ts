/**
 * Formats a price with the French monetary format
 */
export function formatPrice(value: string | number): string {
	const numValue = typeof value === "string" ? Number(value) : value;

	if (!Number.isFinite(numValue)) {
		return `${value}`;
	}

	return (
		new Intl.NumberFormat("fr-FR", {
			style: "currency",
			currency: "EUR",
			minimumFractionDigits: 0,
			maximumFractionDigits: 0,
		})
			.format(numValue)
			// Normalize narrow no-break space (U+202F) to regular no-break space (U+00A0)
			// to prevent hydration mismatches between Node.js and browser Intl implementations
			.replace(/\u202F/g, "\u00A0")
	);
}
