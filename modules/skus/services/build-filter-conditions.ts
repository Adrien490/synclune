import { Prisma } from "@/app/generated/prisma/client";
import type { ProductSkuFilters } from "@/modules/skus/schemas/sku-filters-schema";
import { STOCK_THRESHOLDS } from "@/shared/constants/cache-tags";

/**
 * Construit les conditions de filtrage pour la liste des SKUs de produits
 * Logique intégrée directement pour simplicité et maintenabilité
 */
export const buildFilterConditions = (
	filters: ProductSkuFilters,
): Prisma.ProductSkuWhereInput[] => {
	const conditions: Prisma.ProductSkuWhereInput[] = [];

	// ProductId - logique intégrée (fortement recommandé)
	if (filters.productId !== undefined) {
		const productIds = Array.isArray(filters.productId) ? filters.productId : [filters.productId];
		if (productIds.length === 1) {
			conditions.push({ productId: productIds[0] });
		} else if (productIds.length > 1) {
			conditions.push({ productId: { in: productIds } });
		}
	}

	// ColorId — filter by colorId via M2M ProductSkuColor (tolérant : un SKU bicolore
	// matche si au moins une de ses couleurs correspond au filtre).
	if (filters.colorId !== undefined) {
		const colorIds = Array.isArray(filters.colorId) ? filters.colorId : [filters.colorId];
		if (colorIds.length === 1) {
			conditions.push({
				colors: { some: { colorId: colorIds[0] } },
			});
		} else if (colorIds.length > 1) {
			conditions.push({
				colors: { some: { colorId: { in: colorIds } } },
			});
		}
	}

	// MaterialId - filter by material ID via M2M (preferred)
	if (filters.materialId !== undefined) {
		const materialIds = Array.isArray(filters.materialId)
			? filters.materialId
			: [filters.materialId];
		if (materialIds.length === 1) {
			conditions.push({
				materials: { some: { materialId: materialIds[0] } },
			});
		} else if (materialIds.length > 1) {
			conditions.push({
				materials: { some: { materialId: { in: materialIds } } },
			});
		}
	}

	// Material - filter by material.name via M2M (legacy)
	if (filters.material !== undefined) {
		const materials = Array.isArray(filters.material) ? filters.material : [filters.material];
		if (materials.length === 1) {
			conditions.push({
				materials: {
					some: {
						material: {
							name: {
								contains: materials[0],
								mode: Prisma.QueryMode.insensitive,
							},
						},
					},
				},
			});
		} else if (materials.length > 1) {
			// Pour plusieurs matériaux, utiliser OR
			const materialOrClause: Prisma.ProductSkuWhereInput = {
				OR: materials.map((mat) => ({
					materials: {
						some: {
							material: {
								name: {
									contains: mat,
									mode: Prisma.QueryMode.insensitive,
								},
							},
						},
					},
				})),
			};
			conditions.push(materialOrClause);
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
			const skuOrClause: Prisma.ProductSkuWhereInput = {
				OR: skus.map((sku) => ({
					sku: {
						contains: sku,
						mode: Prisma.QueryMode.insensitive,
					},
				})),
			};
			conditions.push(skuOrClause);
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
	// Sémantique alignée sur le filtre produit (product-query-builder.ts) afin que
	// le libellé « En stock » / « Stock faible » signifie la même chose dans la liste
	// SKU et dans la liste produits (cf. audit filtres A1) :
	//   - in_stock     : au moins une unité (inventory > 0, inclut le stock faible)
	//   - low_stock    : 0 < inventory <= LOW (stock faible, sous-ensemble de in_stock)
	//   - out_of_stock : inventory <= 0
	if (filters.stockStatus && filters.stockStatus !== "all") {
		if (filters.stockStatus === "in_stock") {
			conditions.push({
				inventory: {
					gt: 0,
				},
			});
		} else if (filters.stockStatus === "low_stock") {
			conditions.push({
				inventory: {
					gt: 0,
					lte: STOCK_THRESHOLDS.LOW,
				},
			});
		} else {
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
