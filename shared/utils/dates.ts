/**
 * Utilitaires pour la manipulation de dates
 */

import { format as formatFns } from "date-fns";
import { fr } from "date-fns/locale";

/**
 * Formate une date au format court "d MMM yyyy" (ex: "1 déc 2024")
 *
 * @param date - Date à formater (Date ou string ISO)
 * @returns Date formatée
 *
 * @example
 * ```ts
 * formatDateShort(new Date()) // "1 déc 2024"
 * formatDateShort("2024-12-01") // "1 déc 2024"
 * ```
 */
export function formatDateShort(date: Date | string): string {
	const dateObj = typeof date === "string" ? new Date(date) : date;
	return formatFns(dateObj, "d MMM yyyy", { locale: fr });
}

/**
 * Formate une date avec heure "d MMM yyyy à HH:mm" (ex: "1 déc 2024 à 14:30")
 *
 * @param date - Date à formater (Date ou string ISO)
 * @returns Date et heure formatées
 *
 * @example
 * ```ts
 * formatDateTime(new Date()) // "1 déc 2024 à 14:30"
 * ```
 */
export function formatDateTime(date: Date | string): string {
	const dateObj = typeof date === "string" ? new Date(date) : date;
	return formatFns(dateObj, "d MMM yyyy 'à' HH:mm", { locale: fr });
}

/**
 * Formate une date au format "dd/MM/yyyy HH:mm" (ex: "01/12/2024 14:30")
 *
 * @param date - Date à formater (Date ou string ISO)
 * @returns Date et heure formatées au format numérique
 *
 * @example
 * ```ts
 * formatDateTimeNumeric(new Date()) // "01/12/2024 14:30"
 * ```
 */
export function formatDateTimeNumeric(date: Date | string): string {
	const dateObj = typeof date === "string" ? new Date(date) : date;
	return formatFns(dateObj, "dd/MM/yyyy HH:mm", { locale: fr });
}

/**
 * Formate une date au format long "d MMMM yyyy" (ex: "1 décembre 2024")
 *
 * @param date - Date à formater (Date ou string ISO)
 * @returns Date formatée au format long
 *
 * @example
 * ```ts
 * formatDateLong(new Date()) // "1 décembre 2024"
 * ```
 */
export function formatDateLong(date: Date | string): string {
	const dateObj = typeof date === "string" ? new Date(date) : date;
	return formatFns(dateObj, "d MMMM yyyy", { locale: fr });
}

/**
 * Vérifie si une date est récente (dans les N derniers jours)
 *
 * @param date - Date à vérifier (Date ou string ISO)
 * @param daysAgo - Nombre de jours en arrière (défaut: 7)
 * @returns true si la date est plus récente que daysAgo jours
 *
 * @example
 * ```ts
 * isRecent(new Date(), 7); // true (aujourd'hui est dans les 7 derniers jours)
 * isRecent('2024-01-01', 7); // false (si on est en 2025)
 * isRecent(collection.createdAt, 7); // true si la collection a moins de 7 jours
 * ```
 */
export function isRecent(date: Date | string, daysAgo = 7): boolean {
	const now = new Date();
	const threshold = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
	const dateToCheck = typeof date === "string" ? new Date(date) : date;

	return dateToCheck > threshold;
}

/**
 * Formate une date en "il y a X jours/heures/minutes"
 *
 * @param date - Date à formater
 * @returns String formatée (ex: "il y a 2 jours")
 */
export function formatRelativeTime(date: Date | string): string {
	const now = new Date();
	const dateToFormat = typeof date === "string" ? new Date(date) : date;
	const diffMs = now.getTime() - dateToFormat.getTime();

	const diffMinutes = Math.floor(diffMs / (1000 * 60));
	const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
	const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

	if (diffMinutes < 1) return "à l'instant";
	if (diffMinutes < 60) return `il y a ${diffMinutes} minute${diffMinutes > 1 ? "s" : ""}`;
	if (diffHours < 24) return `il y a ${diffHours} heure${diffHours > 1 ? "s" : ""}`;
	if (diffDays < 7) return `il y a ${diffDays} jour${diffDays > 1 ? "s" : ""}`;
	if (diffDays < 30) {
		const weeks = Math.floor(diffDays / 7);
		return `il y a ${weeks} semaine${weeks > 1 ? "s" : ""}`;
	}

	const months = Math.floor(diffDays / 30);
	return `il y a ${months} mois`;
}

/**
 * Formate une date au format ISO en chaîne localisée
 *
 * @param dateString - Date au format ISO (YYYY-MM-DD)
 * @param locale - Locale à utiliser pour le formatage (défaut: fr-FR)
 * @returns Date formatée ou "Date invalide" en cas d'erreur
 *
 * @example
 * ```ts
 * formatDate("2024-11-16") // "16 novembre 2024"
 * formatDate("2024-11-16", "en-US") // "November 16, 2024"
 * ```
 */
export const formatDate = (
	dateString: string,
	locale: string = "fr-FR"
): string => {
	try {
		// Parse la date en tant que date locale (pas UTC) pour éviter les problèmes de timezone
		// En ajoutant "T00:00:00" on force l'interprétation en heure locale
		const date = new Date(dateString + "T00:00:00");

		// Vérifier si la date est valide
		if (isNaN(date.getTime())) {
			return "Date invalide";
		}

		return date.toLocaleDateString(locale, {
			day: "numeric",
			month: "long",
			year: "numeric",
		});
	} catch {
		return "Date invalide";
	}
};

/**
 * Vérifie si une date est dans une période donnée (par rapport à aujourd'hui)
 *
 * @param dateString - Date au format ISO (YYYY-MM-DD)
 * @param days - Nombre de jours à vérifier
 * @returns true si la date est dans les X derniers jours
 *
 * @example
 * ```ts
 * isWithinDays("2024-11-16", 7) // true si on est entre le 16 et le 23 novembre 2024
 * ```
 */
export const isWithinDays = (dateString: string, days: number): boolean => {
	try {
		// Parse en heure locale pour éviter les problèmes de timezone
		const date = new Date(dateString + "T00:00:00");
		if (isNaN(date.getTime())) return false;

		const comparisonDate = new Date();
		comparisonDate.setDate(comparisonDate.getDate() - days);
		// Reset l'heure pour comparer uniquement les dates
		comparisonDate.setHours(0, 0, 0, 0);

		return date > comparisonDate;
	} catch {
		return false;
	}
};

/**
 * Formate un numéro de version en format court pour affichage
 *
 * @param version - Version au format semver (ex: "1.0.0", "2.3.1")
 * @returns Version formatée pour affichage (ex: "V1", "V2.3", "V2.3.1" si patch > 0)
 *
 * @example
 * ```ts
 * formatVersionDisplay("1.0.0") // "V1"
 * formatVersionDisplay("1.5.0") // "V1.5"
 * formatVersionDisplay("1.5.2") // "V1.5.2"
 * formatVersionDisplay("2.0.0") // "V2"
 * ```
 */
export const formatVersionDisplay = (version: string): string => {
	const [major = "0", minor = "0", patch = "0"] = version.split(".");

	// Si patch > 0, afficher major.minor.patch
	if (patch !== "0") return `V${major}.${minor}.${patch}`;

	// Si minor > 0, afficher major.minor
	if (minor !== "0") return `V${major}.${minor}`;

	// Sinon, juste major
	return `V${major}`;
};
