import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { PRODUCTS_CACHE_TAGS } from "@/modules/products/constants/cache";
import { prisma } from "@/shared/lib/prisma";

// ============================================================================
// SINGLE VARIANT QUERY — schéma lean (lot 2) : média sur le produit, FK
// couleur/matériau, prix = variant.priceCents ?? product.priceCents.
// ============================================================================

/**
 * Fetches a variant with all relations needed for validation.
 *
 * Cached with `checkout` profile. Tags: VARIANT_STOCK + VARIANT_DETAIL_BY_ID.
 *
 * ⚠️ Le `stock` renvoyé ici peut être périmé (jusqu'à 5 min) : il sert à
 * l'AFFICHAGE et aux gardes de courtoisie, jamais à décider d'une vente —
 * l'arbitrage réel du stock arrive au lot 3 (décrément atomique à la création
 * de session Checkout).
 */
export async function fetchVariantForValidation(variantId: string) {
	"use cache";
	cacheLife("checkout");
	cacheTag(
		PRODUCTS_CACHE_TAGS.VARIANT_STOCK(variantId),
		PRODUCTS_CACHE_TAGS.VARIANT_DETAIL_BY_ID(variantId),
	);

	return prisma.productVariant.findUnique({
		where: { id: variantId },
		select: {
			id: true,
			priceCents: true,
			stock: true,
			active: true,
			size: true,
			color: { select: { id: true, name: true, hex: true } },
			material: { select: { id: true, name: true } },
			product: {
				select: {
					id: true,
					name: true,
					slug: true,
					active: true,
					description: true,
					priceCents: true,
					// Le tableau arrive pré-trié (position asc, id asc) : la première
					// IMAGE est la principale (cf. pickPrimaryImage — le `type` permet
					// d'écarter une vidéo).
					media: {
						orderBy: [{ position: "asc" as const }, { id: "asc" as const }],
						select: { url: true, alt: true, type: true },
					},
				},
			},
		},
	});
}

// ============================================================================
// BATCH VARIANT QUERY
// ============================================================================

/**
 * Fetches multiple variants in a single query for batch validation.
 * Cached with `checkout` profile, tagged per-variant.
 */
export async function fetchVariantsForBatchValidation(variantIds: string[]) {
	"use cache";
	cacheLife("checkout");
	for (const variantId of variantIds) {
		cacheTag(
			PRODUCTS_CACHE_TAGS.VARIANT_STOCK(variantId),
			PRODUCTS_CACHE_TAGS.VARIANT_DETAIL_BY_ID(variantId),
		);
	}

	return prisma.productVariant.findMany({
		where: { id: { in: variantIds } },
		select: {
			id: true,
			stock: true,
			active: true,
			priceCents: true,
			product: {
				select: { active: true, priceCents: true },
			},
		},
	});
}
