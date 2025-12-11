// ============================================================================
// CHART DRILLDOWN ROUTES CONFIGURATION
//
// Types: voir types/dashboard.types.ts
// Fonctions: voir utils/drilldown.utils.ts
// ============================================================================

import type { ChartDrilldownConfig } from "../types/dashboard.types";

/**
 * Configuration des drill-down pour chaque type de graphique
 * Permet de naviguer vers une page filtree en cliquant sur un segment de graphique
 */
export const CHART_DRILLDOWN: Record<string, ChartDrilldownConfig> = {
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

} as const;

// Re-exports pour retrocompatibilite
export type { ChartDrilldownConfig } from "../types/dashboard.types";
export { buildChartDrilldownUrl, type ChartDrilldownKey } from "../utils/drilldown.utils";
