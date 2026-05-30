import { Prisma, type ProductStatus } from "@/app/generated/prisma/client";
import { notDeleted } from "@/shared/lib/prisma";
import type { GetProductsParams, ProductFilters } from "../types/product.types";
import type { SearchResult } from "../types/product-services.types";

import { LOW_STOCK_THRESHOLD } from "../constants/product.constants";
import { FUZZY_MIN_LENGTH } from "../constants/search.constants";
import { SEARCH_SYNONYMS } from "../constants/search-synonyms";
import { fuzzySearchProductIds } from "../data/fuzzy-search";
import { splitSearchTerms } from "../utils/search-helpers";

export type { SearchResult } from "../types/product-services.types";

// ============================================================================
// PRODUCT SEARCH BUILDER
// ============================================================================

/**
 * Build hybrid search conditions (fuzzy + exact).
 *
 * - >= 3 chars: fuzzy on title/description + exact on related fields
 * - < 3 chars: exact only on all fields
 *
 * Multi-word queries use AND logic: each word must match independently.
 *
 * Note: Rate limiting is handled at the data layer (get-products.ts).
 *
 * @param search - Search term
 * @param options - Options (status to filter products)
 * @returns Search result with fuzzy IDs and exact conditions
 */
export async function buildSearchConditions(
	search: string,
	options?: { status?: ProductStatus },
): Promise<SearchResult> {
	const term = search.trim();
	if (!term) return { fuzzyIds: null, exactConditions: [] };

	const words = splitSearchTerms(term);
	if (words.length === 0) return { fuzzyIds: null, exactConditions: [] };

	// Short search (< 3 chars): exact only on all fields
	if (term.length < FUZZY_MIN_LENGTH) {
		return {
			fuzzyIds: null,
			exactConditions: buildFullExactSearchConditions(words),
		};
	}

	// Fuzzy search on title/description
	const { ids: fuzzyIds } = await fuzzySearchProductIds(term, {
		status: options?.status,
	});

	// Exact conditions for related fields (SKU, colors, etc.)
	const exactConditions = buildRelatedFieldsSearchConditions(words);

	return { fuzzyIds, exactConditions };
}

/**
 * Exact-only search (fallback when rate limited).
 * Exported for use by the data layer.
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
 * Get word variants (original + synonyms) for a search word.
 */
function getWordVariants(word: string): string[] {
	const synonyms = SEARCH_SYNONYMS.get(word.toLowerCase());
	return synonyms ? [word, ...synonyms] : [word];
}

/**
 * Build OR conditions for a single word (+ synonyms) across all fields (title, description, related)
 */
function buildPerWordOrConditions(word: string): Prisma.ProductWhereInput {
	const variants = getWordVariants(word);
	return {
		OR: variants.flatMap((variant) => [
			{
				title: {
					contains: variant,
					mode: Prisma.QueryMode.insensitive,
				},
			},
			{
				description: {
					contains: variant,
					mode: Prisma.QueryMode.insensitive,
				},
			},
			...buildPerWordRelatedConditions(variant),
		]),
	};
}

/**
 * Build OR conditions for a single word across related fields only
 * (SKU, color, material, collection)
 */
function buildPerWordRelatedConditions(word: string): Prisma.ProductWhereInput[] {
	return [
		{
			type: {
				OR: [
					{
						label: {
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
							colors: {
								some: {
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
							},
						},
						{
							materials: {
								some: {
									material: {
										name: {
											contains: word,
											mode: Prisma.QueryMode.insensitive,
										},
									},
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
 * Exact search on all fields (fallback for short terms).
 * Includes title and description.
 * AND logic: each word must match at least one field.
 */
function buildFullExactSearchConditions(words: string[]): Prisma.ProductWhereInput[] {
	if (words.length === 0) return [];

	// Each word must match at least one field (AND of per-word ORs)
	return words.map(buildPerWordOrConditions);
}

/**
 * Exact search on related fields only (SKU, colors, materials, collections).
 * Does NOT include title/description (handled by fuzzy search).
 * AND logic: each word must match at least one related field.
 * Expanded with synonyms for each word.
 */
export function buildRelatedFieldsSearchConditions(words: string[]): Prisma.ProductWhereInput[] {
	if (words.length === 0) return [];

	// Each word (+ synonyms) must match at least one related field
	return words.map((word) => {
		const variants = getWordVariants(word);
		return {
			OR: variants.flatMap(buildPerWordRelatedConditions),
		};
	});
}

export function buildProductFilterConditions(filters: ProductFilters): Prisma.ProductWhereInput[] {
	const conditions: Prisma.ProductWhereInput[] = [];

	// Contraintes au niveau variante (couleur + matériau + prix) accumulées dans
	// UN SEUL `skus: { some }` : une même variante active doit satisfaire TOUS ces
	// critères. Sinon (conditions `some` séparées) un produit matcherait via des
	// SKU différents — ex: variante or à 150€ + variante argent à 30€ matcherait
	// `color=or&priceMax=50` alors qu'aucune variante or n'est ≤ 50€ (audit filtres S1).
	const skuSome: Prisma.ProductSkuWhereInput = { isActive: true };
	let hasSkuConstraint = false;

	if (filters.status !== undefined) {
		const statuses = (Array.isArray(filters.status) ? filters.status : [filters.status]).filter(
			Boolean,
		);
		if (statuses.length === 1) {
			conditions.push({ status: statuses[0] });
		} else if (statuses.length > 1) {
			conditions.push({ status: { in: statuses } });
		}
	}

	if (filters.type !== undefined) {
		const types = (Array.isArray(filters.type) ? filters.type : [filters.type]).filter(Boolean);
		if (types.length === 1) {
			conditions.push({ type: { slug: types[0] } });
		} else if (types.length > 1) {
			conditions.push({ type: { slug: { in: types } } });
		}
	}

	if (filters.color !== undefined) {
		const colors = (Array.isArray(filters.color) ? filters.color : [filters.color]).filter(Boolean);
		// Multi-valeurs tolérant au sein d'UNE variante : la variante doit porter
		// au moins une des couleurs sélectionnées (la contrainte « même variante »
		// vient de la fusion dans skuSome — cf. note en tête de fonction).
		if (colors.length === 1) {
			skuSome.colors = { some: { color: { slug: colors[0] } } };
			hasSkuConstraint = true;
		} else if (colors.length > 1) {
			skuSome.colors = { some: { color: { slug: { in: colors } } } };
			hasSkuConstraint = true;
		}
	}

	if (filters.material !== undefined) {
		const materials = (
			Array.isArray(filters.material) ? filters.material : [filters.material]
		).filter(Boolean);
		if (materials.length === 1) {
			skuSome.materials = { some: { material: { slug: materials[0] } } };
			hasSkuConstraint = true;
		} else if (materials.length > 1) {
			skuSome.materials = { some: { material: { slug: { in: materials } } } };
			hasSkuConstraint = true;
		}
	}

	if (filters.collectionId !== undefined) {
		const collectionIds = (
			Array.isArray(filters.collectionId) ? filters.collectionId : [filters.collectionId]
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
			Array.isArray(filters.collectionSlug) ? filters.collectionSlug : [filters.collectionSlug]
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

	// Validation bounds: price must be >= 0. Fusionné dans skuSome pour que la
	// variante dans le budget soit la MÊME que celle qui porte la couleur/matériau
	// filtré(e) (audit filtres S1).
	const validPriceMin =
		typeof filters.priceMin === "number" && filters.priceMin >= 0 ? filters.priceMin : undefined;
	const validPriceMax =
		typeof filters.priceMax === "number" && filters.priceMax >= 0 ? filters.priceMax : undefined;

	if (validPriceMin !== undefined || validPriceMax !== undefined) {
		skuSome.priceInclTax = {
			...(validPriceMin !== undefined ? { gte: validPriceMin } : {}),
			...(validPriceMax !== undefined ? { lte: validPriceMax } : {}),
		};
		hasSkuConstraint = true;
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
			// Out of stock: no active SKU with inventory > 0
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
		} else if (filters.stockStatus === "low_stock") {
			// Low stock: at least one active SKU with 0 < inventory <= LOW_STOCK_THRESHOLD
			conditions.push({
				skus: {
					some: {
						isActive: true,
						inventory: { gt: 0, lte: LOW_STOCK_THRESHOLD },
					},
				},
			});
		} else {
			// In stock: at least one active SKU with inventory > 0
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
	if (typeof filters.ratingMin === "number" && filters.ratingMin >= 0 && filters.ratingMin <= 5) {
		conditions.push({
			reviewStats: {
				averageRating: { gte: filters.ratingMin },
			},
		});
	}

	// Pousse l'unique contrainte variante (couleur + matériau + prix fusionnés).
	if (hasSkuConstraint) {
		conditions.push({ skus: { some: skuSome } });
	}

	return conditions;
}

/**
 * Build the WHERE clause for the product query.
 *
 * @param params - Search parameters (filters, status, etc.)
 * @param searchResult - Search result (fuzzyIds + exactConditions).
 *                       If provided, uses hybrid search.
 *                       If omitted, no search is applied.
 */
export function buildProductWhereClause(
	params: GetProductsParams,
	searchResult?: SearchResult,
): Prisma.ProductWhereInput {
	const whereClause: Prisma.ProductWhereInput = {};
	const andConditions: Prisma.ProductWhereInput[] = [];
	const filters = params.filters;

	// Exclude soft-deleted products by default
	// For admin, use includeDeleted: true in params
	if (!params.includeDeleted) {
		andConditions.push({ ...notDeleted });
	}

	// Filter by status if specified
	// If undefined, show all statuses (used by admin)
	if (params.status) {
		andConditions.push({
			status: params.status,
		});
	}

	// Apply search conditions if provided
	if (searchResult) {
		const { fuzzyIds, exactConditions } = searchResult;

		if (fuzzyIds !== null && fuzzyIds.length > 0) {
			// Active fuzzy search: combine fuzzy IDs OR exact conditions
			// Finds products via fuzzy (title/desc) OR exact match (SKU, colors, etc.)
			// exactConditions are per-word AND conditions, so wrap in AND
			if (exactConditions.length > 0) {
				andConditions.push({
					OR: [{ id: { in: fuzzyIds } }, { AND: exactConditions }],
				});
			} else {
				andConditions.push({ id: { in: fuzzyIds } });
			}
		} else if (exactConditions.length > 0) {
			// No fuzzy results: use exact conditions only
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
