/**
 * Helpers timezone pour le reporting du chiffre d'affaires.
 *
 * Synclune est une micro-entreprise française : le CA mensuel/annuel et le livre
 * de recettes raisonnent en **heure de Paris**, pas en UTC. Sans conversion, une
 * commande payée le 1er du mois à 00h30 Paris (= 23h30 UTC le dernier jour du
 * mois précédent) serait attribuée au mois précédent → discordance avec la
 * comptabilité (ANALYTICS-AUDIT-005).
 *
 * Aucune dépendance externe (date-fns-tz absent) : on s'appuie sur
 * `Intl.DateTimeFormat` qui gère nativement les transitions heure d'été/hiver.
 */

export const APP_TIME_ZONE = "Europe/Paris";

// Formatters hoistés au scope du module : construire un `Intl.DateTimeFormat`
// coûte cher (chargement des données de locale) et ces helpers sont appelés en
// boucle sur les points du graphe de revenus. Un formatter est stateless.
const PARIS_WALL_CLOCK_FORMATTER = new Intl.DateTimeFormat("en-US", {
	timeZone: APP_TIME_ZONE,
	hourCycle: "h23",
	year: "numeric",
	month: "2-digit",
	day: "2-digit",
	hour: "2-digit",
	minute: "2-digit",
	second: "2-digit",
});

const PARIS_DATE_FORMATTER = new Intl.DateTimeFormat("en-CA", {
	timeZone: APP_TIME_ZONE,
	year: "numeric",
	month: "2-digit",
	day: "2-digit",
});

/**
 * Décalage (en ms) de `APP_TIME_ZONE` par rapport à UTC à l'instant donné.
 * Positif quand Paris est en avance sur UTC (toujours le cas : +1h hiver, +2h été).
 */
function parisOffsetMs(date: Date): number {
	const parts = Object.fromEntries(
		PARIS_WALL_CLOCK_FORMATTER.formatToParts(date).map((p) => [p.type, p.value]),
	);
	const asUtc = Date.UTC(
		Number(parts.year),
		Number(parts.month) - 1,
		Number(parts.day),
		Number(parts.hour),
		Number(parts.minute),
		Number(parts.second),
	);
	return asUtc - date.getTime();
}

/**
 * Convertit une heure murale de Paris (année, mois 0-indexé, jour, …) en
 * l'instant UTC correspondant. DST-aware.
 *
 * @example
 * parisWallTimeToUtc(2026, 2, 1) // 1er mars 2026 00:00 Paris → 2026-02-28T23:00:00Z (hiver +1)
 * parisWallTimeToUtc(2026, 6, 1) // 1er juil. 2026 00:00 Paris → 2026-06-30T22:00:00Z (été +2)
 */
export function parisWallTimeToUtc(
	year: number,
	month: number,
	day: number,
	hour = 0,
	minute = 0,
	second = 0,
	ms = 0,
): Date {
	const utcGuess = Date.UTC(year, month, day, hour, minute, second, ms);
	// L'offset d'un fuseau est toujours un multiple de la minute. On le calcule sur
	// un instant sans millisecondes : `Intl` tronque les ms en interne, ce qui
	// fausserait l'offset de jusqu'à 999 ms sur des bornes type 23:59:59.999.
	const offset = parisOffsetMs(new Date(Date.UTC(year, month, day, hour, minute, second)));
	return new Date(utcGuess - offset);
}

/**
 * Composantes calendaires (année, mois 0-indexé, jour) d'un instant exprimées
 * en heure de Paris.
 */
export function getParisDateParts(date: Date): { year: number; month: number; day: number } {
	const parts = Object.fromEntries(
		PARIS_DATE_FORMATTER.formatToParts(date).map((p) => [p.type, p.value]),
	);
	return {
		year: Number(parts.year),
		month: Number(parts.month) - 1,
		day: Number(parts.day),
	};
}

/**
 * Clé de date `YYYY-MM-DD` d'un instant, exprimée en heure de Paris.
 * Utilisée pour bucketer les points du graphique de revenus côté builder afin
 * que les buckets correspondent au `TO_CHAR(... AT TIME ZONE 'Europe/Paris')` SQL.
 */
export function parisDateKey(date: Date): string {
	// en-CA produit nativement le format YYYY-MM-DD.
	return PARIS_DATE_FORMATTER.format(date);
}
