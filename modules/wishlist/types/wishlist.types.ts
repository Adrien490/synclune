import { Prisma } from "@/app/generated/prisma";
import { PaginationInfo } from "@/shared/components/cursor-pagination/pagination";
import {
	GET_WISHLIST_SELECT,
	GET_WISHLIST_ITEM_SELECT,
} from "../constants/wishlist.constants";

// ============================================================================
// TYPES - WISHLIST
// ============================================================================

// Type d'entrée flexible pour les paramètres
export type GetWishlistParams = {
	cursor?: string;
	direction?: "forward" | "backward";
	perPage?: number;
};

export type Wishlist = Prisma.WishlistGetPayload<{
	select: typeof GET_WISHLIST_SELECT;
}>;

export type WishlistItem = Prisma.WishlistItemGetPayload<{
	select: typeof GET_WISHLIST_ITEM_SELECT;
}>;

export type GetWishlistReturn = {
	items: WishlistItem[];
	pagination: PaginationInfo;
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
