import { z } from "zod";
import {
	deleteAccountSchema,
	exportUserDataResponseSchema,
} from "../schemas/user.schemas";

// ============================================================================
// DELETE ACCOUNT TYPES (RGPD - Droit à l'oubli)
// ============================================================================

export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;

// ============================================================================
// EXPORT USER DATA TYPES (RGPD - Droit à la portabilité)
// ============================================================================

export type ExportUserDataResponse = z.infer<typeof exportUserDataResponseSchema>;

/**
 * Alias pour compatibilité avec l'action existante
 */
export type UserDataExport = ExportUserDataResponse;
