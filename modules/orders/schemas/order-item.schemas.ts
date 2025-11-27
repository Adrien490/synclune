import { z } from "zod";

// ============================================================================
// GET ORDER ITEM SCHEMA
// ============================================================================

export const getOrderItemSchema = z.object({
	id: z.string().trim().min(1),
});
