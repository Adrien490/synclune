import { z } from "zod";

// ============================================================================
// GET USER ADDRESSES SCHEMA
// ============================================================================

/**
 * Schema pour getUserAddresses - pas de paramètres requis
 * L'utilisateur est déterminé via la session
 */
export const getUserAddressesSchema = z.object({}).optional();

// ============================================================================
// FETCH USER ADDRESSES SCHEMA
// ============================================================================

export const fetchUserAddressesSchema = z.object({
	userId: z.string().trim().min(1),
});
