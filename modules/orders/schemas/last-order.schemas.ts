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
	userId: z.string().trim().min(1),
});
