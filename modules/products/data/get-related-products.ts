import { logger } from "@/shared/lib/logger";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { cacheLife, cacheTag } from "next/cache";

import {
	RELATED_PRODUCTS_DEFAULT_LIMIT,
	RELATED_PRODUCTS_STRATEGY,
} from "../constants/related-products.constants";
import { PRODUCT_CAROUSEL_SELECT } from "../constants/product.constants";
import { PRODUCTS_CACHE_TAGS } from "../constants/cache";
import type { ProductCarouselItem } from "../types/product.types";

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Récupère des produits similaires intelligents selon le contexte
 *
 * - Si currentProductSlug fourni : algorithme contextuel intelligent
 * - Sinon : nouveautés publiques
 *
 * La branche « historique d'achat de l'utilisateur connecté » a été RETIRÉE avec
 * `Order.userId` (audit schéma V1, 2026-08-05) : le parcours d'achat est 100 %
 * invité, donc aucune commande n'est rattachée à un compte et la seule session
 * possible est celle de l'administratrice. La requête `orderItem` qui filtrait
 * `order.userId` a survécu au drop de la colonne et levait une
 * `PrismaClientValidationError` à chaque rendu du carrousel — invisible à `tsc`,
 * qui n'applique pas l'excess property check sur un filtre de relation Prisma.
 * Réouverture : le retour d'un compte client (cf. la condition posée par la
 * migration `20260805120000_v1_audit_radical`).
 */
export async function getRelatedProducts(options?: {
	currentProductSlug?: string;
	limit?: number;
}): Promise<ProductCarouselItem[]> {
	const limit = options?.limit ?? RELATED_PRODUCTS_DEFAULT_LIMIT;
	const currentProductSlug = options?.currentProductSlug;

	if (currentProductSlug) {
		return fetchContextualRelatedProducts(currentProductSlug, limit);
	}

	return fetchPublicRelatedProducts(limit);
}

/**
 * Produits similaires publics pour visiteurs non authentifiés
 */
async function fetchPublicRelatedProducts(limit: number): Promise<ProductCarouselItem[]> {
	"use cache";
	cacheLife("catalog");
	cacheTag(PRODUCTS_CACHE_TAGS.RELATED_PUBLIC);

	try {
		const products = await prisma.product.findMany({
			where: {
				status: "PUBLIC",
				...notDeleted,
				skus: {
					some: {
						isActive: true,
						inventory: { gt: 0 },
					},
				},
			},
			select: PRODUCT_CAROUSEL_SELECT,
			orderBy: {
				createdAt: "desc",
			},
			take: limit,
		});
		return products;
	} catch (error) {
		logger.error("Failed to fetch public related products", error, {
			service: "fetchPublicRelatedProducts",
		});
		return [];
	}
}

/**
 * Produits similaires contextuels basés sur le produit actuel
 * Algorithme intelligent combinant plusieurs stratégies
 */
async function fetchContextualRelatedProducts(
	currentProductSlug: string,
	limit: number,
): Promise<ProductCarouselItem[]> {
	"use cache";
	cacheLife("catalog");
	cacheTag(PRODUCTS_CACHE_TAGS.RELATED_CONTEXTUAL(currentProductSlug));

	try {
		// deletedAt: null — sans ce filtre, un slug supprimé alimentait quand même la
		// stratégie contextuelle (type + collections + couleurs d'un produit invisible) au
		// lieu de retomber sur `fetchPublicRelatedProducts`. Peu atteignable en pratique
		// (la fiche 404 avant), mais la cohérence avec les 4 requêtes en aval — qui
		// filtrent toutes `status: PUBLIC` + `deletedAt: null` — vaut mieux que l'exception.
		const currentProduct = await prisma.product.findUnique({
			where: { slug: currentProductSlug, deletedAt: null },
			select: {
				id: true,
				typeId: true,
				collections: {
					select: { collectionId: true },
				},
				skus: {
					where: { isActive: true },
					select: {
						colors: { select: { colorId: true } },
					},
				},
			},
		});

		if (!currentProduct) {
			return fetchPublicRelatedProducts(limit);
		}

		// M2M : on aplatit les colorIds de TOUS les SKUs actifs (déduplication via Set).
		const currentColorIds = Array.from(
			new Set(currentProduct.skus.flatMap((sku) => sku.colors.map((c) => c.colorId))),
		);

		const relatedProducts: ProductCarouselItem[] = [];
		const addedProductIds = new Set<string>();

		const addProducts = (products: ProductCarouselItem[], maxCount: number) => {
			let added = 0;
			for (const product of products) {
				if (added >= maxCount || relatedProducts.length >= limit) {
					break;
				}
				if (!addedProductIds.has(product.id)) {
					relatedProducts.push(product);
					addedProductIds.add(product.id);
					added++;
				}
			}
		};

		const baseWhere = {
			id: { not: currentProduct.id },
			status: "PUBLIC" as const,
			...notDeleted,
			skus: {
				some: {
					isActive: true,
					inventory: { gt: 0 },
				},
			},
		};

		const currentCollectionIds = currentProduct.collections.map((c) => c.collectionId);

		// Lancer toutes les requêtes en parallèle pour optimiser les performances
		const [sameCollectionProducts, sameTypeProducts, similarColorProducts, newestProducts] =
			await Promise.all([
				// STRATÉGIE 1 : Même collection(s)
				currentCollectionIds.length > 0
					? prisma.product.findMany({
							where: {
								...baseWhere,
								collections: {
									some: { collectionId: { in: currentCollectionIds } },
								},
							},
							select: PRODUCT_CAROUSEL_SELECT,
							orderBy: { createdAt: "desc" },
							take: RELATED_PRODUCTS_STRATEGY.SAME_COLLECTION,
						})
					: Promise.resolve([]),

				// STRATÉGIE 2 : Même type
				currentProduct.typeId
					? prisma.product.findMany({
							where: {
								...baseWhere,
								typeId: currentProduct.typeId,
								...(currentCollectionIds.length > 0
									? {
											NOT: {
												collections: { some: { collectionId: { in: currentCollectionIds } } },
											},
										}
									: {}),
							},
							select: PRODUCT_CAROUSEL_SELECT,
							orderBy: { createdAt: "desc" },
							take: RELATED_PRODUCTS_STRATEGY.SAME_TYPE,
						})
					: Promise.resolve([]),

				// STRATÉGIE 3 : Couleurs similaires (M2M tolérant via ProductSkuColor)
				currentColorIds.length > 0
					? prisma.product.findMany({
							where: {
								...baseWhere,
								skus: {
									some: {
										isActive: true,
										inventory: { gt: 0 },
										colors: { some: { colorId: { in: currentColorIds } } },
									},
								},
								typeId: currentProduct.typeId ? { not: currentProduct.typeId } : undefined,
							},
							select: PRODUCT_CAROUSEL_SELECT,
							orderBy: { createdAt: "desc" },
							take: RELATED_PRODUCTS_STRATEGY.SIMILAR_COLORS,
						})
					: Promise.resolve([]),

				// STRATÉGIE 4 : Newest products to fill remaining slots
				prisma.product.findMany({
					where: baseWhere,
					select: PRODUCT_CAROUSEL_SELECT,
					orderBy: { createdAt: "desc" },
					take: limit + 5,
				}),
			]);

		// Combiner les résultats par priorité
		addProducts(sameCollectionProducts, RELATED_PRODUCTS_STRATEGY.SAME_COLLECTION);
		addProducts(sameTypeProducts, RELATED_PRODUCTS_STRATEGY.SAME_TYPE);
		addProducts(similarColorProducts, RELATED_PRODUCTS_STRATEGY.SIMILAR_COLORS);
		addProducts(newestProducts, limit - relatedProducts.length);

		return relatedProducts;
	} catch (error) {
		logger.error("Failed to fetch contextual related products", error, {
			service: "fetchContextualRelatedProducts",
		});
		return fetchPublicRelatedProducts(limit);
	}
}
