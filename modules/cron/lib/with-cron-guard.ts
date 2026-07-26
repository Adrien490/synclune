import * as Sentry from "@sentry/nextjs";
import { NextResponse, type NextResponse as NextResponseType } from "next/server";
import {
	verifyCronRequest,
	cronTimer,
	cronSuccess,
	cronError,
} from "@/modules/cron/lib/verify-cron";
import { CronDeadlineExceededError, type CronResult } from "@/modules/cron/lib/cron-result";
import { CRON_SCHEDULES } from "@/modules/cron/constants/schedules";
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
 * - MON-03 : émet un check-in Sentry Cron Monitoring (`in_progress` → `ok`/`error`)
 *   quand le job a un planning connu (SSOT `CRON_SCHEDULES`). Sentry alerte alors si
 *   un check-in attendu n'arrive pas (run manqué) — détecte un cron que Vercel a
 *   cessé d'invoquer, sinon totalement silencieux. No-op si Sentry DSN absent.
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
 *   jobName: "reopen-store",
 *   defaultErrorMessage: "Failed to auto-reopen store",
 * }, () => autoReopenIfDue());
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

		// OPS-AUDIT-006 : CRON_DRY_RUN short-circuits every cron with a
		// `skipped` result so staging Preview deployments can validate that
		// crons authenticate + boot without mutating the DB. Mitigates the
		// risk that a leaked `CRON_SECRET` against a Preview branch with
		// shared prod credentials triggers destructive cleanups.
		if (process.env.CRON_DRY_RUN === "true") {
			logger.warn(`Cron ${jobName} short-circuited by CRON_DRY_RUN=true`, {
				cronJob: jobName,
			});
			return cronSuccess(
				{
					job: jobName,
					status: "skipped",
					processed: 0,
					errored: 0,
					skipped: 1,
					reason: "CRON_DRY_RUN",
				},
				cronTimer(),
			);
		}

		// MON-03 — Sentry Cron Monitoring (heartbeat). Si le job a un planning connu
		// (SSOT CRON_SCHEDULES, synchronisé avec vercel.json), on émet un check-in
		// `in_progress` au début puis `ok`/`error` à la fin. Sentry connaît le crontab
		// attendu et alerte si un check-in n'arrive pas (run manqué) → détecte un cron
		// que Vercel a cessé d'invoquer (sinon silencieux). No-op si DSN absent.
		const schedule = CRON_SCHEDULES[jobName];
		const monitorConfig = schedule
			? {
					schedule: { type: "crontab" as const, value: schedule },
					checkinMargin: 10, // minutes de grâce avant de considérer le run manqué
					maxRuntime: 5, // minutes (maxDuration route = 60s, large marge)
					timezone: "Etc/UTC", // Vercel Cron s'exécute en UTC
				}
			: undefined;
		const checkInId = monitorConfig
			? Sentry.captureCheckIn({ monitorSlug: jobName, status: "in_progress" }, monitorConfig)
			: undefined;
		let monitorStatus: "ok" | "error" = "ok";

		const startTime = cronTimer();
		// Le callback du span capture TOUTES les erreurs et renvoie une réponse — il ne
		// throw jamais — donc on peut lire `monitorStatus` après sa résolution.
		const response = await Sentry.startSpan(
			{ name: `cron.${jobName}`, op: "cron", attributes: { jobName } },
			async (span) => {
				try {
					const result = await fn();

					if (result === null) {
						span.setAttribute("result", "misconfigured");
						monitorStatus = "error";
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
						monitorStatus = "error";
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

					monitorStatus = "error";
					return cronError(userMessage);
				}
			},
		);

		// MON-03 : check-in de clôture (ok/error selon le résultat du run).
		if (checkInId && monitorConfig) {
			Sentry.captureCheckIn(
				{ checkInId, monitorSlug: jobName, status: monitorStatus },
				monitorConfig,
			);
		}

		return response;
	};
}
