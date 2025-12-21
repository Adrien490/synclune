// ============================================================================
// KPI TOOLTIPS CONFIGURATION
// ============================================================================

/**
 * Textes explicatifs pour les KPIs du dashboard
 * Affiches au survol de l'icone info
 */
export const KPI_TOOLTIPS: Record<string, string> = {
	// Performance KPIs
	todayRevenue:
		"Chiffre d'affaires total des commandes payees aujourd'hui. Compare a la meme heure hier.",
	monthRevenue:
		"Chiffre d'affaires cumule du mois en cours. Compare au mois precedent a la meme date.",
	averageOrderValue:
		"Montant moyen des commandes sur la periode. Indicateur de la valeur client.",
	monthOrders:
		"Nombre total de commandes passees ce mois. Compare au mois precedent.",

	// Operations KPIs
	pendingOrders:
		"Commandes en attente de traitement. Cliquez pour voir la liste.",
	urgentOrders:
		"Commandes en attente depuis plus de 48h necessitant une action rapide.",
	pendingRefunds:
		"Demandes de remboursement en attente de validation.",
	fulfillmentRate:
		"Pourcentage de commandes expediees dans les delais (24-48h).",

	// Stock KPIs
	outOfStock:
		"Produits actuellement en rupture de stock. Action requise pour eviter des ventes perdues.",
	lowStock:
		"Produits dont le stock est inferieur ou egal au seuil d'alerte (3 unites). Pensez a reapprovisionner.",
	stockNotifications:
		"Clients en attente de notification de retour en stock. Opportunite de vente.",
	totalSkus:
		"Nombre total de references (SKU) actives dans le catalogue.",

	// Customer KPIs
	totalCustomers:
		"Nombre total de comptes clients enregistres.",
	newCustomers:
		"Nouveaux clients inscrits sur la periode selectionnee.",
	returningCustomers:
		"Clients ayant effectue plus d'une commande. Indicateur de fidelite.",

	// Trends KPIs
	conversionRate:
		"Taux de conversion visiteurs -> acheteurs sur la periode.",
	cancelledOrders:
		"Commandes annulees. Un taux eleve peut indiquer un probleme.",
} as const;

export type KpiTooltipKey = keyof typeof KPI_TOOLTIPS;
