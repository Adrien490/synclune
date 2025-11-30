import type { DashboardPeriod } from "../utils/period-resolver";

/**
 * Configuration des periodes disponibles pour le dashboard
 */

export interface PeriodOption {
	value: DashboardPeriod;
	label: string;
	shortLabel: string;
}

/**
 * Periodes predefinies disponibles dans le selecteur
 */
export const PERIOD_OPTIONS: PeriodOption[] = [
	{ value: "today", label: "Aujourd'hui", shortLabel: "Auj." },
	{ value: "yesterday", label: "Hier", shortLabel: "Hier" },
	{ value: "last7days", label: "7 derniers jours", shortLabel: "7j" },
	{ value: "last30days", label: "30 derniers jours", shortLabel: "30j" },
	{ value: "thisMonth", label: "Ce mois-ci", shortLabel: "Mois" },
	{ value: "lastMonth", label: "Mois dernier", shortLabel: "M-1" },
	{ value: "thisYear", label: "Cette annee", shortLabel: "Annee" },
	{ value: "lastYear", label: "Annee derniere", shortLabel: "A-1" },
	{ value: "custom", label: "Personnalise", shortLabel: "Custom" },
] as const;

/**
 * Periodes rapides affichees comme boutons
 */
export const QUICK_PERIOD_OPTIONS: PeriodOption[] = [
	{ value: "last7days", label: "7 jours", shortLabel: "7j" },
	{ value: "last30days", label: "30 jours", shortLabel: "30j" },
	{ value: "thisMonth", label: "Ce mois", shortLabel: "Mois" },
	{ value: "thisYear", label: "Cette annee", shortLabel: "Annee" },
] as const;

/**
 * Periode par defaut
 */
export const DEFAULT_PERIOD: DashboardPeriod = "last30days";

/**
 * Cle URL pour le parametre de periode
 */
export const PERIOD_URL_KEY = "period";

/**
 * Cles URL pour les dates custom
 */
export const FROM_DATE_URL_KEY = "from";
export const TO_DATE_URL_KEY = "to";
