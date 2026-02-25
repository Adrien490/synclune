// Shared E2E test constants

/** Common timeout values (ms) */
export const TIMEOUTS = {
	/** Form validation feedback */
	VALIDATION: 3000,
	/** General UI feedback (toasts, alerts) */
	FEEDBACK: 5000,
	/** Async data loading (tables, KPIs) */
	DATA_LOAD: 10000,
	/** Auth redirects, Stripe iframe */
	AUTH_REDIRECT: 15000,
} as const

/** Shared selectors used across page objects */
export const SELECTORS = {
	/** Product link pattern - matches /creations/{slug} */
	PRODUCT_LINK: 'a[href*="/creations/"]',
} as const
