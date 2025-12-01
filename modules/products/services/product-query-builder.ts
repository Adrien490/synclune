import { Prisma, ProductStatus } from "@/app/generated/prisma/client";
import type { GetProductsParams, ProductFilters } from "../types/product.types";

// ============================================================================
// PRODUCT QUERY BUILDER UTILS
// ============================================================================

export function buildProductSearchConditions(
	search: string
): Prisma.ProductWhereInput[] {
	const searchTerm = search.trim();
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

export function buildProductWhereClause(
	params: GetProductsParams
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

	if (params.search) {
		const searchConditions = buildProductSearchConditions(params.search);
		if (searchConditions.length > 0) {
			andConditions.push(...searchConditions);
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
