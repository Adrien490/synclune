/**
 * Configuration des périodes disponibles pour le dashboard
 *
 * Types: voir types/dashboard.types.ts
 * Fonctions: voir utils/periods.utils.ts
 */

import type { PeriodOption } from "../types/dashboard.types";
import type { DashboardPeriod } from "../utils/period-resolver";

/**
 * Périodes prédéfinies disponibles dans le sélecteur
 */
export const PERIOD_OPTIONS: PeriodOption[] = [
	{ value: "today", label: "Aujourd'hui", shortLabel: "Auj.", comparisonLabel: "vs hier" },
	{ value: "yesterday", label: "Hier", shortLabel: "Hier", comparisonLabel: "vs avant-hier" },
	{ value: "last7days", label: "7 derniers jours", shortLabel: "7j", comparisonLabel: "vs 7j precedents" },
	{ value: "last30days", label: "30 derniers jours", shortLabel: "30j", comparisonLabel: "vs 30j precedents" },
	{ value: "thisMonth", label: "Ce mois-ci", shortLabel: "Mois", comparisonLabel: "vs mois dernier" },
	{ value: "lastMonth", label: "Mois dernier", shortLabel: "M-1", comparisonLabel: "vs M-2" },
	{ value: "thisYear", label: "Cette année", shortLabel: "Année", comparisonLabel: "vs annee derniere" },
	{ value: "lastYear", label: "Année dernière", shortLabel: "A-1", comparisonLabel: "vs A-2" },
	{ value: "custom", label: "Personnalisé", shortLabel: "Custom", comparisonLabel: "vs periode equivalente" },
] as const;

/**
 * Périodes rapides affichées comme boutons
 */
export const QUICK_PERIOD_OPTIONS: PeriodOption[] = [
	{ value: "last7days", label: "7 jours", shortLabel: "7j", comparisonLabel: "vs 7j precedents" },
	{ value: "last30days", label: "30 jours", shortLabel: "30j", comparisonLabel: "vs 30j precedents" },
	{ value: "thisMonth", label: "Ce mois", shortLabel: "Mois", comparisonLabel: "vs mois dernier" },
	{ value: "thisYear", label: "Cette année", shortLabel: "Année", comparisonLabel: "vs annee derniere" },
] as const;

/**
 * Période par défaut
 */
export const DEFAULT_PERIOD: DashboardPeriod = "last30days";

/**
 * Clé URL pour le paramètre de période
 */
export const PERIOD_URL_KEY = "period";

/**
 * Clés URL pour les dates custom
 */
export const FROM_DATE_URL_KEY = "from";
export const TO_DATE_URL_KEY = "to";

// Re-exports pour retrocompatibilite
export type { PeriodOption } from "../types/dashboard.types";
export { getComparisonLabel } from "../utils/periods.utils";
