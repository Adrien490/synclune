import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { forbidden } from "next/navigation";
import { getProductSkusSchema } from "../schemas/get-skus.schemas";
import { type GetProductSkusParams, type GetProductSkusReturn } from "../types/skus.types";
import { fetchProductSkus } from "./fetch-skus";

/**
 * Lecture gardée des SKUs d'un produit (admin uniquement).
 *
 * Vit dans `data/` et non `actions/` : c'est une LECTURE consommée par un Server
 * Component (`app/admin/catalogue/produits/[slug]/variantes/page.tsx`), pas une
 * mutation — la matrice de décision de CLAUDE.md range ce cas en `data/`. Elle ne
 * porte donc pas `"use server"` : ce n'est pas une Server Action exposée au client.
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
