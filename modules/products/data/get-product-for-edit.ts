import { logger } from "@/shared/lib/logger";
import { isAdmin } from "@/modules/auth/utils/guards";
import { prisma } from "@/shared/lib/prisma";

import { GET_PRODUCT_FOR_EDIT_SELECT } from "../constants/product.constants";
import { getProductSchema } from "../schemas/product.schemas";
import type { GetProductParams, GetProductReturn } from "../types/product.types";
import { cacheProductDetail } from "../utils/cache.utils";

/**
 * Variante admin de `getProductBySlug` pour le FORMULAIRE D'ÉDITION : charge
 * aussi les SKUs inactifs (l'archivage les désactive tous — avec le select
 * public le formulaire d'un produit archivé était vide et non-enregistrable).
 *
 * Tous statuts confondus (éditer un DRAFT/ARCHIVED est le cas nominal) : la
 * garde appartient donc à cette couche, pas au seul appelant. `isAdmin()` est
 * lu ICI, dans le wrapper, jamais dans le scope caché — `headers()` y est
 * interdit (même pattern que `getProductForDuplication`).
 */
export async function getProductForEdit(
	params: Partial<GetProductParams>,
): Promise<GetProductReturn | null> {
	if (!(await isAdmin())) {
		return null;
	}

	const validation = getProductSchema.safeParse(params);
	if (!validation.success) {
		return null;
	}

	return fetchProductForEdit(validation.data);
}

async function fetchProductForEdit(params: GetProductParams): Promise<GetProductReturn | null> {
	"use cache";
	cacheProductDetail(params.slug);

	try {
		const product = await prisma.product.findUnique({
			where: { slug: params.slug },
			select: { ...GET_PRODUCT_FOR_EDIT_SELECT, deletedAt: true },
		});

		if (!product || product.deletedAt) {
			return null;
		}

		return product;
	} catch (error) {
		// Fetcher de DÉTAIL : le repli `null` produit un 404 — un signal, pas un
		// mensonge (doctrine no-degraded-value-cached, allowlist positive).
		logger.error("Failed to fetch product for edit", error, { service: "fetchProductForEdit" });
		return null;
	}
}
