/**
 * Helpers de saisie/affichage `datetime-local` ancrés sur l'heure de Paris pour
 * les dates de fermeture/réouverture boutique.
 *
 * Contexte : `<input type="datetime-local">` émet une chaîne SANS fuseau
 * (`"2026-07-01T10:00"`). Parsée côté serveur (Vercel = UTC) via `new Date(val)`,
 * elle serait interprétée comme 10:00 UTC — alors que l'admin saisit une heure
 * de Paris. On ancre explicitement la conversion sur `Europe/Paris`.
 *
 * La conversion heure-murale-Paris → UTC (DST-aware) est déléguée au SSOT
 * `shared/utils/timezone.ts` (`parisWallTimeToUtc`) pour éviter de dupliquer
 * l'algorithme d'offset.
 */
import { APP_TIME_ZONE, parisWallTimeToUtc } from "@/shared/utils/timezone";

// Formatter hoisté : construire un `Intl.DateTimeFormat` charge les données de
// locale, inutile de le refaire à chaque formatage de champ.
const PARIS_INPUT_FORMATTER = new Intl.DateTimeFormat("en-CA", {
	timeZone: APP_TIME_ZONE,
	hour12: false,
	year: "numeric",
	month: "2-digit",
	day: "2-digit",
	hour: "2-digit",
	minute: "2-digit",
});

const HAS_EXPLICIT_TZ = /[zZ]$|[+-]\d{2}:\d{2}$/;
const BARE_LOCAL = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

/**
 * Convertit une chaîne `datetime-local` (heure de Paris) en instant UTC.
 *
 * - `""` → `null` (pas de date).
 * - Chaîne avec fuseau explicite (`Z` ou `±HH:mm`) → respectée telle quelle.
 * - Chaîne `datetime-local` nue (`YYYY-MM-DDTHH:mm`) → interprétée comme Paris.
 * - Chaîne non parsable → `Date` invalide (laisse le `.refine` Zod rejeter).
 */
export function parseParisDateTimeLocal(value: string): Date | null {
	const trimmed = value.trim();
	if (trimmed === "") return null;

	// Fuseau explicite : on fait confiance à la chaîne.
	if (HAS_EXPLICIT_TZ.test(trimmed)) {
		return new Date(trimmed);
	}

	const match = BARE_LOCAL.exec(trimmed);
	if (!match) {
		// Format inattendu : retourne une Date (potentiellement invalide) pour
		// que la validation downstream (`.refine` futur > now) la rejette.
		return new Date(trimmed);
	}

	// Groupes 1-5 garantis par le regex ; groupe 6 (secondes) optionnel.
	return parisWallTimeToUtc(
		Number(match[1]),
		Number(match[2]) - 1,
		Number(match[3]),
		Number(match[4]),
		Number(match[5]),
		match[6] ? Number(match[6]) : 0,
	);
}

/**
 * Formate un instant UTC en `YYYY-MM-DDTHH:mm` (heure murale de Paris), pour
 * pré-remplir un `<input type="datetime-local">`. `""` si null/invalide.
 */
export function formatParisDateForInput(date: Date | string | null | undefined): string {
	if (!date) return "";
	const d = date instanceof Date ? date : new Date(date);
	if (Number.isNaN(d.getTime())) return "";

	const parts = PARIS_INPUT_FORMATTER.formatToParts(d);
	const get = (type: Intl.DateTimeFormatPartTypes): string =>
		parts.find((p) => p.type === type)?.value ?? "";
	const hour = get("hour") === "24" ? "00" : get("hour");
	return `${get("year")}-${get("month")}-${get("day")}T${hour}:${get("minute")}`;
}

const parisDateTimeFormatter = new Intl.DateTimeFormat("fr-FR", {
	timeZone: APP_TIME_ZONE,
	dateStyle: "long",
	timeStyle: "short",
});

/**
 * Formate un instant UTC en date/heure longue française, ancrée sur Paris
 * (ex. « 1 juillet 2026 à 10:00 »). Pour l'affichage client/admin du `reopensAt`.
 */
export function formatParisDateTime(date: Date | string | null | undefined): string {
	if (!date) return "";
	const d = date instanceof Date ? date : new Date(date);
	if (Number.isNaN(d.getTime())) return "";
	return parisDateTimeFormatter.format(d);
}
