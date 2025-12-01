/**
 * Utilitaires de sanitization pour prévenir les injections XSS
 *
 * Ce fichier centralise les fonctions de sanitization utilisées
 * dans les emails, les rendus HTML, etc.
 */

/**
 * Sanitize une chaîne pour un contexte email HTML
 *
 * Plus strict qu'un simple escapeHtml car les emails n'ont pas besoin de HTML riche.
 * Cette fonction :
 * - Supprime les caractères de contrôle Unicode (sauf newlines)
 * - Échappe les caractères HTML dangereux
 * - Échappe les séquences JavaScript potentielles
 * - Limite la longueur (protection DoS)
 *
 * @param str - La chaîne à sanitizer
 * @returns La chaîne sanitizée, safe pour insertion dans du HTML
 *
 * @example
 * ```ts
 * const userInput = "<script>alert('xss')</script>";
 * const safe = sanitizeForEmail(userInput);
 * // Résultat: "&lt;script&gt;alert(&#x27;xss&#x27;)&lt;/script&gt;"
 * ```
 */
export function sanitizeForEmail(str: string): string {
	return (
		str
			// Supprime les caractères de contrôle Unicode (sauf newlines \n \r)
			.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, "")
			// Échappe les caractères HTML dangereux
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#x27;")
			// Échappe les backslashes (prévient \x3C, \u003C, etc.)
			.replace(/\\/g, "&#x5C;")
			// Limite la longueur (protection DoS)
			.slice(0, 10000)
	);
}

/**
 * Convertit les newlines en balises <br> de manière sécurisée
 *
 * IMPORTANT: Cette fonction doit être appelée APRÈS sanitizeForEmail
 * car elle insère du HTML (<br>).
 *
 * @param str - La chaîne avec des newlines
 * @returns La chaîne avec les newlines converties en <br>
 *
 * @example
 * ```ts
 * const text = sanitizeForEmail("Line 1\nLine 2");
 * const html = newlinesToBr(text);
 * // Résultat: "Line 1<br>Line 2"
 * ```
 */
export function newlinesToBr(str: string): string {
	return str.replace(/\n/g, "<br>");
}

/**
 * Échappe les caractères HTML de base
 *
 * Version simplifiée pour les contextes où une sanitization complète
 * n'est pas nécessaire (ex: affichage de données déjà validées).
 *
 * @param str - La chaîne à échapper
 * @returns La chaîne avec les caractères HTML échappés
 */
export function escapeHtml(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}
