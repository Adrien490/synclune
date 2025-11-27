import { z } from "zod";

// ============================================================================
// VARIANT SELECTORS SCHEMA
// ============================================================================

export const variantSelectorsSchema = z.object({
	color: z.string().optional(),
	material: z.string().optional(),
	size: z.string().optional(),
});

// ============================================================================
// FIND SKU BY VARIANTS SCHEMA
// ============================================================================

export const findSkuByVariantsSchema = z.object({
	productId: z.string().trim().min(1),
	selectors: variantSelectorsSchema,
});

// ============================================================================
// FILTER COMPATIBLE SKUS SCHEMA
// ============================================================================

export const filterCompatibleSkusSchema = z.object({
	productId: z.string().trim().min(1),
	selectedVariants: variantSelectorsSchema.partial(),
});

// ============================================================================
// EXTRACT VARIANT INFO SCHEMA
// ============================================================================

export const extractVariantInfoSchema = z.object({
	productId: z.string().trim().min(1),
});
