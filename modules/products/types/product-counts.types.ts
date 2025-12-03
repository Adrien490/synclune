import { ProductStatus } from "@/app/generated/prisma/client";

// ============================================================================
// FUNCTION TYPES
// ============================================================================

export type ProductCountsByStatus = {
	[ProductStatus.PUBLIC]: number;
	[ProductStatus.DRAFT]: number;
	[ProductStatus.ARCHIVED]: number;
};

export type GetProductCountsByStatusReturn = ProductCountsByStatus;
