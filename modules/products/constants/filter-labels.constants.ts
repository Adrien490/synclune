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
