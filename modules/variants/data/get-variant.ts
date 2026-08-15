import { isAdmin } from "@/modules/admin-auth/lib/require-admin";
import { logger } from "@/shared/lib/logger";
import { prisma } from "@/shared/lib/prisma";

import { GET_PRODUCT_VARIANT_SELECT } from "../constants/variant.constants";
import type { VariantDetail } from "../types/variant.types";
import { cacheVariantDetailById } from "../utils/cache.utils";

// Re-export pour compatibilité
export type { VariantDetail } from "../types/variant.types";

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

	// Le représentant du produit = première variante par id (plus de rang
	// éditorial `position` dans le schéma lean).
	const first = await prisma.productVariant.findFirst({
		where: { productId: variant.productId },
		orderBy: { id: "asc" },
		select: { id: true },
	});

	return { ...variant, isRepresentative: first?.id === variant.id };
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
		select: {
			id: true,
			productId: true,
			priceCents: true,
			stock: true,
			active: true,
			size: true,
			color: { select: { id: true, name: true, hex: true } },
			material: { select: { id: true, name: true } },
			product: {
				select: {
					id: true,
					slug: true,
					name: true,
					active: true,
					priceCents: true,
					media: {
						where: { type: "IMAGE" },
						orderBy: [{ position: "asc" }, { id: "asc" }],
						take: 1,
						select: { id: true, url: true, alt: true, type: true },
					},
					_count: { select: { variants: true } },
				},
			},
			_count: { select: { orderItems: true } },
		},
	});
	if (!variant) return null;

	const first = await prisma.productVariant.findFirst({
		where: { productId: variant.productId },
		orderBy: { id: "asc" },
		select: { id: true },
	});

	return { ...variant, isRepresentative: first?.id === variant.id };
}
