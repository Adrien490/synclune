import { isAdmin } from "@/modules/admin-auth/lib/require-admin";
import { logger } from "@/shared/lib/logger";
import { prisma } from "@/shared/lib/prisma";

import { GET_PRODUCT_SKU_SELECT } from "../constants/sku.constants";
import type { SkuWithImages } from "../types/sku.types";
import { cacheSkuDetailById } from "../utils/cache.utils";

// Re-export pour compatibilité
export type { SkuWithImages } from "../types/sku.types";

// ============================================================================
// GET SKU BY ID (pour édition)
// ============================================================================

/**
 * Récupère un SKU par son ID avec ses images
 * Protection: Nécessite un compte ADMIN
 */
export async function getSkuById(skuId: string): Promise<SkuWithImages | null> {
	if (!skuId) return null;

	const admin = await isAdmin();
	if (!admin) return null;

	try {
		return await fetchSkuById(skuId);
	} catch (error) {
		logger.error("Failed to fetch sku by id", error, { service: "getSkuById" });
		return null;
	}
}

/**
 * Récupère le SKU avec ses images depuis la DB avec cache
 * Note: pas de try/catch ici — une erreur DB ne doit pas être mise en cache comme null.
 */
async function fetchSkuById(skuId: string): Promise<SkuWithImages | null> {
	"use cache";
	cacheSkuDetailById(skuId);

	const sku = await prisma.productSku.findUnique({
		// Parité avec le pattern `notDeleted` : une variante soft-deleted appartient à
		// un produit lui-même supprimé, il n'existe aucun écran légitime pour l'afficher.
		where: { id: skuId, deletedAt: null },
		select: {
			...GET_PRODUCT_SKU_SELECT,
			compareAtPrice: true,
			images: {
				select: {
					id: true,
					url: true,
					thumbnailUrl: true,
					blurDataUrl: true,
					altText: true,
					mediaType: true,
					width: true,
					height: true,
				},
				// Ordre canonique : le média principal est le premier élément
				// (la colonne `isPrimary` n'existe plus, audit schéma V5, lot A1).
				orderBy: [{ position: "asc" }, { id: "asc" }],
			},
		},
	});
	if (!sku) return null;

	// Le représentant du produit est le rang 0 de (position asc, id asc) parmi les
	// variantes non supprimées (remplace la colonne `isDefault`, audit schéma V5,
	// lot A2). Calculé ici pour que le formulaire d'édition puisse pré-cocher
	// « Variante par défaut » — le champ de formulaire, lui, survit.
	const rankZero = await prisma.productSku.findFirst({
		where: { productId: sku.productId, deletedAt: null },
		orderBy: [{ position: "asc" }, { id: "asc" }],
		select: { id: true },
	});

	return { ...sku, isRepresentative: rankZero?.id === sku.id };
}

// ============================================================================
// GET SKU DETAIL BY ID — page détail admin enrichie
// ============================================================================

export type SkuDetailReturn = NonNullable<Awaited<ReturnType<typeof fetchSkuDetailById>>>;

export async function getSkuDetailById(skuId: string) {
	if (!skuId) return null;

	const admin = await isAdmin();
	if (!admin) return null;

	try {
		return await fetchSkuDetailById(skuId);
	} catch (error) {
		logger.error("Failed to fetch sku detail by id", error, { service: "getSkuDetailById" });
		return null;
	}
}

async function fetchSkuDetailById(skuId: string) {
	"use cache";
	cacheSkuDetailById(skuId);

	const sku = await prisma.productSku.findUnique({
		// Idem `fetchSkuById` : pas d'écran pour une variante soft-deleted.
		where: { id: skuId, deletedAt: null },
		select: {
			id: true,
			sku: true,
			productId: true,
			priceInclTax: true,
			compareAtPrice: true,
			inventory: true,
			isActive: true,
			size: true,
			createdAt: true,
			updatedAt: true,
			colors: {
				select: {
					colorId: true,
					position: true,
					color: { select: { id: true, name: true, hex: true, slug: true } },
				},
				orderBy: { position: "asc" },
			},
			materials: {
				select: {
					materialId: true,
					position: true,
					material: { select: { id: true, name: true, slug: true } },
				},
				orderBy: { position: "asc" },
			},
			images: {
				select: {
					id: true,
					url: true,
					thumbnailUrl: true,
					blurDataUrl: true,
					altText: true,
					mediaType: true,
					width: true,
					height: true,
				},
				// Ordre canonique : le média principal est le premier élément
				// (la colonne `isPrimary` n'existe plus, audit schéma V5, lot A1).
				orderBy: [{ position: "asc" }, { id: "asc" }],
			},
			_count: { select: { orderItems: true } },
			product: {
				select: {
					id: true,
					slug: true,
					title: true,
					status: true,
					_count: { select: { skus: { where: { deletedAt: null } } } },
					// Vignette unique : l'appelant prend `product.skus[0]?.images[0]` sans
					// pouvoir trier, donc le tri se fait ici.
					//
					// On ordonne au lieu de filtrer (motif banni par CLAUDE.md : un filtre
					// rend 0 image alors que le SKU en a). L'ordre canonique
					// (position asc, id asc) remonte le représentant actif en premier —
					// remplace `isDefault desc` / `isPrimary desc` (audit schéma V5).
					// Et `mediaType: "IMAGE"` est obligatoire ici : sans lui un `.mp4`
					// atterrit dans `<Image src>` (vignette cassée + transformation
					// `/_next/image` facturée). Même pattern que get-material.ts.
					skus: {
						where: { isActive: true, deletedAt: null },
						orderBy: [{ position: "asc" as const }, { id: "asc" as const }],
						take: 1,
						select: {
							images: {
								where: { mediaType: "IMAGE" as const },
								orderBy: [{ position: "asc" as const }, { id: "asc" as const }],
								take: 1,
								select: { url: true, blurDataUrl: true, altText: true },
							},
						},
					},
				},
			},
		},
	});
	if (!sku) return null;

	// Représentant = rang 0 de (position asc, id asc) parmi les variantes non
	// supprimées du produit (remplace `isDefault`, audit schéma V5, lot A2).
	// Même pattern que la garde de désactivation d'update-sku-status.
	const rankZero = await prisma.productSku.findFirst({
		where: { productId: sku.productId, deletedAt: null },
		orderBy: [{ position: "asc" }, { id: "asc" }],
		select: { id: true },
	});

	return { ...sku, isRepresentative: rankZero?.id === sku.id };
}
