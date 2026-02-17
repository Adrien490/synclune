import { z } from "zod";

// ============================================================================
// ADDRESS ID SCHEMA (pour delete/setDefault)
// ============================================================================

export const addressIdSchema = z.object({
	addressId: z.cuid2({ message: "ID d'adresse invalide" }),
});
