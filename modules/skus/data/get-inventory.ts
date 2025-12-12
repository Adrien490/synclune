"use server";

import { isAdmin } from "@/modules/auth/utils/guards";
import { redirect } from "next/navigation";
import {
	GET_PRODUCT_SKUS_ADMIN_FALLBACK_SORT_BY,
	GET_PRODUCT_SKUS_DEFAULT_SORT_BY,
	GET_PRODUCT_SKUS_DEFAULT_PER_PAGE,
} from "../constants/sku.constants";
import { getProductSkusSchema } from "../schemas/get-skus.schemas";
import type { GetProductSkusReturn } from "../types/skus.types";
import { fetchProductSkus } from "../utils/fetch-skus";
import type { ProductSkuFilters } from "../schemas/sku-filters-schema";

export type { GetProductSkusReturn };

/**
 * Paramètres pour la récupération de l'inventaire global
 */
export interface GetInventoryParams {
	cursor?: string;
	direction?: "forward" | "backward";
	perPage?: number;
	sortBy?: string;
	search?: string;
	filters?: Partial<ProductSkuFilters>;
}

/**
 * Récupère l'inventaire global (tous les SKUs de tous les produits)
 * Pour la page d'inventaire admin
 */
export async function getInventory(
	params: GetInventoryParams = {}
): Promise<GetProductSkusReturn> {
	const admin = await isAdmin();

	if (!admin) {
		redirect("/connexion");
	}

	// Construire les paramètres avec les valeurs par défaut
	const inputParams = {
		cursor: params.cursor,
		direction: params.direction ?? "forward",
		perPage: params.perPage ?? GET_PRODUCT_SKUS_DEFAULT_PER_PAGE,
		sortBy: params.sortBy ?? GET_PRODUCT_SKUS_DEFAULT_SORT_BY,
		search: params.search,
		filters: params.filters,
	};

	const validation = getProductSkusSchema.safeParse(inputParams);

	if (!validation.success) {
		return {
			productSkus: [],
			pagination: {
				nextCursor: null,
				prevCursor: null,
				hasNextPage: false,
				hasPreviousPage: false,
			},
		};
	}

	let validatedParams = validation.data;

	// Utiliser le tri admin par défaut si non spécifié
	if (
		validatedParams.sortBy === GET_PRODUCT_SKUS_DEFAULT_SORT_BY &&
		!params?.sortBy
	) {
		validatedParams = {
			...validatedParams,
			sortBy: GET_PRODUCT_SKUS_ADMIN_FALLBACK_SORT_BY,
		};
	}

	return fetchProductSkus(validatedParams);
}
