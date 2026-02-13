import { Prisma, ProductStatus } from "@/app/generated/prisma/client";
import { notDeleted } from "@/shared/lib/prisma";
import type { GetProductsParams, ProductFilters } from "../types/product.types";
import type { SearchResult } from "../types/product-services.types";

import { FUZZY_MIN_LENGTH } from "../constants/search.constants";
import { fuzzySearchProductIds } from "../data/fuzzy-search";
import { splitSearchTerms } from "../utils/search-helpers";

export type { SearchResult } from "../types/product-services.types";

// ============================================================================
// PRODUCT SEARCH BUILDER
// ============================================================================

/**
 * Construit les conditions de recherche hybride (fuzzy + exact)
 *
 * - >= 3 caracteres : fuzzy sur title/description + exact sur autres champs
 * - < 3 caracteres : exact seulement sur tous les champs
 *
 * Multi-word queries use AND logic: each word must match independently.
 *
 * Note: Le rate limiting doit etre gere au niveau data/ (get-products.ts)
 *
 * @param search - Terme de recherche
 * @param options - Options (status pour filtrer les produits)
 * @returns Resultat de recherche avec IDs fuzzy et conditions exactes
 */
export async function buildSearchConditions(
	search: string,
	options?: { status?: ProductStatus }
): Promise<SearchResult> {
	const term = search.trim();
	if (!term) return { fuzzyIds: null, exactConditions: [] };

	const words = splitSearchTerms(term);
	if (words.length === 0) return { fuzzyIds: null, exactConditions: [] };

	// Recherche courte (< 3 chars) : exact seulement sur tous les champs
	if (term.length < FUZZY_MIN_LENGTH) {
		return {
			fuzzyIds: null,
			exactConditions: buildFullExactSearchConditions(words),
		};
	}

	// Recherche fuzzy sur title/description
	const { ids: fuzzyIds } = await fuzzySearchProductIds(term, {
		status: options?.status,
	});

	// Conditions exactes pour les autres champs (SKU, couleurs, etc.)
	const exactConditions = buildRelatedFieldsSearchConditions(words);

	return { fuzzyIds, exactConditions };
}

/**
 * Version exacte seulement (fallback si rate limit depasse)
 * Exportee pour etre utilisee par le data layer
 */
export function buildExactSearchConditions(search: string): SearchResult {
	const term = search.trim();
	if (!term) return { fuzzyIds: null, exactConditions: [] };

	const words = splitSearchTerms(term);
	if (words.length === 0) return { fuzzyIds: null, exactConditions: [] };

	return {
		fuzzyIds: null,
		exactConditions: buildFullExactSearchConditions(words),
	};
}

/**
 * Build OR conditions for a single word across all fields (title, description, related)
 */
function buildPerWordOrConditions(
	word: string
): Prisma.ProductWhereInput {
	return {
		OR: [
			{
				title: {
					contains: word,
					mode: Prisma.QueryMode.insensitive,
				},
			},
			{
				description: {
					contains: word,
					mode: Prisma.QueryMode.insensitive,
				},
			},
			...buildPerWordRelatedConditions(word),
		],
	};
}

/**
 * Build OR conditions for a single word across related fields only
 * (SKU, color, material, collection)
 */
function buildPerWordRelatedConditions(
	word: string
): Prisma.ProductWhereInput[] {
	return [
		{
			skus: {
				some: {
					OR: [
						{
							sku: {
								contains: word,
								mode: Prisma.QueryMode.insensitive,
							},
						},
						{
							color: {
								OR: [
									{
										name: {
											contains: word,
											mode: Prisma.QueryMode.insensitive,
										},
									},
									{
										hex: {
											contains: word,
											mode: Prisma.QueryMode.insensitive,
										},
									},
								],
							},
						},
						{
							material: {
								name: {
									contains: word,
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
									contains: word,
									mode: Prisma.QueryMode.insensitive,
								},
							},
							{
								slug: {
									contains: word,
									mode: Prisma.QueryMode.insensitive,
								},
							},
						],
					},
				},
			},
		},
	];
}

/**
 * Recherche exacte sur tous les champs (fallback pour termes courts)
 * Inclut title et description.
 * AND logic: each word must match at least one field.
 */
function buildFullExactSearchConditions(
	words: string[]
): Prisma.ProductWhereInput[] {
	if (words.length === 0) return [];

	// Each word must match at least one field (AND of per-word ORs)
	return words.map(buildPerWordOrConditions);
}

/**
 * Recherche exacte sur les champs liés (SKU, couleurs, matériaux, collections)
 * N'inclut PAS title/description (gérés par fuzzy search).
 * AND logic: each word must match at least one related field.
 */
function buildRelatedFieldsSearchConditions(
	words: string[]
): Prisma.ProductWhereInput[] {
	if (words.length === 0) return [];

	// Each word must match at least one related field
	return words.map((word) => ({
		OR: buildPerWordRelatedConditions(word),
	}));
}

export function buildProductFilterConditions(
	filters: ProductFilters
): Prisma.ProductWhereInput[] {
	const conditions: Prisma.ProductWhereInput[] = [];
	if (!filters) return conditions;

	if (filters.status !== undefined) {
		const statuses = (
			Array.isArray(filters.status) ? filters.status : [filters.status]
		).filter(Boolean);
		if (statuses.length === 1) {
			conditions.push({ status: statuses[0] });
		} else if (statuses.length > 1) {
			conditions.push({ status: { in: statuses } });
		}
	}

	if (filters.type !== undefined) {
		const types = (
			Array.isArray(filters.type) ? filters.type : [filters.type]
		).filter(Boolean);
		if (types.length === 1) {
			conditions.push({ type: { slug: types[0] } });
		} else if (types.length > 1) {
			conditions.push({ type: { slug: { in: types } } });
		}
	}

	if (filters.color !== undefined) {
		const colors = (
			Array.isArray(filters.color) ? filters.color : [filters.color]
		).filter(Boolean);
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
		const materials = (
			Array.isArray(filters.material) ? filters.material : [filters.material]
		).filter(Boolean);
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
		const collectionIds = (
			Array.isArray(filters.collectionId)
				? filters.collectionId
				: [filters.collectionId]
		).filter(Boolean);
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
		const collectionSlugs = (
			Array.isArray(filters.collectionSlug)
				? filters.collectionSlug
				: [filters.collectionSlug]
		).filter(Boolean);
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

	// Filter by specific slugs (for curated selections)
	if (filters.slugs !== undefined && filters.slugs.length > 0) {
		conditions.push({ slug: { in: filters.slugs } });
	}

	// Validation bounds: prix doit etre >= 0
	const validPriceMin =
		typeof filters.priceMin === "number" && filters.priceMin >= 0
			? filters.priceMin
			: undefined;
	const validPriceMax =
		typeof filters.priceMax === "number" && filters.priceMax >= 0
			? filters.priceMax
			: undefined;

	if (validPriceMin !== undefined && validPriceMax !== undefined) {
		conditions.push({
			skus: {
				some: {
					isActive: true,
					priceInclTax: { gte: validPriceMin, lte: validPriceMax },
				},
			},
		});
	} else {
		if (validPriceMin !== undefined) {
			conditions.push({
				skus: {
					some: { isActive: true, priceInclTax: { gte: validPriceMin } },
				},
			});
		}
		if (validPriceMax !== undefined) {
			conditions.push({
				skus: {
					some: { isActive: true, priceInclTax: { lte: validPriceMax } },
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

	// On sale filter: products with at least one active SKU that has compareAtPrice set
	// Note: compareAtPrice >= priceInclTax is enforced by schema validation on create/update,
	// so a non-null compareAtPrice reliably indicates a sale
	if (filters.onSale === true) {
		conditions.push({
			skus: {
				some: {
					isActive: true,
					compareAtPrice: { not: null },
				},
			},
		});
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

	// Rating filter (minimum average rating, 0-5)
	if (
		typeof filters.ratingMin === "number" &&
		filters.ratingMin >= 0 &&
		filters.ratingMin <= 5
	) {
		conditions.push({
			reviewStats: {
				averageRating: { gte: filters.ratingMin },
			},
		});
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

	// Exclure les produits soft-deleted par défaut
	// Pour l'admin, utiliser includeDeleted: true dans les params
	if (!params.includeDeleted) {
		andConditions.push({ ...notDeleted });
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
			// exactConditions are per-word AND conditions, so wrap in AND
			if (exactConditions.length > 0) {
				andConditions.push({
					OR: [
						{ id: { in: fuzzyIds } },
						{ AND: exactConditions },
					],
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
