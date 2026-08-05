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
 *
 * ⚠️ `compact` est le registre du DASHBOARD et du méga-menu (agrégats, montants
 * ronds) — jamais celui d'un prix de vitrine. `minimumFractionDigits: 0` ne
 * strippe pas seulement « ,00 » : il strippe TOUS les zéros de queue, donc 4990
 * centimes rendent « 49,9 € » et non « 49,90 € ». C'est ce qu'affichait le
 * from-price des bandes de collection (corrigé le 2026-08-05,
 * `@regression collection-from-price-two-decimals`). Un prix se rend nu.
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
