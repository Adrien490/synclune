import { z } from "zod";

// ============================================================================
// GET LAST ORDER SCHEMA
// ============================================================================

/**
 * Schema pour getLastOrder - pas de paramètres requis
 * L'utilisateur est déterminé via la session
 */
export const getLastOrderSchema = z.object({}).optional();

// ============================================================================
// FETCH LAST ORDER SCHEMA
// ============================================================================

export const fetchLastOrderSchema = z.object({
	// Pas de cuid2 : IDs user générés par Better Auth (alphanumérique, majuscules possibles)
	userId: z.string().trim().min(1).max(64),
});
