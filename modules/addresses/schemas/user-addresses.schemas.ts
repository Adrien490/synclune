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

// ============================================================================
// ADDRESS ID SCHEMA (pour delete/setDefault)
// ============================================================================

export const addressIdSchema = z.object({
	addressId: z.cuid2({ message: "ID d'adresse invalide" }),
});
