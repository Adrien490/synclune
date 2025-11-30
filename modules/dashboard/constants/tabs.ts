/**
 * Configuration des onglets du dashboard admin
 */

export type DashboardTab = "overview" | "sales" | "inventory";

export interface DashboardTabConfig {
	value: DashboardTab;
	label: string;
	description: string;
}

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
] as const;

/**
 * Onglet par defaut
 */
export const DEFAULT_TAB: DashboardTab = "overview";

/**
 * Cle URL pour le parametre d'onglet
 */
export const TAB_URL_KEY = "tab";

/**
 * Verifie si une valeur est un onglet valide
 */
export function isValidTab(value: string | null | undefined): value is DashboardTab {
	if (!value) return false;
	return DASHBOARD_TABS.some((tab) => tab.value === value);
}

/**
 * Recupere la configuration d'un onglet
 */
export function getTabConfig(tab: DashboardTab): DashboardTabConfig {
	const config = DASHBOARD_TABS.find((t) => t.value === tab);
	if (!config) {
		return DASHBOARD_TABS[0];
	}
	return config;
}
