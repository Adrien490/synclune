import type { Prisma } from "@/app/generated/prisma/client";
import type { ProductVariantFilters } from "@/modules/variants/schemas/variant-filters-schema";
import { STOCK_THRESHOLDS } from "@/shared/constants/cache-tags";

/** Normalise un filtre `string | string[] | undefined` en tableau. */
function toArray(value: string | string[] | undefined): string[] {
	if (!value) return [];
	return Array.isArray(value) ? value : [value];
}

/**
 * Conditions `WHERE` d'un statut de stock.
 *
 * Sémantique alignée sur le filtre produit (`product-query-builder.ts`) afin que
 * « En stock » / « Stock faible » signifient la même chose dans les deux listes
 * (cf. audit filtres A1) :
 *   - in_stock     : au moins une unité (stock > 0, inclut le stock faible)
 *   - low_stock    : 0 < stock <= LOW (sous-ensemble de in_stock)
 *   - out_of_stock : stock <= 0
 */
const STOCK_STATUS_CONDITIONS = {
	in_stock: { stock: { gt: 0 } },
	low_stock: { stock: { gt: 0, lte: STOCK_THRESHOLDS.LOW } },
	out_of_stock: { stock: { lte: 0 } },
} as const satisfies Record<string, Prisma.ProductVariantWhereInput>;

/**
 * Construit les conditions de filtrage pour la liste des VARIANTs de produits.
 * Chaque condition est empilée dans le même `AND` par `buildWhereClause`.
 */
export const buildFilterConditions = (
	filters: ProductVariantFilters,
): Prisma.ProductVariantWhereInput[] => {
	const conditions: Prisma.ProductVariantWhereInput[] = [];

	const productIds = toArray(filters.productId);
	if (productIds.length === 1) {
		conditions.push({ productId: productIds[0] });
	} else if (productIds.length > 1) {
		conditions.push({ productId: { in: productIds } });
	}

	// Couleur / matériau : FK simples depuis le schéma lean.
	const colorIds = toArray(filters.colorId);
	if (colorIds.length > 0) {
		conditions.push({ colorId: { in: colorIds } });
	}

	const materialIds = toArray(filters.materialId);
	if (materialIds.length > 0) {
		conditions.push({ materialId: { in: materialIds } });
	}

	if (typeof filters.active === "boolean") {
		conditions.push({ active: filters.active });
	}

	// Statuts de stock : UNION des cases cochées (une seule case ⇒ pas de `OR`
	// superflu dans la requête).
	const stockStatuses = filters.stockStatus ?? [];
	if (stockStatuses.length === 1) {
		conditions.push(STOCK_STATUS_CONDITIONS[stockStatuses[0]!]);
	} else if (stockStatuses.length > 1) {
		conditions.push({ OR: stockStatuses.map((status) => STOCK_STATUS_CONDITIONS[status]) });
	}

	return conditions;
};
