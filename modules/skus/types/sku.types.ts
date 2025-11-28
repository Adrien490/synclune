import { Prisma } from "@/app/generated/prisma/client";
import { z } from "zod";
import { GET_PRODUCT_SKU_SELECT } from "../constants/sku.constants";
import {
	getProductSkuSchema,
	createProductSkuSchema,
	updateProductSkuSchema,
	deleteProductSkuSchema,
	updateProductSkuStatusSchema,
	bulkActivateSkusSchema,
	bulkDeactivateSkusSchema,
	bulkDeleteSkusSchema,
} from "../schemas/sku.schemas";

// ============================================================================
// FUNCTION TYPES
// ============================================================================

export type GetProductSkuParams = z.infer<typeof getProductSkuSchema>;

export type GetProductSkuReturn = Prisma.ProductSkuGetPayload<{
	select: typeof GET_PRODUCT_SKU_SELECT;
}>;

// ============================================================================
// MUTATION TYPES
// ============================================================================

export type CreateProductSkuFormData = z.infer<typeof createProductSkuSchema>;
export type UpdateProductSkuFormData = z.infer<typeof updateProductSkuSchema>;
export type DeleteProductSkuInput = z.infer<typeof deleteProductSkuSchema>;
export type UpdateProductSkuStatusInput = z.infer<typeof updateProductSkuStatusSchema>;
export type BulkActivateSkusInput = z.infer<typeof bulkActivateSkusSchema>;
export type BulkDeactivateSkusInput = z.infer<typeof bulkDeactivateSkusSchema>;
export type BulkDeleteSkusInput = z.infer<typeof bulkDeleteSkusSchema>;
