/**
 * Configuration des onglets du dashboard admin
 *
 * Types: voir types/dashboard.types.ts
 * Fonctions: voir utils/tabs.utils.ts
 */

import type { DashboardTab, DashboardTabConfig } from "../types/dashboard.types";

/**
 * Configuration des onglets du dashboard
 */
export const DASHBOARD_TABS: DashboardTabConfig[] = [
	{
		value: "overview",
		label: "Vue d'ensemble",
		description: "KPIs principaux et graphiques de synthese",
	},
	{
		value: "sales",
		label: "Ventes",
		description: "Statistiques detaillees des ventes et conversions",
	},
	{
		value: "inventory",
		label: "Inventaire",
		description: "Gestion du stock et alertes",
	},
	{
		value: "customers",
		label: "Clients",
		description: "Analyse de la base clients et fidelisation",
	},
] as const;

/**
 * Onglet par defaut
 */
export const DEFAULT_TAB: DashboardTab = "overview";

/**
 * Cle URL pour le parametre d'onglet
 */
export const TAB_URL_KEY = "tab";

// Re-exports pour retrocompatibilite
export type { DashboardTab, DashboardTabConfig } from "../types/dashboard.types";
export { isValidTab, getTabConfig } from "../utils/tabs.utils";
