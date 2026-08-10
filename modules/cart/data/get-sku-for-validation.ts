import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { PRODUCTS_CACHE_TAGS } from "@/modules/products/constants/cache";
import { prisma } from "@/shared/lib/prisma";

// ============================================================================
// SINGLE SKU QUERY
// ============================================================================

/**
 * Fetches a SKU with all relations needed for validation (stock check, soft-delete check)
 *
 * Cached with `checkout` profile (60s stale / 30s revalidate / 5min expire).
 * Tags: SKU_STOCK (invalidated on inventory mutations) + SKU_DETAIL_BY_ID
 * (invalidated on price/status/soft-delete changes).
 *
 * ⚠️ L'`inventory` renvoyé ici peut être périmé (jusqu'à 5 min). Il sert à
 * l'AFFICHAGE et aux gardes de courtoisie (échouer tôt côté panier / checkout),
 * jamais à décider d'une vente : le stock n'est réellement arbitré que sous verrou
 * de ligne — `SELECT … FOR UPDATE` dans `order-creation.service.ts:153-182`, puis
 * le décrément du webhook (`checkout-order-processing.service.ts:306-379`), seul
 * point qui écrit l'inventaire sur le chemin client.
 *
 * Ne pas relire cette note comme « l'oversell est impossible » : le `FOR UPDATE` de
 * la création de commande ne décrémente rien, donc deux checkouts concurrents sur
 * le dernier exemplaire passent tous les deux. Le perdant est arrêté au webhook
 * (`OversellError` → auto-refund, ORD-STRIPE-009) — réservation optimiste assumée.
 */
export async function fetchSkuForValidation(skuId: string) {
	"use cache";
	cacheLife("checkout");
	cacheTag(PRODUCTS_CACHE_TAGS.SKU_STOCK(skuId), PRODUCTS_CACHE_TAGS.SKU_DETAIL_BY_ID(skuId));

	return prisma.productSku.findUnique({
		where: { id: skuId },
		select: {
			id: true,
			sku: true,
			priceInclTax: true,
			compareAtPrice: true,
			inventory: true,
			isActive: true,
			size: true,
			deletedAt: true,
			product: {
				select: {
					id: true,
					title: true,
					slug: true,
					status: true,
					description: true,
					deletedAt: true,
				},
			},
			// EINV-SNAPSHOT-MEDIA-001 : `mediaType` est OBLIGATOIRE ici. Ce select
			// alimente le snapshot figé `OrderItem.productImageUrl`
			// (`order-creation.service.ts`) — immuable, rétention 10 ans, rendu dans
			// l'historique client ET dans le PDF de facture. Sans `mediaType`,
			// l'appelant ne pouvait pas écarter une vidéo : un `.mp4` se figeait dans
			// la facture, et `getValidImageUrl` ne valide que HTTPS + domaine, pas
			// l'extension. C'était le seul select de sélection d'image du repo à ne
			// même pas exposer le champ.
			// `orderBy` reproduit l'ordre canonique consommé par `pickPrimaryImage`
			// (première IMAGE de `(position asc, id asc)` — V5, plus d'`isPrimary`) :
			// `createdAt: asc` seul rendait l'ordre d'upload, pas l'ordre d'affichage.
			images: {
				orderBy: [{ position: "asc" as const }, { id: "asc" as const }],
				select: {
					url: true,
					altText: true,
					mediaType: true,
				},
			},
			colors: {
				select: {
					colorId: true,
					position: true,
					color: {
						select: {
							id: true,
							name: true,
							hex: true,
						},
					},
				},
				orderBy: { position: "asc" },
			},
			materials: {
				select: {
					materialId: true,
					position: true,
					material: {
						select: {
							id: true,
							name: true,
						},
					},
				},
				orderBy: { position: "asc" },
			},
		},
	});
}

// ============================================================================
// BATCH SKU QUERY
// ============================================================================

/**
 * Fetches multiple SKUs in a single query for batch validation (merge carts, cart validation)
 *
 * Cached with `checkout` profile. Tags each SKU with SKU_STOCK so any inventory
 * mutation on any SKU in the batch invalidates this cache entry.
 */
export async function fetchSkusForBatchValidation(skuIds: string[]) {
	"use cache";
	cacheLife("checkout");
	for (const skuId of skuIds) {
		cacheTag(PRODUCTS_CACHE_TAGS.SKU_STOCK(skuId), PRODUCTS_CACHE_TAGS.SKU_DETAIL_BY_ID(skuId));
	}

	return prisma.productSku.findMany({
		where: { id: { in: skuIds } },
		select: {
			id: true,
			inventory: true,
			isActive: true,
			deletedAt: true,
			product: {
				select: {
					status: true,
					deletedAt: true,
				},
			},
		},
	});
}
