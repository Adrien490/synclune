import type { DashboardPeriod } from "../utils/period-resolver";

/**
 * Configuration des périodes disponibles pour le dashboard
 */

export interface PeriodOption {
	value: DashboardPeriod;
	label: string;
	shortLabel: string;
}

/**
 * Périodes prédéfinies disponibles dans le sélecteur
 */
export const PERIOD_OPTIONS: PeriodOption[] = [
	{ value: "today", label: "Aujourd'hui", shortLabel: "Auj." },
	{ value: "yesterday", label: "Hier", shortLabel: "Hier" },
	{ value: "last7days", label: "7 derniers jours", shortLabel: "7j" },
	{ value: "last30days", label: "30 derniers jours", shortLabel: "30j" },
	{ value: "thisMonth", label: "Ce mois-ci", shortLabel: "Mois" },
	{ value: "lastMonth", label: "Mois dernier", shortLabel: "M-1" },
	{ value: "thisYear", label: "Cette année", shortLabel: "Année" },
	{ value: "lastYear", label: "Année dernière", shortLabel: "A-1" },
	{ value: "custom", label: "Personnalisé", shortLabel: "Custom" },
] as const;

/**
 * Périodes rapides affichées comme boutons
 */
export const QUICK_PERIOD_OPTIONS: PeriodOption[] = [
	{ value: "last7days", label: "7 jours", shortLabel: "7j" },
	{ value: "last30days", label: "30 jours", shortLabel: "30j" },
	{ value: "thisMonth", label: "Ce mois", shortLabel: "Mois" },
	{ value: "thisYear", label: "Cette année", shortLabel: "Année" },
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
