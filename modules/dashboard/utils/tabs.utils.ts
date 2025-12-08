/**
 * Fonctions utilitaires pour la gestion des onglets du dashboard
 */

import { DASHBOARD_TABS } from "../constants/tabs";
import type { DashboardTab, DashboardTabConfig } from "../types/dashboard.types";

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
