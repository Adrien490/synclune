import { Prisma, ProductStatus } from "@/app/generated/prisma/client";
import type { GetProductsParams, ProductFilters } from "../types/product.types";

import { FUZZY_MIN_LENGTH } from "../constants/search.constants";
import { fuzzySearchProductIds } from "./fuzzy-search";

// ============================================================================
// TYPES
// ============================================================================

export type SearchResult = {
	/** IDs de produits triés par pertinence (fuzzy search) */
	fuzzyIds: string[] | null;
	/** Conditions de recherche exacte (SKU, couleurs, etc.) */
	exactConditions: Prisma.ProductWhereInput[];
};

// ============================================================================
// PRODUCT SEARCH BUILDER
// ============================================================================

/**
 * Construit les conditions de recherche hybride (fuzzy + exact)
 *
 * - >= 3 caractères : fuzzy sur title/description + exact sur autres champs
 * - < 3 caractères : exact seulement sur tous les champs
 *
 * @param search - Terme de recherche
 * @param options - Options (status pour filtrer les produits)
 * @returns Résultat de recherche avec IDs fuzzy et conditions exactes
 */
export async function buildSearchConditions(
	search: string,
	options?: { status?: ProductStatus }
): Promise<SearchResult> {
	const term = search.trim();
	if (!term) return { fuzzyIds: null, exactConditions: [] };

	// Recherche courte (< 3 chars) : exact seulement sur tous les champs
	if (term.length < FUZZY_MIN_LENGTH) {
		return {
			fuzzyIds: null,
			exactConditions: buildFullExactSearchConditions(term),
		};
	}

	// Recherche fuzzy sur title/description
	const fuzzyIds = await fuzzySearchProductIds(term, {
		status: options?.status,
	});

	// Conditions exactes pour les autres champs (SKU, couleurs, etc.)
	const exactConditions = buildRelatedFieldsSearchConditions(term);

	return { fuzzyIds, exactConditions };
}

/**
 * Recherche exacte sur tous les champs (fallback pour termes courts)
 * Inclut title et description
 */
function buildFullExactSearchConditions(
	searchTerm: string
): Prisma.ProductWhereInput[] {
	if (!searchTerm) return [];

	return [
		{
			OR: [
				{
					title: {
						contains: searchTerm,
						mode: Prisma.QueryMode.insensitive,
					},
				},
				{
					description: {
						contains: searchTerm,
						mode: Prisma.QueryMode.insensitive,
					},
				},
				...buildRelatedFieldsSearchConditions(searchTerm)[0]?.OR ?? [],
			],
		},
	];
}

/**
 * Recherche exacte sur les champs liés (SKU, couleurs, matériaux, collections)
 * N'inclut PAS title/description (gérés par fuzzy search)
 */
function buildRelatedFieldsSearchConditions(
	searchTerm: string
): Prisma.ProductWhereInput[] {
	if (!searchTerm) return [];

	return [
		{
			OR: [
				{
					skus: {
						some: {
							OR: [
								{
									sku: {
										contains: searchTerm,
										mode: Prisma.QueryMode.insensitive,
									},
								},
								{
									color: {
										OR: [
											{
												name: {
													contains: searchTerm,
													mode: Prisma.QueryMode.insensitive,
												},
											},
											{
												hex: {
													contains: searchTerm,
													mode: Prisma.QueryMode.insensitive,
												},
											},
										],
									},
								},
								{
									material: {
										name: {
											contains: searchTerm,
											mode: Prisma.QueryMode.insensitive,
										},
									},
								},
							],
							isActive: true,
						},
					},
				},
				{
					collections: {
						some: {
							collection: {
								OR: [
									{
										name: {
											contains: searchTerm,
											mode: Prisma.QueryMode.insensitive,
										},
									},
									{
										slug: {
											contains: searchTerm,
											mode: Prisma.QueryMode.insensitive,
										},
									},
								],
							},
						},
					},
				},
			],
		},
	];
}

export function buildProductFilterConditions(
	filters: ProductFilters
): Prisma.ProductWhereInput[] {
	const conditions: Prisma.ProductWhereInput[] = [];
	if (!filters) return conditions;

	if (filters.status !== undefined) {
		const statuses = Array.isArray(filters.status)
			? filters.status
			: [filters.status];
		if (statuses.length === 1) {
			conditions.push({ status: statuses[0] });
		} else if (statuses.length > 1) {
			conditions.push({ status: { in: statuses } });
		}
	}

	if (filters.type !== undefined) {
		const types = Array.isArray(filters.type) ? filters.type : [filters.type];
		if (types.length === 1) {
			conditions.push({ type: { slug: types[0] } });
		} else if (types.length > 1) {
			conditions.push({ type: { slug: { in: types } } });
		}
	}

	if (filters.color !== undefined) {
		const colors = Array.isArray(filters.color)
			? filters.color
			: [filters.color];
		if (colors.length === 1) {
			conditions.push({
				skus: { some: { isActive: true, color: { slug: colors[0] } } },
			});
		} else if (colors.length > 1) {
			conditions.push({
				skus: { some: { isActive: true, color: { slug: { in: colors } } } },
			});
		}
	}

	if (filters.material !== undefined) {
		const materials = Array.isArray(filters.material)
			? filters.material
			: [filters.material];
		if (materials.length === 1) {
			conditions.push({
				skus: { some: { isActive: true, material: { slug: materials[0] } } },
			});
		} else if (materials.length > 1) {
			conditions.push({
				skus: { some: { isActive: true, material: { slug: { in: materials } } } },
			});
		}
	}

	if (filters.collectionId !== undefined) {
		const collectionIds = Array.isArray(filters.collectionId)
			? filters.collectionId
			: [filters.collectionId];
		if (collectionIds.length === 1) {
			conditions.push({
				collections: { some: { collectionId: collectionIds[0] } },
			});
		} else if (collectionIds.length > 1) {
			conditions.push({
				collections: { some: { collectionId: { in: collectionIds } } },
			});
		}
	}

	if (filters.collectionSlug !== undefined) {
		const collectionSlugs = Array.isArray(filters.collectionSlug)
			? filters.collectionSlug
			: [filters.collectionSlug];
		if (collectionSlugs.length === 1) {
			conditions.push({
				collections: { some: { collection: { slug: collectionSlugs[0] } } },
			});
		} else if (collectionSlugs.length > 1) {
			conditions.push({
				collections: { some: { collection: { slug: { in: collectionSlugs } } } },
			});
		}
	}

	if (
		typeof filters.priceMin === "number" &&
		typeof filters.priceMax === "number"
	) {
		conditions.push({
			skus: {
				some: {
					isActive: true,
					priceInclTax: { gte: filters.priceMin, lte: filters.priceMax },
				},
			},
		});
	} else {
		if (typeof filters.priceMin === "number") {
			conditions.push({
				skus: {
					some: { isActive: true, priceInclTax: { gte: filters.priceMin } },
				},
			});
		}
		if (typeof filters.priceMax === "number") {
			conditions.push({
				skus: {
					some: { isActive: true, priceInclTax: { lte: filters.priceMax } },
				},
			});
		}
	}

	if (filters.createdAfter instanceof Date) {
		conditions.push({ createdAt: { gte: filters.createdAfter } });
	}
	if (filters.createdBefore instanceof Date) {
		conditions.push({ createdAt: { lte: filters.createdBefore } });
	}
	if (filters.updatedAfter instanceof Date) {
		conditions.push({ updatedAt: { gte: filters.updatedAfter } });
	}
	if (filters.updatedBefore instanceof Date) {
		conditions.push({ updatedAt: { lte: filters.updatedBefore } });
	}

	// Stock status filter
	if (filters.stockStatus !== undefined) {
		if (filters.stockStatus === "out_of_stock") {
			// Produits en rupture : aucun SKU actif avec inventory > 0
			conditions.push({
				NOT: {
					skus: {
						some: {
							isActive: true,
							inventory: { gt: 0 },
						},
					},
				},
			});
		} else if (filters.stockStatus === "in_stock") {
			// Produits en stock : au moins un SKU actif avec inventory > 0
			conditions.push({
				skus: {
					some: {
						isActive: true,
						inventory: { gt: 0 },
					},
				},
			});
		}
	}

	return conditions;
}

/**
 * Construit la clause WHERE pour la requête de produits
 *
 * @param params - Paramètres de recherche (filtres, status, etc.)
 * @param searchResult - Résultat de la recherche (fuzzyIds + exactConditions)
 *                       Si fourni, utilise la recherche hybride
 *                       Si non fourni, pas de recherche appliquée
 */
export function buildProductWhereClause(
	params: GetProductsParams,
	searchResult?: SearchResult
): Prisma.ProductWhereInput {
	const whereClause: Prisma.ProductWhereInput = {};
	const andConditions: Prisma.ProductWhereInput[] = [];
	const filters = params.filters ?? {};

	// ⚠️ AUDIT FIX: Exclure les produits soft-deleted par défaut
	// Pour l'admin, utiliser includeDeleted: true dans les params
	if (!params.includeDeleted) {
		andConditions.push({ deletedAt: null });
	}

	// Si un statut est spécifié, filtrer par ce statut
	// Si undefined, ne pas filtrer (affiche tous les statuts - utilisé par l'admin)
	if (params.status) {
		andConditions.push({
			status: params.status,
		});
	}

	// Appliquer les conditions de recherche si fournies
	if (searchResult) {
		const { fuzzyIds, exactConditions } = searchResult;

		if (fuzzyIds !== null && fuzzyIds.length > 0) {
			// Recherche fuzzy active : combiner IDs fuzzy OU conditions exactes
			// Cela permet de trouver des produits via fuzzy (title/desc)
			// OU via match exact (SKU, couleurs, etc.)
			if (exactConditions.length > 0) {
				andConditions.push({
					OR: [{ id: { in: fuzzyIds } }, ...exactConditions],
				});
			} else {
				andConditions.push({ id: { in: fuzzyIds } });
			}
		} else if (exactConditions.length > 0) {
			// Pas de résultats fuzzy : utiliser uniquement les conditions exactes
			andConditions.push(...exactConditions);
		}
	}

	const filterConditions = buildProductFilterConditions(filters);
	if (filterConditions.length > 0) {
		andConditions.push(...filterConditions);
	}

	if (andConditions.length > 0) {
		whereClause.AND = andConditions;
	}

	return whereClause;
}
