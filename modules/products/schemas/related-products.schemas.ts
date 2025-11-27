import { z } from "zod";
import { RELATED_PRODUCTS_DEFAULT_LIMIT } from "../constants/related-products.constants";

// ============================================================================
// GET RELATED PRODUCTS SCHEMA
// ============================================================================

export const getRelatedProductsSchema = z.object({
	currentProductSlug: z.string().trim().min(1).optional(),
	limit: z.number().int().min(1).max(20).default(RELATED_PRODUCTS_DEFAULT_LIMIT),
});
