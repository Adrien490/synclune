import { type z } from "zod";
import { type exportUserDataResponseSchema } from "../schemas/user.schemas";

// ============================================================================
// EXPORT USER DATA TYPES (RGPD - Droit à la portabilité)
// ============================================================================

export type ExportUserDataResponse = z.infer<typeof exportUserDataResponseSchema>;

/**
 * Alias pour compatibilité avec l'action existante
 */
export type UserDataExport = ExportUserDataResponse;
