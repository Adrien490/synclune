/**
 * Helpers pour la manipulation de dates dans le module dashboard
 * Centralise les operations courantes pour eviter la duplication
 */

/**
 * Retourne le debut de la journee (00:00:00.000)
 */
export function getStartOfDay(date: Date = new Date()): Date {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Retourne la fin de la journee (23:59:59.999)
 */
export function getEndOfDay(date: Date = new Date()): Date {
	return new Date(
		date.getFullYear(),
		date.getMonth(),
		date.getDate(),
		23,
		59,
		59,
		999
	);
}

/**
 * Retourne le debut du mois (1er jour, 00:00:00.000)
 */
export function getStartOfMonth(year: number, month: number): Date {
	return new Date(year, month, 1);
}

/**
 * Retourne la fin du mois (dernier jour, 23:59:59.999)
 */
export function getEndOfMonth(year: number, month: number): Date {
	// Le jour 0 du mois suivant = dernier jour du mois courant
	return new Date(year, month + 1, 0, 23, 59, 59, 999);
}

/**
 * Retourne le debut de l'annee (1er janvier, 00:00:00.000)
 */
export function getStartOfYear(year: number): Date {
	return new Date(year, 0, 1);
}

/**
 * Retourne la fin de l'annee (31 decembre, 23:59:59.999)
 */
export function getEndOfYear(year: number): Date {
	return new Date(year, 11, 31, 23, 59, 59, 999);
}

/**
 * Soustrait un nombre de jours a une date
 */
export function subtractDays(date: Date, days: number): Date {
	const result = new Date(date);
	result.setDate(result.getDate() - days);
	return result;
}

/**
 * Soustrait un nombre de mois a une date
 */
export function subtractMonths(date: Date, months: number): Date {
	const result = new Date(date);
	result.setMonth(result.getMonth() - months);
	return result;
}

/**
 * Millisecondes dans un jour
 */
export const DAY_MS = 24 * 60 * 60 * 1000;
