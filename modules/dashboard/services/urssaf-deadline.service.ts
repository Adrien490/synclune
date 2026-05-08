/**
 * Calcul des échéances de déclaration URSSAF micro-entreprise (déclaration trimestrielle).
 *
 * Les déclarations de chiffre d'affaires URSSAF micro-entrepreneur sont dues le
 * dernier jour du mois suivant la fin du trimestre :
 *  - T1 (Jan-Mar) → échéance 30 avril
 *  - T2 (Avr-Juin) → échéance 31 juillet
 *  - T3 (Juil-Sep) → échéance 31 octobre
 *  - T4 (Oct-Déc) → échéance 31 janvier (année N+1)
 *
 * Service pur — pas d'I/O. Testable directement en figeant `now`.
 */

export type UrssafDeadline = {
	/** Date d'échéance (UTC, fin de journée 23:59:59 pour comparaison stable) */
	date: Date;
	/** Nombre de jours entiers entre `now` et `date` (peut être négatif si dépassé) */
	daysUntil: number;
	/** Libellé du trimestre concerné, ex: "T1 2026" */
	quarterLabel: string;
};

const URSSAF_DEADLINES: Array<{ month: number; day: number; quarter: number }> = [
	{ month: 0, day: 31, quarter: 4 }, // 31 janvier → T4 année précédente
	{ month: 3, day: 30, quarter: 1 }, // 30 avril → T1
	{ month: 6, day: 31, quarter: 2 }, // 31 juillet → T2
	{ month: 9, day: 31, quarter: 3 }, // 31 octobre → T3
];

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Renvoie l'échéance URSSAF la plus proche (à venir ou en cours) à partir
 * de `now` (par défaut, l'instant courant).
 */
export function getNextUrssafDeadline(now: Date = new Date()): UrssafDeadline {
	const year = now.getUTCFullYear();

	const candidates = [
		...URSSAF_DEADLINES.map((d) => ({ ...d, year })),
		// Premier deadline de l'année suivante (au cas où on est après le 31 octobre)
		{ ...URSSAF_DEADLINES[0]!, year: year + 1 },
	];

	const todayMidnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

	for (const candidate of candidates) {
		const deadline = new Date(
			Date.UTC(candidate.year, candidate.month, candidate.day, 23, 59, 59, 999),
		);
		if (deadline.getTime() >= todayMidnight) {
			const daysUntil = Math.floor((deadline.getTime() - todayMidnight) / MS_PER_DAY);
			const quarterYear = candidate.quarter === 4 ? candidate.year - 1 : candidate.year;
			return {
				date: deadline,
				daysUntil,
				quarterLabel: `T${candidate.quarter} ${quarterYear}`,
			};
		}
	}

	const fallback = candidates[candidates.length - 1]!;
	const fallbackDate = new Date(
		Date.UTC(fallback.year, fallback.month, fallback.day, 23, 59, 59, 999),
	);
	return {
		date: fallbackDate,
		daysUntil: Math.floor((fallbackDate.getTime() - todayMidnight) / MS_PER_DAY),
		quarterLabel: `T${fallback.quarter} ${fallback.quarter === 4 ? fallback.year - 1 : fallback.year}`,
	};
}

/**
 * Seuil à partir duquel l'échéance URSSAF doit être surfacée comme alerte
 * dans le dashboard.
 */
export const URSSAF_ALERT_THRESHOLD_DAYS = 15;
