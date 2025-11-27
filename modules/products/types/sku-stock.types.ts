// ============================================================================
// FUNCTION TYPES
// ============================================================================

export type GetSkuStockReturn = {
	available: number;
	isInStock: boolean;
	isActive: boolean;
	lowStock: boolean;
} | null;
