import { describe, it, expect, vi, beforeEach } from "vitest";

const {
	mockVerifyCronRequest,
	mockSendAdminCronFailedAlert,
	mockLogger,
	mockSentry,
	spanSetAttribute,
} = vi.hoisted(() => {
	const spanSetAttribute = vi.fn();
	return {
		mockVerifyCronRequest: vi.fn(),
		mockSendAdminCronFailedAlert: vi.fn(),
		mockLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
		spanSetAttribute,
		mockSentry: {
			withScope: vi.fn((cb: (scope: unknown) => void) =>
				cb({ setTag: vi.fn(), setFingerprint: vi.fn(), setLevel: vi.fn() }),
			),
			captureException: vi.fn(),
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

import { withCronGuard } from "../with-cron-guard";

beforeEach(() => {
	vi.clearAllMocks();
	mockVerifyCronRequest.mockResolvedValue(null);
	mockSendAdminCronFailedAlert.mockResolvedValue(undefined);
});

describe("withCronGuard", () => {
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

	it("wraps a successful handler in cronSuccess with job name", async () => {
		const handler = withCronGuard({ jobName: "test" }, async () => ({
			processed: 5,
			errored: 0,
			skipped: 0,
		}));
		const res = await handler();
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body).toMatchObject({ success: true, job: "test", processed: 5 });
		expect(mockSendAdminCronFailedAlert).not.toHaveBeenCalled();
	});

	it("alerts admin when result reports errored > 0", async () => {
		const handler = withCronGuard({ jobName: "test" }, async () => ({
			processed: 5,
			errored: 2,
			skipped: 0,
		}));

		await handler();

		expect(mockSendAdminCronFailedAlert).toHaveBeenCalledWith(
			expect.objectContaining({ job: "test", errors: 2 }),
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
});
