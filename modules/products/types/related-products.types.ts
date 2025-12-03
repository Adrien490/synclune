import { Prisma } from "@/app/generated/prisma";
import { RELATED_PRODUCTS_SELECT } from "../constants/related-products.constants";

// ============================================================================
// ENTITY TYPES
// ============================================================================

export type RelatedProduct = Prisma.ProductGetPayload<{
	select: typeof RELATED_PRODUCTS_SELECT;
}>;

export type GetRelatedProductsReturn = RelatedProduct[];
