import { z } from "zod";
import {
	GET_WISHLIST_DEFAULT_PER_PAGE,
	GET_WISHLIST_MAX_RESULTS_PER_PAGE,
} from "../constants/wishlist.constants";

// ============================================================================
// GET WISHLIST SCHEMA
// ============================================================================

export const getWishlistSchema = z.object({
	cursor: z.cuid2().optional(),
	direction: z.enum(["forward", "backward"]).optional().default("forward"),
	perPage: z.coerce
		.number()
		.int({ message: "Le nombre par page doit être un entier" })
		.min(1, { message: "Le nombre par page doit être au minimum 1" })
		.max(
			GET_WISHLIST_MAX_RESULTS_PER_PAGE,
			{ message: `Le nombre par page ne peut pas dépasser ${GET_WISHLIST_MAX_RESULTS_PER_PAGE}` }
		)
		.default(GET_WISHLIST_DEFAULT_PER_PAGE),
});

// ============================================================================
// WISHLIST ITEM SCHEMAS
// ============================================================================

/**
 * Schéma de validation pour l'ajout à la wishlist
 */
export const addToWishlistSchema = z.object({
	skuId: z.string().cuid({ message: 'SKU invalide' }),
});

export type AddToWishlistInput = z.infer<typeof addToWishlistSchema>;

/**
 * Schéma de validation pour vider la wishlist
 * Aucune donnée requise car on vide toute la wishlist de l'utilisateur
 */
export const clearWishlistSchema = z.object({});

export type ClearWishlistSchema = z.infer<typeof clearWishlistSchema>;

/**
 * Schéma de validation pour le retrait de la wishlist
 */
export const removeFromWishlistSchema = z.object({
	skuId: z.string().cuid({ message: 'SKU invalide' }),
});

export type RemoveFromWishlistInput = z.infer<typeof removeFromWishlistSchema>;

/**
 * Schéma de validation pour le toggle wishlist
 */
export const toggleWishlistItemSchema = z.object({
	skuId: z.string().cuid({ message: 'SKU invalide' }),
});

export type ToggleWishlistItemInput = z.infer<typeof toggleWishlistItemSchema>;
