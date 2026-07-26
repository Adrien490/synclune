"use server";

import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { forbidden } from "next/navigation";
import { getProductSkusSchema } from "../schemas/get-skus.schemas";
import { type GetProductSkusParams, type GetProductSkusReturn } from "../types/skus.types";
import { fetchProductSkus } from "../data/fetch-skus";

/**
 * Action serveur pour récupérer les SKUs de produits (admin uniquement)
 *
 * requireAdmin() re-vérifie le rôle en DB — jamais le cookie seul (stale ~5 min).
 */
export async function getProductSkus(params: GetProductSkusParams): Promise<GetProductSkusReturn> {
	const admin = await requireAdmin();

	if ("error" in admin) {
		forbidden();
	}

	const validation = getProductSkusSchema.safeParse(params);

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

	return fetchProductSkus(validation.data);
}
