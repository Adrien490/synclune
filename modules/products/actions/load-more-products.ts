"use server";

import { z } from "zod";

import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { logger } from "@/shared/lib/logger";
import { PRODUCT_LOAD_MORE_LIMIT } from "@/shared/lib/rate-limit-config";

import {
	GET_PRODUCTS_DEFAULT_PER_PAGE,
	GET_PRODUCTS_DEFAULT_SORT_BY,
	GET_PRODUCTS_MAX_RESULTS_PER_PAGE,
} from "../constants/product.constants";
import { getProducts } from "../data/get-products";
import { cursorValueSchema } from "@/shared/schemas/pagination-schema";
import { productFiltersSchema } from "../schemas/product-query.schemas";
import type { Product, SortField } from "../types/product.types";

const loadMoreProductsSchema = z.object({
	// ⚠️ `cursorValueSchema` (SSOT), jamais `z.cuid2()`. Un curseur est un id
	// OPAQUE : il vient d'un `id` Prisma cuid2 aujourd'hui, mais la SSOT documente
	// précisément l'incident où une contrainte trop étroite rendait « Page suivante »
	// no-op. Re-poser une contrainte ici rouvre exactement cette porte.
	cursor: cursorValueSchema,
	sortBy: z.string().optional(),
	search: z.string().max(200).optional(),
	filters: productFiltersSchema.optional(),
	/**
	 * Taille de lot — reprise du `?perPage=` de l'URL.
	 *
	 * Codée en dur auparavant : un visiteur arrivé en `?perPage=50` voyait
	 * 50 pièces rendues par le serveur puis des lots de 20. Bornée ici comme
	 * dans `parsePaginationParams`, et non « fail-safe par défaut » : une
	 * valeur hors bornes retombe sur le défaut plutôt que de faire échouer
	 * la requête.
	 */
	perPage: z.coerce
		.number()
		.int()
		.min(1)
		.max(GET_PRODUCTS_MAX_RESULTS_PER_PAGE)
		.catch(GET_PRODUCTS_DEFAULT_PER_PAGE)
		.optional(),
});

interface LoadMoreProductsResult {
	products: Product[];
	nextCursor: string | null;
	hasMore: boolean;
	error?: string;
}

/**
 * Server action to load the next page of products (mobile catalogue load-more).
 *
 * Validates input, rate-limits, delegates to
 * `getProducts` with `direction: "forward"`. Filters/search/sortBy are passed
 * through so the appended page respects the same constraints as the URL-driven
 * initial page rendered server-side.
 */
export async function loadMoreProducts(
	params: z.input<typeof loadMoreProductsSchema>,
): Promise<LoadMoreProductsResult> {
	try {
		const validation = loadMoreProductsSchema.safeParse(params);
		if (!validation.success) {
			return {
				products: [],
				nextCursor: null,
				hasMore: false,
				error: "Paramètres invalides",
			};
		}

		const rateCheck = await enforceRateLimitForCurrentUser(PRODUCT_LOAD_MORE_LIMIT);
		if ("error" in rateCheck) {
			return {
				products: [],
				nextCursor: null,
				hasMore: false,
				error: "Trop de requêtes. Patiente un instant.",
			};
		}

		const { cursor, sortBy, search, filters, perPage } = validation.data;

		const data = await getProducts({
			cursor,
			perPage: perPage ?? GET_PRODUCTS_DEFAULT_PER_PAGE,
			direction: "forward",
			sortBy: (sortBy as SortField | undefined) ?? GET_PRODUCTS_DEFAULT_SORT_BY,
			search,
			filters: filters ?? {},
		});

		return {
			products: data.products,
			nextCursor: data.pagination.nextCursor,
			hasMore: data.pagination.hasNextPage,
		};
	} catch (e) {
		logger.error("Failed to load more products", e, { action: "loadMoreProducts" });
		return {
			products: [],
			nextCursor: null,
			hasMore: false,
			error: "Impossible de charger plus de produits",
		};
	}
}
