import { Prisma } from "@/app/generated/prisma/client";
import type { ProductVariantFilters } from "@/modules/variants/schemas/variant-filters-schema";
import { STOCK_THRESHOLDS } from "@/shared/constants/cache-tags";

/**
 * Construit les conditions de filtrage pour la liste des VARIANTs de produits
 * Logique intégrée directement pour simplicité et maintenabilité
 */
export const buildFilterConditions = (
	filters: ProductVariantFilters,
): Prisma.ProductVariantWhereInput[] => {
	const conditions: Prisma.ProductVariantWhereInput[] = [];

	// ProductId - logique intégrée (fortement recommandé)
	if (filters.productId !== undefined) {
		const productIds = Array.isArray(filters.productId) ? filters.productId : [filters.productId];
		if (productIds.length === 1) {
			conditions.push({ productId: productIds[0] });
		} else if (productIds.length > 1) {
			conditions.push({ productId: { in: productIds } });
		}
	}

	// ColorId — FK simple (schéma lean)
	if (filters.colorId !== undefined) {
		const colorIds = Array.isArray(filters.colorId) ? filters.colorId : [filters.colorId];
		if (colorIds.length >= 1) {
			conditions.push({ colorId: { in: colorIds } });
		}
	}

	// MaterialId — FK simple
	if (filters.materialId !== undefined) {
		const materialIds = Array.isArray(filters.materialId)
			? filters.materialId
			: [filters.materialId];
		if (materialIds.length >= 1) {
			conditions.push({ materialId: { in: materialIds } });
		}
	}

	// Material — par nom (legacy)
	if (filters.material !== undefined) {
		const materials = Array.isArray(filters.material) ? filters.material : [filters.material];
		if (materials.length >= 1) {
			conditions.push({
				OR: materials.map((mat) => ({
					material: {
						is: {
							name: { contains: mat, mode: Prisma.QueryMode.insensitive },
						},
					},
				})),
			});
		}
	}

	// Statuts booléens
	if (typeof filters.active === "boolean") {
		conditions.push({
			active: filters.active,
		});
	}

	// Filtres de prix (utiliser priceCents)
	if (typeof filters.priceMin === "number") {
		conditions.push({
			priceCents: {
				gte: filters.priceMin,
			},
		});
	}

	if (typeof filters.priceMax === "number") {
		conditions.push({
			priceCents: {
				lte: filters.priceMax,
			},
		});
	}

	// Filtres de stock
	if (typeof filters.stockMin === "number") {
		conditions.push({
			stock: {
				gte: filters.stockMin,
			},
		});
	}

	if (typeof filters.stockMax === "number") {
		conditions.push({
			stock: {
				lte: filters.stockMax,
			},
		});
	}

	// Stock disponible
	if (filters.inStock === true) {
		conditions.push({
			stock: {
				gt: 0,
			},
		});
	}

	// Rupture de stock
	if (filters.outOfStock === true) {
		conditions.push({
			stock: {
				lte: 0,
			},
		});
	}

	// Stock status composite filter
	// Sémantique alignée sur le filtre produit (product-query-builder.ts) afin que
	// le libellé « En stock » / « Stock faible » signifie la même chose dans la liste
	// VARIANT et dans la liste produits (cf. audit filtres A1) :
	//   - in_stock     : au moins une unité (stock > 0, inclut le stock faible)
	//   - low_stock    : 0 < stock <= LOW (stock faible, sous-ensemble de in_stock)
	//   - out_of_stock : stock <= 0
	if (filters.stockStatus && filters.stockStatus !== "all") {
		if (filters.stockStatus === "in_stock") {
			conditions.push({
				stock: {
					gt: 0,
				},
			});
		} else if (filters.stockStatus === "low_stock") {
			conditions.push({
				stock: {
					gt: 0,
					lte: STOCK_THRESHOLDS.LOW,
				},
			});
		} else {
			conditions.push({
				stock: {
					lte: 0,
				},
			});
		}
	}

	// Filtres de taille
	if (filters.size !== undefined) {
		const sizes = Array.isArray(filters.size) ? filters.size : [filters.size];
		// Insensible à la casse : parité avec `matchSize` et
		// `assertUniqueVariantCombination` (cf. variant-filter.service).
		if (sizes.length === 1) {
			conditions.push({ size: { equals: sizes[0], mode: "insensitive" } });
		} else if (sizes.length > 1) {
			conditions.push({
				OR: sizes.map((s) => ({ size: { equals: s, mode: "insensitive" as const } })),
			});
		}
	}

	// Plus de filtres temporels : ProductVariant lean n'a pas de timestamps.

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
