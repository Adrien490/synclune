import { z } from "zod";

// ============================================================================
// GET USER ACCOUNTS SCHEMA
// ============================================================================

/**
 * Schema pour getUserAccounts - pas de paramètres requis
 * L'utilisateur est déterminé via la session
 */
export const getUserAccountsSchema = z.object({}).optional();

// ============================================================================
// FETCH USER ACCOUNTS SCHEMA
// ============================================================================

export const fetchUserAccountsSchema = z.object({
	userId: z.string().trim().min(1),
});
