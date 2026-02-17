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
 * Used by: sync-async-payments, reconcile-refunds, process-account-deletions, review-request-emails
 */
export const BATCH_SIZE_MEDIUM = 25;

/**
 * Large batch size for pure database operations
 * Used by: cleanup jobs, hard-delete-retention
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

	/** Days to keep stale PROCESSING/PENDING webhook events before cleanup */
	WEBHOOK_STALE_DAYS: 90,

	/** Years for legal data retention (French Commercial Code Art. L123-22) */
	LEGAL_RETENTION_YEARS: 10,

	/** Days to wait for newsletter confirmation before cleanup */
	NEWSLETTER_CONFIRMATION_DAYS: 7,
} as const;

/**
 * Per-call timeout for Stripe API calls in cron jobs (ms)
 * Prevents a single slow Stripe call from blocking the entire batch
 */
export const STRIPE_TIMEOUT_MS = 5_000;

/**
 * Global deadline for batch processing in cron jobs (ms)
 * Leaves a 10s safety margin before the 60s Vercel function timeout.
 * Jobs check this deadline before each iteration and stop early if exceeded.
 */
export const BATCH_DEADLINE_MS = 50_000;

/**
 * Maximum records to delete/update in a single cleanup operation
 * Prevents long-running queries on accumulated data
 */
export const CLEANUP_DELETE_LIMIT = 1_000;

/**
 * UploadThing API page size limit for listFiles
 */
export const UPLOADTHING_LIST_LIMIT = 500;

/**
 * Maximum UploadThing pages to scan per run (5 pages x 500 = 2500 files max)
 * Prevents Vercel function timeout on large file stores
 */
export const MAX_PAGES_PER_RUN = 5;

/**
 * Batch size for paginated DB queries when loading referenced media keys
 */
export const DB_QUERY_BATCH_SIZE = 500;

/**
 * Time thresholds in milliseconds
 */
export const THRESHOLDS = {
	/** Time to wait after order creation before syncing async payments */
	ASYNC_PAYMENT_MIN_AGE_MS: 60 * 60 * 1000, // 1 hour

	/** Max age for async payment orders to check (SEPA can take up to 10 business days) */
	ASYNC_PAYMENT_MAX_AGE_MS: 10 * 24 * 60 * 60 * 1000, // 10 days

	/** Time to wait before retrying failed webhooks */
	WEBHOOK_RETRY_MIN_AGE_MS: 30 * 60 * 1000, // 30 minutes

	/** Time to wait after refund processing before reconciliation */
	REFUND_RECONCILE_MIN_AGE_MS: 60 * 60 * 1000, // 1 hour
} as const;
