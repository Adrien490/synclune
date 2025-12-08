/**
 * Fonctions utilitaires pour la gestion des periodes du dashboard
 */

import { PERIOD_OPTIONS } from "../constants/periods";
import type { DashboardPeriod } from "./period-resolver";

/**
 * Recupere le label de comparaison pour une periode donnee
 */
export function getComparisonLabel(period: DashboardPeriod): string {
	const option = PERIOD_OPTIONS.find((p) => p.value === period);
	return option?.comparisonLabel || "vs periode precedente";
}
