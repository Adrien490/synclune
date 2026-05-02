import * as Sentry from "@sentry/nextjs";
import type { NextResponse } from "next/server";
import {
	verifyCronRequest,
	cronTimer,
	cronSuccess,
	cronError,
} from "@/modules/cron/lib/verify-cron";
import { sendAdminCronFailedAlert } from "@/modules/emails/services/admin-emails";
import { logger } from "@/shared/lib/logger";

type CronJobResult = { errors?: number; [key: string]: unknown };

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
 * - Wraps handler in try/catch with admin alert + Sentry fingerprint per job.
 * - Sends admin alert when result reports `errors > 0`.
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
		const unauthorized = await verifyCronRequest();
		if (unauthorized) return unauthorized;

		const startTime = cronTimer();
		try {
			const result = await fn();

			if (result === null) {
				return cronError(`${jobName}: misconfigured (handler returned null)`, 500, jobName);
			}

			if (typeof result.errors === "number" && result.errors > 0) {
				notifyAdmin(jobName, result.errors, result);
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
	};
}
