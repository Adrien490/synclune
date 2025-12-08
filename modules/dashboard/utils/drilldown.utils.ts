/**
 * Fonctions utilitaires pour le drill-down des graphiques et KPIs
 */

import { CHART_DRILLDOWN } from "../constants/chart-drilldown";

export type ChartDrilldownKey = keyof typeof CHART_DRILLDOWN;

/**
 * Construit l'URL de drill-down pour un graphique
 */
export function buildChartDrilldownUrl(
	chartKey: ChartDrilldownKey,
	filterValue: string
): string {
	const config = CHART_DRILLDOWN[chartKey];
	const encodedValue = encodeURIComponent(filterValue);
	return `${config.baseUrl}?${config.filterParam}=${encodedValue}`;
}
