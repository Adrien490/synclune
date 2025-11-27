// ============================================================================
// TYPES
// ============================================================================

export type OrderItemForAggregation = {
	quantity: number;
	price: number;
	productId: string | null;
	productTitle: string;
};

export type TopProductStats = {
	productId: string;
	productTitle: string;
	revenue: number;
	unitsSold: number;
};

// ============================================================================
// SERVICE FUNCTIONS
// ============================================================================

/**
 * Agrège les données des order items pour calculer les top produits
 * Fonction pure : pas d'effets de bord, pas d'appels DB
 *
 * @param orderItems - Liste des items de commande à agréger
 * @param limit - Nombre de produits à retourner (défaut: 5)
 * @returns Liste des top produits triés par revenue décroissant
 */
export function aggregateTopProducts(
	orderItems: OrderItemForAggregation[],
	limit: number = 5
): TopProductStats[] {
	const productStats = new Map<string, TopProductStats>();

	orderItems.forEach((item) => {
		if (!item.productId) return;

		const productId = item.productId;
		const productTitle = item.productTitle;
		const revenue = item.price * item.quantity;

		const existing = productStats.get(productId);
		if (existing) {
			existing.revenue += revenue;
			existing.unitsSold += item.quantity;
		} else {
			productStats.set(productId, {
				productId,
				productTitle,
				revenue,
				unitsSold: item.quantity,
			});
		}
	});

	return Array.from(productStats.values())
		.sort((a, b) => b.revenue - a.revenue)
		.slice(0, limit);
}
