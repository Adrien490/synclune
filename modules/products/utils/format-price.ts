/**
 * Formats a price with the French monetary format
 */
export function formatPrice(value: string | number): string {
	const numValue = typeof value === "string" ? Number(value) : value;

	if (Number.isNaN(numValue)) {
		return `${value}`;
	}

	return new Intl.NumberFormat("fr-FR", {
		style: "currency",
		currency: "EUR",
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(numValue);
}
