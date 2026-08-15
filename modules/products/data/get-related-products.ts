import { logger } from "@/shared/lib/logger";
import { prisma } from "@/shared/lib/prisma";
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
				active: true,
				variants: {
					some: {
						active: true,
						stock: { gt: 0 },
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
		const currentProduct = await prisma.product.findUnique({
			where: { slug: currentProductSlug },
			select: {
				id: true,
				collections: { select: { id: true } },
				variants: {
					where: { active: true },
					select: { colorId: true },
				},
			},
		});

		if (!currentProduct) {
			return fetchPublicRelatedProducts(limit);
		}

		// FK simples : colorIds des variantes actives (déduplication via Set).
		const currentColorIds = Array.from(
			new Set(currentProduct.variants.flatMap((v) => (v.colorId ? [v.colorId] : []))),
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
			active: true,
			variants: {
				some: {
					active: true,
					stock: { gt: 0 },
				},
			},
		};

		const currentCollectionIds = currentProduct.collections.map((c) => c.id);

		// Lancer toutes les requêtes en parallèle pour optimiser les performances
		const [sameCollectionProducts, similarColorProducts, newestProducts] = await Promise.all([
			// STRATÉGIE 1 : Même collection(s) — M-N implicite
			currentCollectionIds.length > 0
				? prisma.product.findMany({
						where: {
							...baseWhere,
							collections: { some: { id: { in: currentCollectionIds } } },
						},
						select: PRODUCT_CAROUSEL_SELECT,
						orderBy: { createdAt: "desc" },
						take: RELATED_PRODUCTS_STRATEGY.SAME_COLLECTION,
					})
				: Promise.resolve([]),

			// STRATÉGIE 2 : Couleurs similaires (FK simple — ProductType a disparu,
			// la stratégie « même type » est partie avec lui au lot 2)
			currentColorIds.length > 0
				? prisma.product.findMany({
						where: {
							...baseWhere,
							variants: {
								some: {
									active: true,
									stock: { gt: 0 },
									colorId: { in: currentColorIds },
								},
							},
						},
						select: PRODUCT_CAROUSEL_SELECT,
						orderBy: { createdAt: "desc" },
						take: RELATED_PRODUCTS_STRATEGY.SIMILAR_COLORS,
					})
				: Promise.resolve([]),

			// STRATÉGIE 3 : Newest products to fill remaining slots
			prisma.product.findMany({
				where: baseWhere,
				select: PRODUCT_CAROUSEL_SELECT,
				orderBy: { createdAt: "desc" },
				take: limit + 5,
			}),
		]);

		// Combiner les résultats par priorité
		addProducts(sameCollectionProducts, RELATED_PRODUCTS_STRATEGY.SAME_COLLECTION);
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
