export function formatEuro(cents: number): string {
	return new Intl.NumberFormat("fr-FR", {
		style: "currency",
		currency: "EUR",
	}).format(cents / 100);
}

export function eurosToCents(euros: number): number {
	return Math.round(euros * 100);
}

export function centsToEuros(cents: number): number {
	return cents / 100;
}
