import { z } from "zod";
import { dashboardPeriodSchema } from "../schemas/dashboard.schemas";

export type DashboardPeriod = z.infer<typeof dashboardPeriodSchema>;

export interface DateRange {
	startDate: Date;
	endDate: Date;
	/** Date de debut de la periode precedente (pour calcul evolution) */
	previousStartDate: Date;
	/** Date de fin de la periode precedente */
	previousEndDate: Date;
}

/**
 * Convertit une periode predeterminee en dates concretes
 *
 * @param period - La periode selectionnee (today, last7days, etc.)
 * @param customStartDate - Date de debut pour le mode custom
 * @param customEndDate - Date de fin pour le mode custom
 * @returns DateRange avec les dates de la periode et de la periode precedente
 */
export function resolvePeriodToDates(
	period: DashboardPeriod,
	customStartDate?: Date,
	customEndDate?: Date
): DateRange {
	const now = new Date();
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const endOfToday = new Date(
		now.getFullYear(),
		now.getMonth(),
		now.getDate(),
		23,
		59,
		59,
		999
	);

	const DAY_MS = 24 * 60 * 60 * 1000;

	switch (period) {
		case "today": {
			const yesterdayStart = new Date(today.getTime() - DAY_MS);
			const yesterdayEnd = new Date(
				yesterdayStart.getFullYear(),
				yesterdayStart.getMonth(),
				yesterdayStart.getDate(),
				23,
				59,
				59,
				999
			);
			return {
				startDate: today,
				endDate: now,
				previousStartDate: yesterdayStart,
				previousEndDate: yesterdayEnd,
			};
		}

		case "yesterday": {
			const yesterdayStart = new Date(today.getTime() - DAY_MS);
			const yesterdayEnd = new Date(
				yesterdayStart.getFullYear(),
				yesterdayStart.getMonth(),
				yesterdayStart.getDate(),
				23,
				59,
				59,
				999
			);
			const dayBeforeStart = new Date(yesterdayStart.getTime() - DAY_MS);
			const dayBeforeEnd = new Date(
				dayBeforeStart.getFullYear(),
				dayBeforeStart.getMonth(),
				dayBeforeStart.getDate(),
				23,
				59,
				59,
				999
			);
			return {
				startDate: yesterdayStart,
				endDate: yesterdayEnd,
				previousStartDate: dayBeforeStart,
				previousEndDate: dayBeforeEnd,
			};
		}

		case "last7days": {
			const startDate = new Date(today.getTime() - 7 * DAY_MS);
			const previousStartDate = new Date(startDate.getTime() - 7 * DAY_MS);
			const previousEndDate = new Date(startDate.getTime() - 1);
			return {
				startDate,
				endDate: endOfToday,
				previousStartDate,
				previousEndDate,
			};
		}

		case "last30days": {
			const startDate = new Date(today.getTime() - 30 * DAY_MS);
			const previousStartDate = new Date(startDate.getTime() - 30 * DAY_MS);
			const previousEndDate = new Date(startDate.getTime() - 1);
			return {
				startDate,
				endDate: endOfToday,
				previousStartDate,
				previousEndDate,
			};
		}

		case "thisMonth": {
			const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
			const previousStartDate = new Date(
				now.getFullYear(),
				now.getMonth() - 1,
				1
			);
			const previousEndDate = new Date(startDate.getTime() - 1);
			return {
				startDate,
				endDate: endOfToday,
				previousStartDate,
				previousEndDate,
			};
		}

		case "lastMonth": {
			const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
			const endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
			const previousStartDate = new Date(
				now.getFullYear(),
				now.getMonth() - 2,
				1
			);
			const previousEndDate = new Date(startDate.getTime() - 1);
			return {
				startDate,
				endDate,
				previousStartDate,
				previousEndDate,
			};
		}

		case "thisYear": {
			const startDate = new Date(now.getFullYear(), 0, 1);
			const previousStartDate = new Date(now.getFullYear() - 1, 0, 1);
			const previousEndDate = new Date(startDate.getTime() - 1);
			return {
				startDate,
				endDate: endOfToday,
				previousStartDate,
				previousEndDate,
			};
		}

		case "lastYear": {
			const startDate = new Date(now.getFullYear() - 1, 0, 1);
			const endDate = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
			const previousStartDate = new Date(now.getFullYear() - 2, 0, 1);
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

			// Normaliser les dates
			const startDate = new Date(
				customStartDate.getFullYear(),
				customStartDate.getMonth(),
				customStartDate.getDate()
			);
			const endDate = new Date(
				customEndDate.getFullYear(),
				customEndDate.getMonth(),
				customEndDate.getDate(),
				23,
				59,
				59,
				999
			);

			// Calculer la duree de la periode
			const duration = endDate.getTime() - startDate.getTime();

			// Periode precedente de meme duree
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
			const startDate = new Date(today.getTime() - 30 * DAY_MS);
			const previousStartDate = new Date(startDate.getTime() - 30 * DAY_MS);
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
 * Calcule le pourcentage d'evolution entre deux valeurs
 *
 * @param current - Valeur actuelle
 * @param previous - Valeur precedente
 * @returns Pourcentage d'evolution (positif = hausse, negatif = baisse)
 */
export function calculateEvolution(current: number, previous: number): number {
	if (previous === 0) {
		return current > 0 ? 100 : 0;
	}
	return ((current - previous) / previous) * 100;
}

/**
 * Formate une periode pour l'affichage
 *
 * @param period - La periode a formater
 * @returns Label lisible en francais
 */
export function formatPeriodLabel(period: DashboardPeriod): string {
	const labels: Record<DashboardPeriod, string> = {
		today: "Aujourd'hui",
		yesterday: "Hier",
		last7days: "7 derniers jours",
		last30days: "30 derniers jours",
		thisMonth: "Ce mois-ci",
		lastMonth: "Mois dernier",
		thisYear: "Cette annee",
		lastYear: "Annee derniere",
		custom: "Personnalise",
	};
	return labels[period];
}
