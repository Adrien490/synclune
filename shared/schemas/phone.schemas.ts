import { isValidPhoneNumber } from "react-phone-number-input";
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
 * Utilise react-phone-number-input pour la validation
 */
export const phoneSchema = z
	.string()
	.min(1, PHONE_ERROR_MESSAGES.REQUIRED)
	.refine(isValidPhoneNumber, { message: PHONE_ERROR_MESSAGES.INVALID });

/**
 * Type infere du schema telephone
 */
export type PhoneInput = z.infer<typeof phoneSchema>;
