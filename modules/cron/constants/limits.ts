/**
 * Cron job batch limits and configuration
 *
 * These limits are set to:
 * 1. Prevent timeouts (Vercel functions have max 60s execution time)
 * 2. Avoid overwhelming external APIs (Stripe rate limits)
 * 3. Keep database load manageable
 *
 * Rationale for each limit:
 * - BATCH_SIZE_SMALL (10): For operations that make external API calls per item
 * - BATCH_SIZE_MEDIUM (25): For mixed operations with some external calls
 * - BATCH_SIZE_LARGE (50): For pure database operations
 */

/**
 * Small batch size for operations with external API calls
 * Used by: retry-webhooks (makes Stripe API call per event)
 */
export const BATCH_SIZE_SMALL = 10;

/**
 * Medium batch size for mixed operations
 * Used by: sync-async-payments, reconcile-refunds
 */
export const BATCH_SIZE_MEDIUM = 25;

/**
 * Large batch size for pure database operations
 * Used by: cleanup jobs, process-account-deletions
 */
export const BATCH_SIZE_LARGE = 50;

/**
 * Maximum retry attempts for webhook events
 */
export const MAX_WEBHOOK_RETRY_ATTEMPTS = 3;

/**
 * Retention periods in days
 */
export const RETENTION = {
	/** Grace period before GDPR account deletion is executed */
	GDPR_GRACE_PERIOD_DAYS: 30,

	/** Days to keep completed webhook events before cleanup */
	WEBHOOK_COMPLETED_DAYS: 90,

	/** Days to keep failed webhook events before cleanup */
	WEBHOOK_FAILED_DAYS: 180,

	/** Days to keep skipped webhook events before cleanup */
	WEBHOOK_SKIPPED_DAYS: 90,

	/** Years for legal data retention (French Commercial Code Art. L123-22) */
	LEGAL_RETENTION_YEARS: 10,

	/** Days to wait for newsletter confirmation before cleanup */
	NEWSLETTER_CONFIRMATION_DAYS: 7,
} as const;

/**
 * Time thresholds in milliseconds
 */
export const THRESHOLDS = {
	/** Time to wait after order creation before syncing async payments */
	ASYNC_PAYMENT_MIN_AGE_MS: 60 * 60 * 1000, // 1 hour

	/** Max age for async payment orders to check */
	ASYNC_PAYMENT_MAX_AGE_MS: 7 * 24 * 60 * 60 * 1000, // 7 days

	/** Time to wait before retrying failed webhooks */
	WEBHOOK_RETRY_MIN_AGE_MS: 30 * 60 * 1000, // 30 minutes

	/** Time to wait after refund processing before reconciliation */
	REFUND_RECONCILE_MIN_AGE_MS: 60 * 60 * 1000, // 1 hour
} as const;
