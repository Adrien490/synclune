import { isAdmin } from "@/modules/admin-auth/lib/require-admin";
import { logger } from "@/shared/lib/logger";
import { prisma } from "@/shared/lib/prisma";

import {
	GET_PRODUCT_VARIANT_DETAIL_SELECT,
	GET_PRODUCT_VARIANT_SELECT,
} from "../constants/variant.constants";
import type { VariantDetail } from "../types/variant.types";
import { cacheVariantDetailById } from "../utils/cache.utils";

// Re-export pour compatibilité
export type { VariantDetail } from "../types/variant.types";

/**
 * Le REPRÉSENTANT d'un produit est sa première variante par id — le schéma lean
 * n'a plus de rang éditorial `position` sur la variante.
 *
 * ⚠️ L'information arrive avec le select (`product.variants`, `take: 1`) : les
 * deux lecteurs ci-dessous lançaient un `findFirst` SÉQUENTIEL supplémentaire
 * pour la calculer, soit deux allers-retours DB par affichage de fiche.
 */
function withRepresentative<
	TVariant extends { id: string; product: { variants: { id: string }[] } },
>(variant: TVariant): TVariant & { isRepresentative: boolean } {
	return { ...variant, isRepresentative: variant.product.variants[0]?.id === variant.id };
}

// ============================================================================
// GET VARIANT BY ID (pour édition)
// ============================================================================

/**
 * Récupère une variante par son ID — schéma lean (lot 2) : le média vit sur le
 * produit, la variante porte couleur/matériau en FK.
 * Protection : nécessite un compte ADMIN.
 */
export async function getVariantById(variantId: string): Promise<VariantDetail | null> {
	if (!variantId) return null;

	const admin = await isAdmin();
	if (!admin) return null;

	try {
		return await fetchVariantById(variantId);
	} catch (error) {
		logger.error("Failed to fetch variant by id", error, { service: "getVariantById" });
		return null;
	}
}

/**
 * Note: pas de try/catch ici — une erreur DB ne doit pas être mise en cache comme null.
 */
async function fetchVariantById(variantId: string): Promise<VariantDetail | null> {
	"use cache";
	cacheVariantDetailById(variantId);

	const variant = await prisma.productVariant.findUnique({
		where: { id: variantId },
		select: GET_PRODUCT_VARIANT_SELECT,
	});
	if (!variant) return null;

	return withRepresentative(variant);
}

// ============================================================================
// GET VARIANT DETAIL BY ID — page détail admin
// ============================================================================

export type VariantDetailReturn = NonNullable<Awaited<ReturnType<typeof fetchVariantDetailById>>>;

export async function getVariantDetailById(variantId: string) {
	if (!variantId) return null;

	const admin = await isAdmin();
	if (!admin) return null;

	try {
		return await fetchVariantDetailById(variantId);
	} catch (error) {
		logger.error("Failed to fetch variant detail by id", error, {
			service: "getVariantDetailById",
		});
		return null;
	}
}

async function fetchVariantDetailById(variantId: string) {
	"use cache";
	cacheVariantDetailById(variantId);

	const variant = await prisma.productVariant.findUnique({
		where: { id: variantId },
		select: GET_PRODUCT_VARIANT_DETAIL_SELECT,
	});
	if (!variant) return null;

	return withRepresentative(variant);
}
