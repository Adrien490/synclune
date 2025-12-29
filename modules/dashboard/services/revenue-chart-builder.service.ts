import type { RevenueDataPoint } from "../types/dashboard.types";

// ============================================================================
// REVENUE CHART BUILDER SERVICE
// Pure functions for building revenue chart data
// ============================================================================

/**
 * Remplit les jours manquants avec des revenus à 0
 * Transforme les données brutes en série temporelle continue
 *
 * @param revenueMap - Map des revenus par date (format: YYYY-MM-DD)
 * @param startDate - Date de début de la période
 * @param days - Nombre de jours à générer
 * @returns Tableau de points de données avec tous les jours
 */
export function fillMissingDates(
	revenueMap: Map<string, number>,
	startDate: Date,
	days: number
): RevenueDataPoint[] {
	const data: RevenueDataPoint[] = [];

	for (let i = 0; i < days; i++) {
		const date = new Date(startDate);
		date.setDate(date.getDate() + i);
		const dateKey = date.toISOString().split("T")[0];
		data.push({
			date: dateKey,
			revenue: revenueMap.get(dateKey) || 0,
		});
	}

	return data;
}

/**
 * Convertit les résultats SQL en Map de revenus
 * Gère la conversion bigint -> number
 *
 * @param rows - Lignes de résultat SQL
 * @returns Map des revenus par date
 */
export function buildRevenueMap(
	rows: Array<{ date: string; revenue: bigint }>
): Map<string, number> {
	const revenueMap = new Map<string, number>();

	for (const row of rows) {
		revenueMap.set(row.date, Number(row.revenue));
	}

	return revenueMap;
}
