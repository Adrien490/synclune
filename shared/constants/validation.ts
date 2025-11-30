/**
 * Constantes de validation centralisées pour les formulaires
 */

/**
 * Expression régulière pour valider les adresses email
 * Format : local@domain.tld
 */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Valide si une chaîne est une adresse email valide
 */
export function isValidEmail(email: string): boolean {
	return EMAIL_REGEX.test(email);
}
