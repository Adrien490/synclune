/**
 * Labels pour les filtres de produits
 * Utilises dans NoResultsFilters et autres composants de filtrage
 */
export const FILTER_LABELS: Record<string, string> = {
	type: "Type",
	color: "Couleur",
	material: "Materiau",
	priceMin: "Prix",
	priceMax: "Prix max",
	ratingMin: "Note min",
	search: "Recherche",
	stockStatus: "Stock",
	onSale: "En promo",
	collection: "Collection",
	size: "Taille",
} as const;

/**
 * Formate un prix avec le format monetaire francais
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
