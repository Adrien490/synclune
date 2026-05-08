import { type z } from "zod";
import { type exportUserDataResponseSchema } from "../schemas/user.schemas";

// ============================================================================
// EXPORT USER DATA TYPES (RGPD - Droit à la portabilité)
// ============================================================================

export type UserDataExport = z.infer<typeof exportUserDataResponseSchema>;
