import { getSession } from "@/modules/auth/lib/get-current-session";
import {
	buildCursorPagination,
	processCursorResults,
} from "@/shared/components/cursor-pagination/pagination";
import { cacheWishlist } from "@/modules/wishlist/constants/cache";
import { prisma } from "@/shared/lib/prisma";

import {
	GET_WISHLIST_SELECT,
	GET_WISHLIST_ITEM_SELECT,
	GET_WISHLIST_DEFAULT_PER_PAGE,
	GET_WISHLIST_MAX_RESULTS_PER_PAGE,
} from "../constants/wishlist.constants";
import type {
	GetWishlistParams,
	GetWishlistReturn,
	Wishlist,
	WishlistItem,
} from "../types/wishlist.types";

// Re-export pour compatibilité
export {
	GET_WISHLIST_SELECT,
	GET_WISHLIST_ITEM_SELECT,
	GET_WISHLIST_DEFAULT_PER_PAGE,
	GET_WISHLIST_MAX_RESULTS_PER_PAGE,
} from "../constants/wishlist.constants";
export type {
	GetWishlistParams,
	GetWishlistReturn,
	Wishlist,
	WishlistItem,
} from "../types/wishlist.types";

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Récupère la wishlist de l'utilisateur connecté avec pagination
 *
 * Authentification requise: L'utilisateur doit être connecté pour accéder à sa wishlist.
 *
 * @param params - Paramètres de pagination (cursor, direction, perPage)
 * @returns Wishlist items paginés avec informations de pagination
 */
export async function getWishlist(
	params: GetWishlistParams = {}
): Promise<GetWishlistReturn> {
	const session = await getSession();
	const userId = session?.user?.id;

	return await fetchWishlist(userId, params);
}

/**
 * Récupère la wishlist d'un utilisateur connecté avec pagination et cache
 *
 * @param userId - ID de l'utilisateur connecté
 * @param params - Paramètres de pagination (cursor, direction, perPage)
 * @returns Wishlist items paginés avec informations de pagination
 */
export async function fetchWishlist(
	userId?: string,
	params: GetWishlistParams = {}
): Promise<GetWishlistReturn> {
	"use cache: private";

	cacheWishlist(userId, undefined);

	try {
		if (!userId) {
			return {
				items: [],
				pagination: {
					nextCursor: null,
					prevCursor: null,
					hasNextPage: false,
					hasPreviousPage: false,
				},
				totalCount: 0,
			};
		}

		const take = Math.min(
			Math.max(1, params.perPage || GET_WISHLIST_DEFAULT_PER_PAGE),
			GET_WISHLIST_MAX_RESULTS_PER_PAGE
		);

		const cursorConfig = buildCursorPagination({
			cursor: params.cursor,
			direction: params.direction,
			take,
		});

		// Filtres communs pour les requêtes wishlistItem
		const itemWhereClause = {
			wishlist: { userId },
			sku: {
				isActive: true,
				product: {
					status: "PUBLIC" as const,
				},
			},
		};

		// Exécuter count et findMany en parallèle (2 requêtes au lieu de 3)
		const [totalCount, items] = await Promise.all([
			prisma.wishlistItem.count({
				where: itemWhereClause,
			}),
			prisma.wishlistItem.findMany({
				where: itemWhereClause,
				select: GET_WISHLIST_ITEM_SELECT,
				orderBy: GET_WISHLIST_SELECT.items.orderBy,
				...cursorConfig,
			}),
		]);

		if (totalCount === 0) {
			return {
				items: [],
				pagination: {
					nextCursor: null,
					prevCursor: null,
					hasNextPage: false,
					hasPreviousPage: false,
				},
				totalCount: 0,
			};
		}

		const { items: paginatedItems, pagination } = processCursorResults(
			items,
			take,
			params.direction,
			params.cursor
		);

		return {
			items: paginatedItems,
			pagination,
			totalCount,
		};
	} catch (error) {
		return {
			items: [],
			pagination: {
				nextCursor: null,
				prevCursor: null,
				hasNextPage: false,
				hasPreviousPage: false,
			},
			totalCount: 0,
		};
	}
}
