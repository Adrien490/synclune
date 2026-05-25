import * as Sentry from "@sentry/nextjs";
import { NextResponse, type NextResponse as NextResponseType } from "next/server";
import {
	verifyCronRequest,
	cronTimer,
	cronSuccess,
	cronError,
} from "@/modules/cron/lib/verify-cron";
import { CronDeadlineExceededError, type CronResult } from "@/modules/cron/lib/cron-result";
import { sendAdminCronFailedAlert } from "@/modules/emails/services/admin-emails";
import { logger } from "@/shared/lib/logger";

type CronJobResult = CronResult;

interface CronGuardOptions {
	jobName: string;
	defaultErrorMessage?: string;
}

function notifyAdmin(jobName: string, errors: number, details: Record<string, unknown>): void {
	sendAdminCronFailedAlert({ job: jobName, errors, details }).catch((e) =>
		logger.error(`Cron ${jobName} failed to send admin alert`, e, { cronJob: jobName }),
	);
}

/**
 * Unified guard for Vercel cron route handlers.
 *
 * - Verifies CRON_SECRET (timing-safe).
 * - Opens a Sentry latency span (`cron.<jobName>`) with processed/errored/duration attributes.
 * - Wraps handler in try/catch with admin alert + Sentry fingerprint per job.
 * - HTTP status codes :
 *     - 200 when fully successful, deadline-exceeded (resumable), or skipped (config).
 *     - 207 (Multi-Status) when partial : `errored > 0 && processed > 0`.
 *     - 500 when fully failed : `errored > 0 && processed === 0`, or uncaught throw.
 * - Admin alert is sent when `result.errored > 0` OR on uncaught error.
 *   It is NOT sent on `CronDeadlineExceededError` (expected) nor when
 *   `result.reason` is set (misconfiguration — boot env checks own that).
 *
 * Usage:
 * ```ts
 * export const GET = withCronGuard({
 *   jobName: "cleanup-sessions",
 *   defaultErrorMessage: "Failed to cleanup sessions",
 * }, () => cleanupExpiredSessions());
 * ```
 */
export function withCronGuard<R extends CronJobResult | null>(
	options: CronGuardOptions,
	fn: () => Promise<R>,
): () => Promise<NextResponseType> {
	const { jobName, defaultErrorMessage } = options;

	return async () => {
		const unauthorized = await verifyCronRequest(jobName);
		if (unauthorized) return unauthorized;

		const startTime = cronTimer();
		return Sentry.startSpan(
			{ name: `cron.${jobName}`, op: "cron", attributes: { jobName } },
			async (span) => {
				try {
					const result = await fn();

					if (result === null) {
						span.setAttribute("result", "misconfigured");
						return cronError(`${jobName}: misconfigured (handler returned null)`, 500, jobName);
					}

					span.setAttribute("processed_count", result.processed);
					span.setAttribute("errored_count", result.errored);
					span.setAttribute("skipped_count", result.skipped);
					span.setAttribute("duration_ms", Date.now() - startTime);

					// Misconfiguration: service short-circuited because a dependency is
					// not available (e.g. STRIPE_SECRET_KEY). Boot env validation owns
					// this — do not alert and do not 500.
					if (result.reason) {
						span.setAttribute("result", "skipped");
						span.setAttribute("reason", result.reason);
						logger.warn(`Cron ${jobName} skipped`, {
							cronJob: jobName,
							reason: result.reason,
						});
						return cronSuccess({ job: jobName, status: "skipped", ...result }, startTime);
					}

					if (result.errored > 0) {
						notifyAdmin(jobName, result.errored, result);
					}

					if (result.errored > 0 && result.processed === 0) {
						span.setAttribute("result", "failed");
						return NextResponse.json(
							{
								success: false,
								job: jobName,
								status: "failed",
								timestamp: new Date().toISOString(),
								durationMs: Date.now() - startTime,
								...result,
							},
							{ status: 500 },
						);
					}

					if (result.errored > 0) {
						span.setAttribute("result", "partial");
						return NextResponse.json(
							{
								success: true,
								job: jobName,
								status: "partial",
								timestamp: new Date().toISOString(),
								durationMs: Date.now() - startTime,
								...result,
							},
							{ status: 207 },
						);
					}

					span.setAttribute("result", "success");
					return cronSuccess({ job: jobName, status: "success", ...result }, startTime);
				} catch (error) {
					// Deadline = designed behavior, NOT an alert-worthy failure.
					if (error instanceof CronDeadlineExceededError) {
						span.setAttribute("result", "deadline-exceeded");
						span.setAttribute("duration_ms", Date.now() - startTime);
						span.setAttribute("processed_count", error.partial.processed);
						span.setAttribute("errored_count", error.partial.errored);
						span.setAttribute("skipped_count", error.partial.skipped);
						logger.warn(`Cron ${jobName} hit deadline, will resume next run`, {
							cronJob: jobName,
							step: error.partial.step,
							processed: error.partial.processed,
						});
						return cronSuccess(
							{
								job: jobName,
								status: "deadline-exceeded",
								deadlineExceeded: true,
								hasMore: true,
								...error.partial,
							},
							startTime,
						);
					}

					const message = error instanceof Error ? error.message : String(error);
					const userMessage =
						error instanceof Error ? error.message : (defaultErrorMessage ?? "Cron failed");

					Sentry.withScope((scope) => {
						scope.setTag("cronJob", jobName);
						scope.setFingerprint(["cron", jobName]);
						scope.setLevel("error");
						Sentry.captureException(error instanceof Error ? error : new Error(message));
					});

					notifyAdmin(jobName, 1, { error: message });

					return cronError(userMessage);
				}
			},
		);
	};
}
