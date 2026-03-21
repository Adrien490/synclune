// ============================================================================
// SELECT DEFINITIONS - ACCOUNT STATS
// ============================================================================

export const CART_SELECT_FOR_COUNT = {
	_count: {
		select: {
			items: true,
		},
	},
} as const;

export const LAST_ORDER_SELECT_FOR_DATE = {
	createdAt: true,
} as const;
