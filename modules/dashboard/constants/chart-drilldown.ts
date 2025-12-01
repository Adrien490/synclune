// ============================================================================
// CHART DRILLDOWN ROUTES CONFIGURATION
// ============================================================================

/**
 * Configuration pour le drill-down des graphiques
 * Permet de naviguer vers une page filtree en cliquant sur un segment de graphique
 */

export interface ChartDrilldownConfig {
	/** URL de base pour la navigation */
	baseUrl: string
	/** Nom du parametre de filtre dans l'URL */
	filterParam: string
	/** Label accessible pour le screen reader */
	ariaLabel: string
}

/**
 * Configuration des drill-down pour chaque type de graphique
 */
export const CHART_DRILLDOWN = {
	// Graphique des statuts de commandes
	ordersStatus: {
		baseUrl: "/admin/ventes/commandes",
		filterParam: "filter_status",
		ariaLabel: "Cliquer pour voir les commandes avec ce statut",
	},

	// Graphique des top produits
	topProducts: {
		baseUrl: "/admin/catalogue/produits",
		filterParam: "search",
		ariaLabel: "Cliquer pour voir ce produit",
	},

	// Graphique des revenus par collection
	revenueByCollection: {
		baseUrl: "/admin/catalogue/collections",
		filterParam: "search",
		ariaLabel: "Cliquer pour voir cette collection",
	},

	// Graphique des revenus par type
	revenueByType: {
		baseUrl: "/admin/catalogue/types-de-produits",
		filterParam: "search",
		ariaLabel: "Cliquer pour voir ce type de produit",
	},

	// Graphique du stock par couleur
	stockByColor: {
		baseUrl: "/admin/catalogue/inventaire",
		filterParam: "filter_colorId",
		ariaLabel: "Cliquer pour voir l'inventaire de cette couleur",
	},

	// Graphique du stock par materiau
	stockByMaterial: {
		baseUrl: "/admin/catalogue/inventaire",
		filterParam: "filter_materialId",
		ariaLabel: "Cliquer pour voir l'inventaire de ce materiau",
	},

	// Graphique clients nouveaux vs recurrents
	customerType: {
		baseUrl: "/admin/utilisateurs",
		filterParam: "filter_new",
		ariaLabel: "Cliquer pour voir ces clients",
	},
} as const

export type ChartDrilldownKey = keyof typeof CHART_DRILLDOWN

/**
 * Construit l'URL de drill-down pour un graphique
 */
export function buildChartDrilldownUrl(
	chartKey: ChartDrilldownKey,
	filterValue: string
): string {
	const config = CHART_DRILLDOWN[chartKey]
	const encodedValue = encodeURIComponent(filterValue)
	return `${config.baseUrl}?${config.filterParam}=${encodedValue}`
}
