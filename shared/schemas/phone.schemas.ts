import { isValidPhoneNumber } from "libphonenumber-js";
import { z } from "zod";

// ============================================================================
// PHONE SCHEMAS
// ============================================================================

/**
 * Messages d'erreur pour les validations telephone
 */
export const PHONE_ERROR_MESSAGES = {
	REQUIRED: "Le numero de telephone est requis",
	INVALID: "Numero de telephone invalide",
} as const;

/**
 * Schema telephone avec validation internationale
 * Utilise libphonenumber-js pour la validation (SSR-compatible)
 */
export const phoneSchema = z
	.string()
	.min(1, PHONE_ERROR_MESSAGES.REQUIRED)
	.refine(isValidPhoneNumber, { message: PHONE_ERROR_MESSAGES.INVALID });

/**
 * Type infere du schema telephone
 */
export type PhoneInput = z.infer<typeof phoneSchema>;
