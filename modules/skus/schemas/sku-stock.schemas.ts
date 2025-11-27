import { z } from "zod";

// ============================================================================
// GET SKU STOCK SCHEMA
// ============================================================================

export const getSkuStockSchema = z.object({
	skuId: z.string().trim().min(1),
});
