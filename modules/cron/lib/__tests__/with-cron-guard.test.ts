import { describe, it, expect, vi, beforeEach } from "vitest";

const {
	mockVerifyCronRequest,
	mockSendAdminCronFailedAlert,
	mockLogger,
	mockSentry,
	mockCheckRateLimit,
	spanSetAttribute,
} = vi.hoisted(() => {
	const spanSetAttribute = vi.fn();
	return {
		mockVerifyCronRequest: vi.fn(),
		mockSendAdminCronFailedAlert: vi.fn(),
		mockCheckRateLimit: vi.fn(),
		mockLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
		spanSetAttribute,
		mockSentry: {
			withScope: vi.fn((cb: (scope: unknown) => void) =>
				cb({ setTag: vi.fn(), setFingerprint: vi.fn(), setLevel: vi.fn() }),
			),
			captureException: vi.fn(),
			captureCheckIn: vi.fn(() => "checkin-id-123"),
			startSpan: vi.fn(
				async (
					_options: unknown,
					cb: (span: { setAttribute: typeof spanSetAttribute }) => unknown,
				) => cb({ setAttribute: spanSetAttribute }),
			),
		},
	};
});

import type * as VerifyCronModule from "@/modules/cron/lib/verify-cron";

vi.mock("@/modules/cron/lib/verify-cron", async () => {
	const actual = await vi.importActual<typeof VerifyCronModule>("@/modules/cron/lib/verify-cron");
	return {
		...actual,
		verifyCronRequest: mockVerifyCronRequest,
	};
});

vi.mock("@/modules/emails/services/admin-emails", () => ({
	sendAdminCronFailedAlert: mockSendAdminCronFailedAlert,
}));

vi.mock("@/shared/lib/logger", () => ({ logger: mockLogger }));

vi.mock("@sentry/nextjs", () => mockSentry);

// Plafond de coût posé AVANT la vérification du secret : un flot non authentifié
// démarrait la lambda sans compteur, et un `CRON_SECRET` fuité donnait une
// invocation illimitée des jobs destructifs. Audit rate limiting 2026-07-31.
vi.mock("next/headers", () => ({ headers: vi.fn(async () => new Headers()) }));
vi.mock("@/shared/lib/rate-limit", () => ({
	checkRateLimit: mockCheckRateLimit,
	getClientIp: vi.fn(async () => "10.0.0.1"),
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	CRON_INVOKE_LIMIT: { name: "cron-invoke", limit: 10, windowMs: 60_000 },
}));

import { withCronGuard } from "../with-cron-guard";
import { CronDeadlineExceededError } from "../cron-result";

beforeEach(() => {
	vi.clearAllMocks();
	mockVerifyCronRequest.mockResolvedValue(null);
	mockSendAdminCronFailedAlert.mockResolvedValue(undefined);
	mockCheckRateLimit.mockResolvedValue({ success: true, remaining: 9, limit: 10, reset: 0 });
});

describe("withCronGuard", () => {
	describe("rate limiting", () => {
		it("renvoie 429 + Retry-After et n'exécute NI la garde du secret NI le handler", async () => {
			mockCheckRateLimit.mockResolvedValue({
				success: false,
				remaining: 0,
				limit: 10,
				reset: 0,
				retryAfter: 42,
			});
			const fn = vi.fn();

			const response = await withCronGuard({ jobName: "test" }, fn)();

			expect(response.status).toBe(429);
			expect(response.headers.get("Retry-After")).toBe("42");
			expect(fn).not.toHaveBeenCalled();
			// Le plafond de COÛT précède la garde d'autorisation : c'est tout l'intérêt,
			// un flot de 401 démarrait la lambda sans être compté.
			expect(mockVerifyCronRequest).not.toHaveBeenCalled();
		});

		it("passe l'IP en 3ᵉ argument (sinon plafond global et blacklist inertes)", async () => {
			await withCronGuard({ jobName: "test" }, async () => ({
				processed: 0,
				errored: 0,
				skipped: 0,
			}))();

			expect(mockCheckRateLimit).toHaveBeenCalledWith(
				"cron-invoke:10.0.0.1",
				expect.objectContaining({ name: "cron-invoke" }),
				"10.0.0.1",
			);
		});
	});

	it("returns the unauthorized response when verifyCronRequest blocks", async () => {
		const blocked = new Response("nope", { status: 401 });
		mockVerifyCronRequest.mockResolvedValueOnce(blocked);

		const handler = withCronGuard({ jobName: "test" }, async () => ({
			processed: 0,
			errored: 0,
			skipped: 0,
		}));
		const res = await handler();

		expect(res).toBe(blocked);
	});

	it("wraps a successful handler in cronSuccess with job name and status: success", async () => {
		const handler = withCronGuard({ jobName: "test" }, async () => ({
			processed: 5,
			errored: 0,
			skipped: 0,
		}));
		const res = await handler();
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body).toMatchObject({
			success: true,
			job: "test",
			status: "success",
			processed: 5,
		});
		expect(mockSendAdminCronFailedAlert).not.toHaveBeenCalled();
		expect(spanSetAttribute).toHaveBeenCalledWith("result", "success");
	});

	it("returns HTTP 207 with status: partial when errored > 0 and processed > 0", async () => {
		const handler = withCronGuard({ jobName: "test" }, async () => ({
			processed: 5,
			errored: 2,
			skipped: 0,
		}));
		const res = await handler();
		const body = await res.json();

		expect(res.status).toBe(207);
		expect(body).toMatchObject({
			success: true,
			job: "test",
			status: "partial",
			processed: 5,
			errored: 2,
		});
		expect(mockSendAdminCronFailedAlert).toHaveBeenCalledWith(
			expect.objectContaining({ job: "test", errors: 2 }),
		);
		expect(spanSetAttribute).toHaveBeenCalledWith("result", "partial");
	});

	it("returns HTTP 500 with status: failed when errored > 0 and processed === 0", async () => {
		const handler = withCronGuard({ jobName: "test" }, async () => ({
			processed: 0,
			errored: 3,
			skipped: 0,
		}));
		const res = await handler();
		const body = await res.json();

		expect(res.status).toBe(500);
		expect(body).toMatchObject({
			success: false,
			job: "test",
			status: "failed",
			processed: 0,
			errored: 3,
		});
		expect(mockSendAdminCronFailedAlert).toHaveBeenCalledWith(
			expect.objectContaining({ job: "test", errors: 3 }),
		);
		expect(spanSetAttribute).toHaveBeenCalledWith("result", "failed");
	});

	it("returns HTTP 200 with status: skipped and DOES NOT alert when result.reason is set", async () => {
		const handler = withCronGuard({ jobName: "test" }, async () => ({
			processed: 0,
			errored: 0,
			skipped: 1,
			reason: "STRIPE_KEY_MISSING",
		}));
		const res = await handler();
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body).toMatchObject({
			success: true,
			job: "test",
			status: "skipped",
			reason: "STRIPE_KEY_MISSING",
		});
		expect(mockSendAdminCronFailedAlert).not.toHaveBeenCalled();
		expect(mockSentry.captureException).not.toHaveBeenCalled();
		expect(spanSetAttribute).toHaveBeenCalledWith("result", "skipped");
		expect(spanSetAttribute).toHaveBeenCalledWith("reason", "STRIPE_KEY_MISSING");
		expect(mockLogger.warn).toHaveBeenCalledWith(
			expect.stringContaining("skipped"),
			expect.objectContaining({ cronJob: "test", reason: "STRIPE_KEY_MISSING" }),
		);
	});

	it("handles CronDeadlineExceededError: HTTP 200 + hasMore + NO admin alert", async () => {
		const handler = withCronGuard({ jobName: "test" }, async () => {
			throw new CronDeadlineExceededError("Deadline exceeded during test scan", {
				processed: 12,
				errored: 0,
				skipped: 3,
				step: "scan",
				filesScanned: 500,
			});
		});
		const res = await handler();
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body).toMatchObject({
			success: true,
			job: "test",
			status: "deadline-exceeded",
			deadlineExceeded: true,
			hasMore: true,
			processed: 12,
			skipped: 3,
			filesScanned: 500,
		});
		expect(mockSendAdminCronFailedAlert).not.toHaveBeenCalled();
		expect(mockSentry.captureException).not.toHaveBeenCalled();
		expect(spanSetAttribute).toHaveBeenCalledWith("result", "deadline-exceeded");
		expect(spanSetAttribute).toHaveBeenCalledWith("processed_count", 12);
		expect(mockLogger.warn).toHaveBeenCalledWith(
			expect.stringContaining("hit deadline"),
			expect.objectContaining({ cronJob: "test", step: "scan" }),
		);
	});

	it("captures Sentry with cronJob fingerprint and alerts admin on throw", async () => {
		const handler = withCronGuard({ jobName: "test", defaultErrorMessage: "Failed" }, async () => {
			throw new Error("boom");
		});

		const res = await handler();

		expect(res.status).toBe(500);
		expect(mockSentry.withScope).toHaveBeenCalled();
		expect(mockSentry.captureException).toHaveBeenCalled();
		expect(mockSendAdminCronFailedAlert).toHaveBeenCalledWith(
			expect.objectContaining({ job: "test", errors: 1 }),
		);
	});

	it("returns cronError when handler returns null (misconfiguration)", async () => {
		const handler = withCronGuard({ jobName: "test" }, async () => null);
		const res = await handler();
		const body = await res.json();

		expect(res.status).toBe(500);
		expect(body.success).toBe(false);
	});

	it("opens a Sentry span with processed/errored/duration attributes", async () => {
		const handler = withCronGuard({ jobName: "test" }, async () => ({
			processed: 7,
			errored: 2,
			skipped: 0,
		}));

		await handler();

		expect(mockSentry.startSpan).toHaveBeenCalledWith(
			expect.objectContaining({ name: "cron.test", op: "cron" }),
			expect.any(Function),
		);
		expect(spanSetAttribute).toHaveBeenCalledWith("processed_count", 7);
		expect(spanSetAttribute).toHaveBeenCalledWith("errored_count", 2);
		expect(spanSetAttribute).toHaveBeenCalledWith("duration_ms", expect.any(Number));
	});

	// ========================================================================
	// MON-03 — Sentry Cron Monitoring heartbeat
	// ========================================================================
	describe("Sentry cron heartbeat (MON-03)", () => {
		// Job réel présent dans CRON_SCHEDULES **et** dans SENTRY_MONITORED_CRONS.
		// Les deux conditions sont requises depuis l'audit coûts P2-1 : Sentry
		// facture par monitor, seuls les jobs revenue/légal en obtiennent un.
		const SCHEDULED_JOB = "reconcile-invoices";

		/** Job planifié mais volontairement NON monitoré (catégorie ops). */
		const UNMONITORED_JOB = "reopen-store";

		it("émet in_progress puis ok sur un run réussi d'un job planifié", async () => {
			const handler = withCronGuard({ jobName: SCHEDULED_JOB }, async () => ({
				processed: 1,
				errored: 0,
				skipped: 0,
			}));

			await handler();

			expect(mockSentry.captureCheckIn).toHaveBeenCalledWith(
				{ monitorSlug: SCHEDULED_JOB, status: "in_progress" },
				expect.objectContaining({ schedule: { type: "crontab", value: expect.any(String) } }),
			);
			expect(mockSentry.captureCheckIn).toHaveBeenCalledWith(
				{ checkInId: "checkin-id-123", monitorSlug: SCHEDULED_JOB, status: "ok" },
				expect.anything(),
			);
		});

		it("clôture en status=error quand le run échoue totalement (errored>0, processed=0)", async () => {
			const handler = withCronGuard({ jobName: SCHEDULED_JOB }, async () => ({
				processed: 0,
				errored: 3,
				skipped: 0,
			}));

			await handler();

			expect(mockSentry.captureCheckIn).toHaveBeenCalledWith(
				{ checkInId: "checkin-id-123", monitorSlug: SCHEDULED_JOB, status: "error" },
				expect.anything(),
			);
		});

		it("n'émet AUCUN check-in pour un job sans planning connu", async () => {
			const handler = withCronGuard({ jobName: "test" }, async () => ({
				processed: 1,
				errored: 0,
				skipped: 0,
			}));

			await handler();

			expect(mockSentry.captureCheckIn).not.toHaveBeenCalled();
		});

		/**
		 * Audit coûts P2-1 : le monitoring cron Sentry est facturé PAR MONITOR
		 * (plan Developer : 1 inclus). Émettre un check-in pour les 11 jobs
		 * réclamait 11 monitors — au-delà du quota, Sentry rejette les check-ins
		 * surnuméraires et l'alerte « run manqué » ne fonctionne plus de façon
		 * fiable sur AUCUN job. Un monitoring qu'on croit actif est pire que pas
		 * de monitoring du tout.
		 */
		it("n'émet aucun check-in pour un job planifié mais hors périmètre monitoré", async () => {
			const handler = withCronGuard({ jobName: UNMONITORED_JOB }, async () => ({
				processed: 1,
				errored: 0,
				skipped: 0,
			}));

			await handler();

			expect(mockSentry.captureCheckIn).not.toHaveBeenCalled();
		});

		it("garde la capture d'exception sur un job non monitoré", async () => {
			// Le retrait du monitor ne doit PAS aveugler Sentry sur les erreurs :
			// seule la détection de run manqué est abandonnée.
			const handler = withCronGuard({ jobName: UNMONITORED_JOB }, async () => {
				throw new Error("boom");
			});

			await handler();

			expect(mockSentry.captureException).toHaveBeenCalled();
		});
	});
});
