import * as Sentry from "@sentry/nextjs";
import { requireAdmin } from "@/modules/admin-auth/lib/require-admin";
import { logger } from "@/shared/lib/logger";
import { forbidden } from "next/navigation";
import { getProductVariantsSchema } from "../schemas/get-variants.schemas";
import {
	type GetProductVariantsParams,
	type GetProductVariantsReturn,
} from "../types/variants.types";
import { fetchProductVariants } from "./fetch-variants";

/**
 * Lecture gardée des VARIANTs d'un produit (admin uniquement).
 *
 * Vit dans `data/` et non `actions/` : c'est une LECTURE consommée par un Server
 * Component (`app/admin/catalogue/produits/[slug]/variantes/page.tsx`), pas une
 * mutation — la matrice de décision de CLAUDE.md range ce cas en `data/`. Elle ne
 * porte donc pas `"use server"` : ce n'est pas une Server Action exposée au client.
 *
 * requireAdmin() re-vérifie le rôle en DB — jamais le cookie seul (stale ~5 min).
 */
export async function getProductVariants(
	params: GetProductVariantsParams,
): Promise<GetProductVariantsReturn> {
	const admin = await requireAdmin();

	if ("error" in admin) {
		forbidden();
	}

	const validation = getProductVariantsSchema.safeParse(params);

	if (!validation.success) {
		return EMPTY_PAGE;
	}

	// Le repli vit ICI, hors du scope `"use cache"` de `fetchProductVariants` : à
	// l'intérieur, une panne DB transitoire aurait mis la page vide en cache pour toute
	// la fenêtre du profil `user`, et l'admin aurait continué de voir « aucune
	// variante » après le rétablissement. Même pattern que `get-variant.ts`.
	try {
		return await fetchProductVariants(validation.data);
	} catch (error) {
		logger.error("Failed to fetch product VARIANTs", error, { service: "getProductVariants" });
		Sentry.captureException(error, {
			tags: { module: "variants", fetcher: "getProductVariants" },
		});
		return {
			...EMPTY_PAGE,
			// Message détaillé en dev seulement — ne jamais exposer un détail
			// d'infrastructure en production.
			error:
				process.env.NODE_ENV === "development"
					? error instanceof Error
						? error.message
						: "Unknown error"
					: "Failed to fetch product VARIANTs",
		};
	}
}

const EMPTY_PAGE: GetProductVariantsReturn = {
	productVariants: [],
	representativeVariantId: null,
	pagination: {
		nextCursor: null,
		prevCursor: null,
		hasNextPage: false,
		hasPreviousPage: false,
	},
};
