import { Prisma } from "@/app/generated/prisma/client";
import { z } from "zod";
import { productSkuFiltersSchema } from "@/modules/skus/schemas/sku-filters-schema";

/**
 * Construit les conditions de filtrage pour la liste des SKUs de produits
 * Logique intégrée directement pour simplicité et maintenabilité
 */
export const buildFilterConditions = (
	filters: z.infer<typeof productSkuFiltersSchema>
): Prisma.ProductSkuWhereInput[] => {
	const conditions: Prisma.ProductSkuWhereInput[] = [];

	if (!filters) {
		return conditions;
	}

	// ProductId - logique intégrée (fortement recommandé)
	if (filters.productId !== undefined) {
		const productIds = Array.isArray(filters.productId)
			? filters.productId
			: [filters.productId];
		if (productIds.length === 1) {
			conditions.push({ productId: productIds[0] });
		} else if (productIds.length > 1) {
			conditions.push({ productId: { in: productIds } });
		}
	}

	// ColorId - logique intégrée
	if (filters.colorId !== undefined) {
		const colorIds = Array.isArray(filters.colorId)
			? filters.colorId
			: [filters.colorId];
		if (colorIds.length === 1) {
			conditions.push({ colorId: colorIds[0] });
		} else if (colorIds.length > 1) {
			conditions.push({ colorId: { in: colorIds } });
		}
	}

	// Material - filter by materialRelation.name
	if (filters.material !== undefined) {
		const materials = Array.isArray(filters.material)
			? filters.material
			: [filters.material];
		if (materials.length === 1) {
			conditions.push({
				materialRelation: {
					name: {
						contains: materials[0],
						mode: Prisma.QueryMode.insensitive,
					},
				},
			});
		} else if (materials.length > 1) {
			// Pour plusieurs matériaux, utiliser OR
			conditions.push({
				OR: materials.map((mat) => ({
					materialRelation: {
						name: {
							contains: mat,
							mode: Prisma.QueryMode.insensitive,
						},
					},
				})),
			} as Prisma.ProductSkuWhereInput);
		}
	}

	// SKU prefix - logique intégrée
	if (filters.sku !== undefined) {
		const skus = Array.isArray(filters.sku) ? filters.sku : [filters.sku];
		if (skus.length === 1) {
			conditions.push({
				sku: {
					contains: skus[0],
					mode: Prisma.QueryMode.insensitive,
				},
			});
		} else if (skus.length > 1) {
			conditions.push({
				OR: skus.map((sku) => ({
					sku: {
						contains: sku,
						mode: Prisma.QueryMode.insensitive,
					},
				})),
			} as Prisma.ProductSkuWhereInput);
		}
	}

	// Statuts booléens
	if (typeof filters.isActive === "boolean") {
		conditions.push({
			isActive: filters.isActive,
		});
	}

	if (typeof filters.isDefault === "boolean") {
		conditions.push({
			isDefault: filters.isDefault,
		});
	}

	// Filtres de prix (utiliser priceInclTax)
	if (typeof filters.priceMin === "number") {
		conditions.push({
			priceInclTax: {
				gte: filters.priceMin,
			},
		});
	}

	if (typeof filters.priceMax === "number") {
		conditions.push({
			priceInclTax: {
				lte: filters.priceMax,
			},
		});
	}

	// Filtres de stock
	if (typeof filters.inventoryMin === "number") {
		conditions.push({
			inventory: {
				gte: filters.inventoryMin,
			},
		});
	}

	if (typeof filters.inventoryMax === "number") {
		conditions.push({
			inventory: {
				lte: filters.inventoryMax,
			},
		});
	}

	// Stock disponible
	if (filters.inStock === true) {
		conditions.push({
			inventory: {
				gt: 0,
			},
		});
	}

	// Rupture de stock
	if (filters.outOfStock === true) {
		conditions.push({
			inventory: {
				lte: 0,
			},
		});
	}

	// Stock status composite filter
	if (filters.stockStatus && filters.stockStatus !== "all") {
		if (filters.stockStatus === "in_stock") {
			// En stock (>=3)
			conditions.push({
				inventory: {
					gte: 3,
				},
			});
		} else if (filters.stockStatus === "low_stock") {
			// Stock faible (1-2)
			conditions.push({
				AND: [
					{
						inventory: {
							gte: 1,
						},
					},
					{
						inventory: {
							lte: 2,
						},
					},
				],
			});
		} else if (filters.stockStatus === "out_of_stock") {
			// Rupture (0)
			conditions.push({
				inventory: {
					lte: 0,
				},
			});
		}
	}

	// Filtres de taille
	if (filters.size !== undefined) {
		const sizes = Array.isArray(filters.size) ? filters.size : [filters.size];
		if (sizes.length === 1) {
			conditions.push({ size: sizes[0] });
		} else if (sizes.length > 1) {
			conditions.push({ size: { in: sizes } });
		}
	}

	// Filtres temporels - logique intégrée
	if (filters.createdAfter instanceof Date) {
		conditions.push({
			createdAt: {
				gte: filters.createdAfter,
			},
		});
	}

	if (filters.createdBefore instanceof Date) {
		conditions.push({
			createdAt: {
				lte: filters.createdBefore,
			},
		});
	}

	if (filters.updatedAfter instanceof Date) {
		conditions.push({
			updatedAt: {
				gte: filters.updatedAfter,
			},
		});
	}

	if (filters.updatedBefore instanceof Date) {
		conditions.push({
			updatedAt: {
				lte: filters.updatedBefore,
			},
		});
	}

	// Filtres sur les relations
	if (filters.hasImages === true) {
		conditions.push({
			images: {
				some: {},
			},
		});
	} else if (filters.hasImages === false) {
		conditions.push({
			images: {
				none: {},
			},
		});
	}

	if (filters.hasOrders === true) {
		conditions.push({
			orderItems: {
				some: {},
			},
		});
	} else if (filters.hasOrders === false) {
		conditions.push({
			orderItems: {
				none: {},
			},
		});
	}


	return conditions;
};
