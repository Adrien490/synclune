import { Prisma } from "@/app/generated/prisma/client";
import { PaginationInfo } from "@/shared/components/cursor-pagination/pagination";
import {
	GET_WISHLIST_SELECT,
	GET_WISHLIST_ITEM_SELECT,
} from "../constants/wishlist.constants";

// ============================================================================
// TYPES - WISHLIST
// ============================================================================

/**
 * Paramètres pour la récupération de la wishlist avec pagination cursor
 * @param cursor - Curseur de pagination (CUID2)
 * @param direction - Direction de pagination ("forward" | "backward")
 * @param perPage - Nombre d'éléments par page
 */
export type GetWishlistParams = {
	cursor?: string;
	direction?: "forward" | "backward";
	perPage?: number;
};

/**
 * Type complet de la wishlist avec ses relations
 * Inféré depuis le Prisma select pour garantir la cohérence
 */
export type Wishlist = Prisma.WishlistGetPayload<{
	select: typeof GET_WISHLIST_SELECT;
}>;

/**
 * Type d'un article de wishlist avec ses données SKU et produit
 * Inclut: SKU (prix, inventaire, couleur, matériau), produit (titre, slug), image primaire
 */
export type WishlistItem = Prisma.WishlistItemGetPayload<{
	select: typeof GET_WISHLIST_ITEM_SELECT;
}>;

/**
 * Retour de getWishlist avec pagination et count total
 */
export type GetWishlistReturn = {
	/** Liste des articles de la wishlist */
	items: WishlistItem[];
	/** Informations de pagination cursor-based */
	pagination: PaginationInfo;
	/** Nombre total d'articles dans la wishlist */
	totalCount: number;
};

// ============================================================================
// TYPES - WISHLIST ITEM COUNT
// ============================================================================

/**
 * Return type for getWishlistItemCount
 * Returns just the count as a number (used for badge display)
 */
export type GetWishlistItemCountReturn = number;

// ============================================================================
// TYPES - ACTION RETURN DATA
// ============================================================================

/**
 * Données retournées par addToWishlist en cas de succès
 */
export type AddToWishlistData = {
	wishlistItemId: string;
	wishlistId: string;
};

/**
 * Données retournées par removeFromWishlist en cas de succès
 */
export type RemoveFromWishlistData = {
	wishlistId: string;
	removed: boolean;
};

/**
 * Données retournées par toggleWishlistItem en cas de succès
 */
export type ToggleWishlistItemData = {
	wishlistId: string;
	action: "added" | "removed";
	wishlistItemId?: string;
};
