const defaultFormatter = new Intl.NumberFormat("fr-FR", {
	style: "currency",
	currency: "EUR",
});

const compactFormatter = new Intl.NumberFormat("fr-FR", {
	style: "currency",
	currency: "EUR",
	minimumFractionDigits: 0,
	maximumFractionDigits: 2,
});

/**
 * Format cents to EUR display.
 * Use `compact` to strip trailing zeros (e.g. "50 €" instead of "50,00 €").
 */
export function formatEuro(cents: number, options?: { compact?: boolean }): string {
	if (!Number.isFinite(cents)) return "—";
	const formatter = options?.compact ? compactFormatter : defaultFormatter;
	return formatter.format(cents / 100);
}

export function eurosToCents(euros: number): number {
	return Math.round(euros * 100);
}

export function centsToEuros(cents: number): number {
	return cents / 100;
}
