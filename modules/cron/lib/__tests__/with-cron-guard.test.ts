import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockVerifyCronRequest, mockSendAdminCronFailedAlert, mockLogger, mockSentry } = vi.hoisted(
	() => ({
		mockVerifyCronRequest: vi.fn(),
		mockSendAdminCronFailedAlert: vi.fn(),
		mockLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
		mockSentry: {
			withScope: vi.fn((cb: (scope: unknown) => void) =>
				cb({ setTag: vi.fn(), setFingerprint: vi.fn(), setLevel: vi.fn() }),
			),
			captureException: vi.fn(),
		},
	}),
);

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

		const handler = withCronGuard({ jobName: "test" }, async () => ({ ok: true }));
		const res = await handler();

		expect(res).toBe(blocked);
	});

	it("wraps a successful handler in cronSuccess with job name", async () => {
		const handler = withCronGuard({ jobName: "test" }, async () => ({ processed: 5 }));
		const res = await handler();
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body).toMatchObject({ success: true, job: "test", processed: 5 });
		expect(mockSendAdminCronFailedAlert).not.toHaveBeenCalled();
	});

	it("alerts admin when result reports errors > 0", async () => {
		const handler = withCronGuard({ jobName: "test" }, async () => ({
			processed: 5,
			errors: 2,
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
});
