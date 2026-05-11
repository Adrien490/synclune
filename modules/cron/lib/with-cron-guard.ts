import * as Sentry from "@sentry/nextjs";
import type { NextResponse } from "next/server";
import {
	verifyCronRequest,
	cronTimer,
	cronSuccess,
	cronError,
} from "@/modules/cron/lib/verify-cron";
import type { CronResult } from "@/modules/cron/lib/cron-result";
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
 * - Sends admin alert when result reports `errored > 0`.
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
): () => Promise<NextResponse> {
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

					if (result.errored > 0) {
						notifyAdmin(jobName, result.errored, result);
					}

					return cronSuccess({ job: jobName, ...result }, startTime);
				} catch (error) {
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
