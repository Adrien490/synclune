import { z } from "zod";

// ============================================================================
// EMAIL SCHEMAS
// ============================================================================

/**
 * Messages d'erreur pour les validations email
 */
export const EMAIL_ERROR_MESSAGES = {
	REQUIRED: "L'email est requis",
	INVALID_FORMAT: "Verifie le format de ton email (ex: nom@domaine.com)",
	DISPOSABLE: "Les adresses email temporaires ne sont pas acceptees. Merci d'utiliser ton email principal",
} as const;

/**
 * Schema email de base avec validation, lowercase et trim
 * Utilise pour la connexion, inscription, reset password, etc.
 */
export const emailSchema = z
	.string()
	.min(1, EMAIL_ERROR_MESSAGES.REQUIRED)
	.email(EMAIL_ERROR_MESSAGES.INVALID_FORMAT)
	.toLowerCase()
	.trim();

/**
 * Schema email optionnel (pour les guests checkout, etc.)
 */
export const emailOptionalSchema = z
	.string()
	.email(EMAIL_ERROR_MESSAGES.INVALID_FORMAT)
	.toLowerCase()
	.trim()
	.optional();

/**
 * Type infere du schema email
 */
export type EmailInput = z.infer<typeof emailSchema>;
