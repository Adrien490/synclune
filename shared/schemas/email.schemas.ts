import { z } from "zod";

// ============================================================================
// EMAIL SCHEMAS
// ============================================================================

/**
 * Messages d'erreur pour les validations email
 */
export const EMAIL_ERROR_MESSAGES = {
	REQUIRED: "L'email est requis",
	INVALID_FORMAT: "Vérifiez le format de votre email (ex: nom@domaine.com)",
	DISPOSABLE:
		"Les adresses email temporaires ne sont pas acceptées. Merci d'utiliser votre email principal",
} as const;

/**
 * Longueur maximale — alignée sur `User.email` et `Order.customerEmail`, tous deux
 * `VarChar(255)`.
 *
 * ⚠️ `z.email()` valide le FORMAT, jamais la longueur : une adresse de 300 caractères
 * techniquement valide traversait le checkout et l'inscription, puis échouait en
 * `22001` Postgres à l'INSERT — erreur générique, sans indication du champ. Poser la
 * borne ici la propage d'un coup au checkout, à l'auth et aux formulaires admin, qui
 * dérivent tous de ces deux schémas.
 */
const EMAIL_MAX_LENGTH = 255;

const EMAIL_TOO_LONG = `L'email ne peut pas dépasser ${EMAIL_MAX_LENGTH} caractères`;

/**
 * Schema email de base avec validation, lowercase et trim
 * Utilise pour la connexion, inscription, reset password, etc.
 */
export const emailSchema = z
	.email({
		// z.email() n'a pas d'étage min(1) séparé : on restitue le message
		// REQUIRED sur input vide, INVALID_FORMAT sinon (parité pré-migration).
		error: (issue) =>
			issue.input === "" ? EMAIL_ERROR_MESSAGES.REQUIRED : EMAIL_ERROR_MESSAGES.INVALID_FORMAT,
	})
	.max(EMAIL_MAX_LENGTH, EMAIL_TOO_LONG)
	.toLowerCase()
	.trim();

/**
 * Schema email optionnel (pour les guests checkout, etc.)
 */
export const emailOptionalSchema = z
	.email(EMAIL_ERROR_MESSAGES.INVALID_FORMAT)
	.max(EMAIL_MAX_LENGTH, EMAIL_TOO_LONG)
	.toLowerCase()
	.trim()
	.optional();

/**
 * Type infere du schema email
 */
type EmailInput = z.infer<typeof emailSchema>;
