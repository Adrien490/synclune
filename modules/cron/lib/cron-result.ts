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
	/**
	 * When set, signals the job did not run (misconfiguration / dependency
	 * unavailable). `withCronGuard` uses this to skip the admin alert path —
	 * misconfig must be caught by boot env checks, not cron alerts.
	 */
	reason?: string;
	/** Job-specific breakdown fields (sessionsDeleted, completedDeleted, etc.). */
	[key: string]: unknown;
}

/**
 * Thrown by `paginateCursor` (and any cron-side helper that bounds wall-time)
 * when the per-run deadline is exceeded.
 *
 * `withCronGuard` catches this *separately* from generic errors:
 * - logs `warn` (not `error`)
 * - returns HTTP 200 with `deadlineExceeded: true, hasMore: true`
 * - does NOT send an admin alert
 *
 * Hitting the deadline is the *designed* behavior for jobs whose backlog
 * exceeds a single 60s Vercel function run; the next scheduled invocation
 * will resume where this one stopped.
 */
export class CronDeadlineExceededError extends Error {
	readonly partial: {
		processed: number;
		errored: number;
		skipped: number;
		step?: string;
		[key: string]: unknown;
	};

	constructor(
		message: string,
		partial: {
			processed: number;
			errored: number;
			skipped: number;
			step?: string;
			[key: string]: unknown;
		} = { processed: 0, errored: 0, skipped: 0 },
	) {
		super(message);
		this.name = "CronDeadlineExceededError";
		this.partial = partial;
	}
}
