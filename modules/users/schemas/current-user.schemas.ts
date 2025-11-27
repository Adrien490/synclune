import { z } from "zod";

// ============================================================================
// GET CURRENT USER SCHEMA
// ============================================================================

/**
 * Schema pour getCurrentUser - pas de paramètres requis
 * L'utilisateur est déterminé via la session
 */
export const getCurrentUserSchema = z.object({}).optional();

// ============================================================================
// FETCH CURRENT USER SCHEMA
// ============================================================================

export const fetchCurrentUserSchema = z.object({
	userId: z.string().trim().min(1),
});
