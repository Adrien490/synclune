import { z } from "zod";

// ============================================================================
// GET ACCOUNT STATS SCHEMA
// ============================================================================

/**
 * Schema pour getAccountStats - pas de paramètres requis
 * L'utilisateur est déterminé via la session
 */
export const getAccountStatsSchema = z.object({}).optional();

// ============================================================================
// FETCH ACCOUNT STATS SCHEMA
// ============================================================================

export const fetchAccountStatsSchema = z.object({
	userId: z.string().trim().min(1),
});
