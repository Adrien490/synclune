/**
 * Standardized cron job result shape.
 *
 * Used by all `modules/cron/services/*.service.ts` so that:
 * - `withCronGuard` can read uniform metrics (`errored`, `processed`) for Sentry
 *   span attributes and admin alert dispatch.
 * - Admin dashboards / monitoring can iterate over jobs without parsing
 *   per-job shapes.
 *
 * Each service may attach job-specific breakdown fields directly (e.g.
 * `sessionsDeleted`, `filesScanned`) — preserved at the top level for
 * consumers (admin email template, tests).
 */
export interface CronResult {
	/** Records the job acted on successfully (deleted, updated, anonymized, ...). */
	processed: number;
	/** Records the job failed to process (caught + logged exceptions). */
	errored: number;
	/** Records the job intentionally skipped (already processed, ineligible, deadline). */
	skipped: number;
	/** True when the bounded batch was fully consumed and more records remain. */
	hasMore?: boolean;
	/** Job-specific breakdown fields (sessionsDeleted, completedDeleted, etc.). */
	[key: string]: unknown;
}
