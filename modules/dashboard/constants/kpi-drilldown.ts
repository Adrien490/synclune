// ============================================================================
// KPI DRILLDOWN ROUTES CONFIGURATION
//
// Types: voir types/dashboard.types.ts
// ============================================================================

import type { KpiDrilldownConfig } from "../types/dashboard.types";

/**
 * Mapping des KPIs vers leurs pages de detail
 * Utilise pour rendre les KPI cards cliquables avec navigation vers la liste filtree
 */
export const KPI_DRILLDOWN: Record<string, KpiDrilldownConfig> = {
	// Performance KPIs
	todayRevenue: {
		href: "/admin/ventes/commandes?filter_paymentStatus=PAID",
		label: "Voir les commandes payees",
	},
	monthRevenue: {
		href: "/admin/ventes/commandes?filter_paymentStatus=PAID",
		label: "Voir les commandes du mois",
	},
	averageOrderValue: {
		href: "/admin/ventes/commandes",
		label: "Voir toutes les commandes",
	},
	monthOrders: {
		href: "/admin/ventes/commandes",
		label: "Voir les commandes",
	},

	// Operations KPIs
	pendingOrders: {
		href: "/admin/ventes/commandes?filter_status=PROCESSING",
		label: "Voir les commandes en traitement",
	},
	urgentOrders: {
		href: "/admin/ventes/commandes?filter_status=PENDING",
		label: "Voir les commandes urgentes",
	},

	// Stock KPIs
	outOfStock: {
		href: "/admin/catalogue/inventaire?filter_stock=rupture",
		label: "Voir les ruptures de stock",
	},
	lowStock: {
		href: "/admin/catalogue/inventaire?filter_stock=bas",
		label: "Voir les stocks bas",
	},
	stockNotifications: {
		href: "/admin/marketing/alertes-stock",
		label: "Voir les demandes de retour en stock",
	},

} as const;

export type KpiDrilldownKey = keyof typeof KPI_DRILLDOWN;

// Re-exports pour retrocompatibilite
export type { KpiDrilldownConfig } from "../types/dashboard.types";
