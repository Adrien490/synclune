// ============================================================================
// TYPES - ACCOUNT STATS
// ============================================================================

export interface AccountStats {
	totalOrders: number;
	pendingOrders: number;
	cartItemsCount: number;
}

export type GetAccountStatsReturn = AccountStats | null;
