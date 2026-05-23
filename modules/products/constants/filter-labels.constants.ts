/**
 * Labels pour les filtres de produits.
 * Consommé par ProductFilterBadges et createProductFilterFormatter.
 */
export const FILTER_LABELS: Record<string, string> = {
	type: "Type",
	color: "Couleur",
	material: "Matériau",
	priceMin: "Prix",
	priceMax: "Prix max",
	ratingMin: "Note min",
	search: "Recherche",
	stockStatus: "Stock",
	onSale: "En promo",
	collection: "Collection",
	size: "Taille",
} as const;
