import { auth } from "@/modules/auth/lib/auth";
import { prisma } from "@/shared/lib/prisma";
import { cacheLife, cacheTag } from "next/cache";
import { headers } from "next/headers";

import {
	RELATED_PRODUCTS_DEFAULT_LIMIT,
	RELATED_PRODUCTS_STRATEGY,
} from "../constants/related-products.constants";
import { GET_PRODUCTS_SELECT } from "../constants/product.constants";
import type { Product } from "../types/product.types";

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Récupère des produits similaires intelligents selon le contexte
 *
 * - Si currentProductSlug fourni : algorithme contextuel intelligent
 * - Si utilisateur connecté (sans slug) : produits basés sur historique
 * - Si visiteur (sans slug) : nouveautés publiques
 */
export async function getRelatedProducts(options?: {
	currentProductSlug?: string;
	limit?: number;
}): Promise<Product[]> {
	const limit = options?.limit ?? RELATED_PRODUCTS_DEFAULT_LIMIT;
	const currentProductSlug = options?.currentProductSlug;

	if (currentProductSlug) {
		return fetchContextualRelatedProducts(currentProductSlug, limit);
	}

	const session = await auth.api.getSession({
		headers: await headers(),
	});

	const userId = session?.user?.id;

	if (userId) {
		return fetchPersonalizedRelatedProducts(userId, limit);
	} else {
		return fetchPublicRelatedProducts(limit);
	}
}

/**
 * Produits similaires publics pour visiteurs non authentifiés
 */
async function fetchPublicRelatedProducts(
	limit: number
): Promise<Product[]> {
	"use cache";
	cacheLife("collections");
	cacheTag("related-products-public");

	try {
		return await prisma.product.findMany({
			where: {
				status: "PUBLIC",
				skus: {
					some: {
						isActive: true,
						inventory: { gt: 0 },
					},
				},
			},
			select: GET_PRODUCTS_SELECT,
			orderBy: {
				createdAt: "desc",
			},
			take: limit,
		});
	} catch {
		return [];
	}
}

/**
 * Produits similaires personnalisés basés sur l'historique utilisateur
 */
async function fetchPersonalizedRelatedProducts(
	userId: string,
	limit: number
): Promise<Product[]> {
	"use cache: private";
	cacheLife("relatedProducts");
	cacheTag(`related-products-user-${userId}`);

	try {
		const orderHistory = await prisma.orderItem.findMany({
			where: {
				order: {
					userId,
					paymentStatus: "PAID",
				},
			},
			select: {
				product: {
					select: {
						typeId: true,
						collections: {
							select: { collectionId: true },
						},
					},
				},
			},
			distinct: ["productId"],
			take: 10,
		});

		const typeIds = orderHistory
			.map((item) => item.product?.typeId)
			.filter((id): id is string => id !== null);
		const collectionIds = orderHistory
			.flatMap((item) => item.product?.collections?.map((c) => c.collectionId) || [])
			.filter((id): id is string => id !== null);

		if (typeIds.length > 0 || collectionIds.length > 0) {
			const relatedProducts = await prisma.product.findMany({
				where: {
					status: "PUBLIC",
					skus: {
						some: {
							isActive: true,
							inventory: { gt: 0 },
						},
					},
					OR: [
						...(typeIds.length > 0 ? [{ typeId: { in: typeIds } }] : []),
						...(collectionIds.length > 0
							? [{ collections: { some: { collectionId: { in: collectionIds } } } }]
							: []),
					],
				},
				select: GET_PRODUCTS_SELECT,
				orderBy: {
					createdAt: "desc",
				},
				take: limit,
			});

			if (relatedProducts.length > 0) {
				return relatedProducts;
			}
		}

		return await prisma.product.findMany({
			where: {
				status: "PUBLIC",
				skus: {
					some: {
						isActive: true,
						inventory: { gt: 0 },
					},
				},
			},
			select: GET_PRODUCTS_SELECT,
			orderBy: {
				createdAt: "desc",
			},
			take: limit,
		});
	} catch {
		return [];
	}
}

/**
 * Produits similaires contextuels basés sur le produit actuel
 * Algorithme intelligent combinant plusieurs stratégies
 */
async function fetchContextualRelatedProducts(
	currentProductSlug: string,
	limit: number
): Promise<Product[]> {
	"use cache";
	cacheLife("relatedProducts");
	cacheTag(`related-products-contextual-${currentProductSlug}`);

	try {
		const currentProduct = await prisma.product.findUnique({
			where: { slug: currentProductSlug },
			select: {
				id: true,
				typeId: true,
				collections: {
					select: { collectionId: true },
				},
				skus: {
					where: { isActive: true },
					select: {
						colorId: true,
					},
				},
			},
		});

		if (!currentProduct) {
			return fetchPublicRelatedProducts(limit);
		}

		const currentColorIds = currentProduct.skus
			.map((sku) => sku.colorId)
			.filter((id): id is string => id !== null);

		const relatedProducts: Product[] = [];
		const addedProductIds = new Set<string>();

		const addProducts = (products: Product[], maxCount: number) => {
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
			skus: {
				some: {
					isActive: true,
					inventory: { gt: 0 },
				},
			},
		};

		const currentCollectionIds = currentProduct.collections.map((c) => c.collectionId);

		// Lancer toutes les requêtes en parallèle pour optimiser les performances
		const [
			sameCollectionProducts,
			sameTypeProducts,
			similarColorProducts,
			bestSellers,
		] = await Promise.all([
			// STRATÉGIE 1 : Même collection(s)
			currentCollectionIds.length > 0
				? prisma.product.findMany({
						where: {
							...baseWhere,
							collections: {
								some: { collectionId: { in: currentCollectionIds } },
							},
						},
						select: GET_PRODUCTS_SELECT,
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
								? { NOT: { collections: { some: { collectionId: { in: currentCollectionIds } } } } }
								: {}),
						},
						select: GET_PRODUCTS_SELECT,
						orderBy: { createdAt: "desc" },
						take: RELATED_PRODUCTS_STRATEGY.SAME_TYPE,
					})
				: Promise.resolve([]),

			// STRATÉGIE 3 : Couleurs similaires
			currentColorIds.length > 0
				? prisma.product.findMany({
						where: {
							...baseWhere,
							skus: {
								some: {
									isActive: true,
									inventory: { gt: 0 },
									colorId: { in: currentColorIds },
								},
							},
							typeId: currentProduct.typeId
								? { not: currentProduct.typeId }
								: undefined,
						},
						select: GET_PRODUCTS_SELECT,
						orderBy: { createdAt: "desc" },
						take: RELATED_PRODUCTS_STRATEGY.SIMILAR_COLORS,
					})
				: Promise.resolve([]),

			// STRATÉGIE 4 : Best-sellers pour compléter
			prisma.product.findMany({
				where: baseWhere,
				select: GET_PRODUCTS_SELECT,
				orderBy: { createdAt: "desc" },
				take: limit + 5,
			}),
		]);

		// Combiner les résultats par priorité
		addProducts(sameCollectionProducts, RELATED_PRODUCTS_STRATEGY.SAME_COLLECTION);
		addProducts(sameTypeProducts, RELATED_PRODUCTS_STRATEGY.SAME_TYPE);
		addProducts(similarColorProducts, RELATED_PRODUCTS_STRATEGY.SIMILAR_COLORS);
		addProducts(bestSellers, limit - relatedProducts.length);

		return relatedProducts;
	} catch {
		return fetchPublicRelatedProducts(limit);
	}
}
