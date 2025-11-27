import { z } from "zod";

// ============================================================================
// GET VERIFICATION SCHEMA
// ============================================================================

export const getVerificationSchema = z.object({
	id: z.string().trim().min(1),
});
