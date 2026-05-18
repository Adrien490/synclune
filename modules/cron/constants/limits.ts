/**
 * Cron job batch limits and configuration
 *
 * These limits are set to:
 * 1. Prevent timeouts (Vercel functions have max 60s execution time)
 * 2. Avoid overwhelming external APIs (Stripe rate limits)
 * 3. Keep database load manageable
 */

/**
 * Medium batch size for mixed operations
 * Used by: sync-async-payments, process-account-deletions
 */
export const BATCH_SIZE_MEDIUM = 25;

/**
 * Large batch size for pure database operations
 * Used by: cleanup jobs, hard-delete-retention
 */
export const BATCH_SIZE_LARGE = 50;

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
} as const;

/**
 * Per-call timeout for Stripe API calls in cron jobs (ms)
 * Prevents a single slow Stripe call from blocking the entire batch
 */
export const STRIPE_TIMEOUT_MS = 5_000;

/**
 * Delay between consecutive Stripe API calls in batch cron jobs (ms)
 * Prevents hitting Stripe's rate limit (100 req/s) during large batches
 */
export const STRIPE_THROTTLE_MS = 20;

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

	/** Time after which a PENDING refund without stripeRefundId is considered stale */
	REFUND_STALE_PENDING_MS: 48 * 60 * 60 * 1000, // 48 hours

	/** Orders left PENDING+UNPAID with no PaymentIntent (abandoned checkouts) past this age are auto-cancelled */
	PENDING_ORDER_TIMEOUT_MS: 24 * 60 * 60 * 1000, // 24 hours

	/** PROCESSING+PAID orders not yet shipped past this age trigger a stuck-orders alert */
	STUCK_PROCESSING_MS: 7 * 24 * 60 * 60 * 1000, // 7 days

	/** SHIPPED orders not yet DELIVERED past this age trigger a stuck-orders alert */
	STUCK_SHIPPED_MS: 14 * 24 * 60 * 60 * 1000, // 14 days

	/** Délai après livraison avant d'envoyer la demande d'avis (laisse le temps d'essayer la pièce) */
	REVIEW_REQUEST_DELAY_MS: 7 * 24 * 60 * 60 * 1000, // 7 days
} as const;
