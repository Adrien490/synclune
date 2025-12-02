import { z } from "zod";
import { dashboardPeriodSchema } from "../schemas/dashboard.schemas";
import {
	getStartOfDay,
	getEndOfDay,
	getStartOfMonth,
	getEndOfMonth,
	getStartOfYear,
	getEndOfYear,
	subtractDays,
} from "./date-helpers";

// Réexport pour compatibilité avec les imports existants
export { calculateEvolutionRate as calculateEvolution } from "./calculations";

export type DashboardPeriod = z.infer<typeof dashboardPeriodSchema>;

export interface DateRange {
	startDate: Date;
	endDate: Date;
	/** Date de début de la période précédente (pour calcul évolution) */
	previousStartDate: Date;
	/** Date de fin de la période précédente */
	previousEndDate: Date;
}

/**
 * Convertit une période prédéterminée en dates concrètes
 *
 * @param period - La période sélectionnée (today, last7days, etc.)
 * @param customStartDate - Date de début pour le mode custom
 * @param customEndDate - Date de fin pour le mode custom
 * @returns DateRange avec les dates de la période et de la période précédente
 */
export function resolvePeriodToDates(
	period: DashboardPeriod,
	customStartDate?: Date,
	customEndDate?: Date
): DateRange {
	const now = new Date();
	const today = getStartOfDay(now);
	const endOfToday = getEndOfDay(now);

	switch (period) {
		case "today": {
			const yesterdayStart = subtractDays(today, 1);
			const yesterdayEnd = getEndOfDay(yesterdayStart);
			return {
				startDate: today,
				endDate: now,
				previousStartDate: getStartOfDay(yesterdayStart),
				previousEndDate: yesterdayEnd,
			};
		}

		case "yesterday": {
			const yesterdayStart = getStartOfDay(subtractDays(today, 1));
			const yesterdayEnd = getEndOfDay(yesterdayStart);
			const dayBeforeStart = getStartOfDay(subtractDays(yesterdayStart, 1));
			const dayBeforeEnd = getEndOfDay(dayBeforeStart);
			return {
				startDate: yesterdayStart,
				endDate: yesterdayEnd,
				previousStartDate: dayBeforeStart,
				previousEndDate: dayBeforeEnd,
			};
		}

		case "last7days": {
			const startDate = subtractDays(today, 7);
			const previousStartDate = subtractDays(startDate, 7);
			const previousEndDate = new Date(startDate.getTime() - 1);
			return {
				startDate,
				endDate: endOfToday,
				previousStartDate,
				previousEndDate,
			};
		}

		case "last30days": {
			const startDate = subtractDays(today, 30);
			const previousStartDate = subtractDays(startDate, 30);
			const previousEndDate = new Date(startDate.getTime() - 1);
			return {
				startDate,
				endDate: endOfToday,
				previousStartDate,
				previousEndDate,
			};
		}

		case "thisMonth": {
			const startDate = getStartOfMonth(now.getFullYear(), now.getMonth());
			const previousStartDate = getStartOfMonth(now.getFullYear(), now.getMonth() - 1);
			const previousEndDate = new Date(startDate.getTime() - 1);
			return {
				startDate,
				endDate: endOfToday,
				previousStartDate,
				previousEndDate,
			};
		}

		case "lastMonth": {
			const startDate = getStartOfMonth(now.getFullYear(), now.getMonth() - 1);
			const endDate = getEndOfMonth(now.getFullYear(), now.getMonth() - 1);
			const previousStartDate = getStartOfMonth(now.getFullYear(), now.getMonth() - 2);
			const previousEndDate = new Date(startDate.getTime() - 1);
			return {
				startDate,
				endDate,
				previousStartDate,
				previousEndDate,
			};
		}

		case "thisYear": {
			const startDate = getStartOfYear(now.getFullYear());
			const previousStartDate = getStartOfYear(now.getFullYear() - 1);
			const previousEndDate = new Date(startDate.getTime() - 1);
			return {
				startDate,
				endDate: endOfToday,
				previousStartDate,
				previousEndDate,
			};
		}

		case "lastYear": {
			const startDate = getStartOfYear(now.getFullYear() - 1);
			const endDate = getEndOfYear(now.getFullYear() - 1);
			const previousStartDate = getStartOfYear(now.getFullYear() - 2);
			const previousEndDate = new Date(startDate.getTime() - 1);
			return {
				startDate,
				endDate,
				previousStartDate,
				previousEndDate,
			};
		}

		case "custom": {
			if (!customStartDate || !customEndDate) {
				throw new Error("Custom period requires startDate and endDate");
			}

			const startDate = getStartOfDay(customStartDate);
			const endDate = getEndOfDay(customEndDate);

			// Calculer la durée de la période
			const duration = endDate.getTime() - startDate.getTime();

			// Période précédente de même durée
			const previousEndDate = new Date(startDate.getTime() - 1);
			const previousStartDate = new Date(
				previousEndDate.getTime() - duration + 1
			);

			return {
				startDate,
				endDate,
				previousStartDate,
				previousEndDate,
			};
		}

		default: {
			// Fallback sur last30days
			const startDate = subtractDays(today, 30);
			const previousStartDate = subtractDays(startDate, 30);
			const previousEndDate = new Date(startDate.getTime() - 1);
			return {
				startDate,
				endDate: endOfToday,
				previousStartDate,
				previousEndDate,
			};
		}
	}
}

/**
 * Formate une période pour l'affichage
 *
 * @param period - La période à formater
 * @returns Label lisible en français
 */
export function formatPeriodLabel(period: DashboardPeriod): string {
	const labels: Record<DashboardPeriod, string> = {
		today: "Aujourd'hui",
		yesterday: "Hier",
		last7days: "7 derniers jours",
		last30days: "30 derniers jours",
		thisMonth: "Ce mois-ci",
		lastMonth: "Mois dernier",
		thisYear: "Cette année",
		lastYear: "Année dernière",
		custom: "Personnalisé",
	};
	return labels[period];
}
