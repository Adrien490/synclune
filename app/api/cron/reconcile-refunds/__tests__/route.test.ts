import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockVerifyCronRequest,
	mockCronTimer,
	mockCronSuccess,
	mockCronError,
	mockReconcilePendingRefunds,
	mockSendAdminCronFailedAlert,
} = vi.hoisted(() => ({
	mockVerifyCronRequest: vi.fn(),
	mockCronTimer: vi.fn(),
	mockCronSuccess: vi.fn(),
	mockCronError: vi.fn(),
	mockReconcilePendingRefunds: vi.fn(),
	mockSendAdminCronFailedAlert: vi.fn(),
}));

vi.mock("@/modules/cron/lib/verify-cron", () => ({
	verifyCronRequest: mockVerifyCronRequest,
	cronTimer: mockCronTimer,
	cronSuccess: mockCronSuccess,
	cronError: mockCronError,
}));

vi.mock("@/modules/cron/services/reconcile-refunds.service", () => ({
	reconcilePendingRefunds: mockReconcilePendingRefunds,
}));

vi.mock("@/modules/emails/services/admin-emails", () => ({
	sendAdminCronFailedAlert: mockSendAdminCronFailedAlert,
}));

import { GET, maxDuration } from "../route";

// ============================================================================
// Helpers
// ============================================================================

function makeUnauthorizedResponse() {
	return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
}

function makeSuccessResponse(data: Record<string, unknown>) {
	return new Response(JSON.stringify({ success: true, ...data }), { status: 200 });
}

function makeErrorResponse(message: string) {
	return new Response(JSON.stringify({ success: false, error: message }), { status: 500 });
}

const DEFAULT_SERVICE_RESULT = {
	checked: 8,
	updated: 1,
	staleAlerted: 0,
	errors: 0,
};

// ============================================================================
// Tests: maxDuration export
// ============================================================================

describe("maxDuration", () => {
	it("is exported as 60", () => {
		expect(maxDuration).toBe(60);
	});
});

// ============================================================================
// Tests: GET handler
// ============================================================================

describe("GET /api/cron/reconcile-refunds", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		mockVerifyCronRequest.mockResolvedValue(null);
		mockCronTimer.mockReturnValue(1000);
		mockReconcilePendingRefunds.mockResolvedValue(DEFAULT_SERVICE_RESULT);
		mockSendAdminCronFailedAlert.mockResolvedValue(undefined);
		mockCronSuccess.mockImplementation((data: Record<string, unknown>) =>
			makeSuccessResponse(data)
		);
		mockCronError.mockImplementation((message: string) => makeErrorResponse(message));
	});

	describe("authorization", () => {
		it("returns the unauthorized response immediately when verifyCronRequest returns a response", async () => {
			const unauthorizedResponse = makeUnauthorizedResponse();
			mockVerifyCronRequest.mockResolvedValue(unauthorizedResponse);

			const result = await GET();

			expect(result).toBe(unauthorizedResponse);
		});

		it("does not call reconcilePendingRefunds when unauthorized", async () => {
			mockVerifyCronRequest.mockResolvedValue(makeUnauthorizedResponse());

			await GET();

			expect(mockReconcilePendingRefunds).not.toHaveBeenCalled();
		});

		it("proceeds to the service when verifyCronRequest returns null", async () => {
			mockVerifyCronRequest.mockResolvedValue(null);

			await GET();

			expect(mockReconcilePendingRefunds).toHaveBeenCalledOnce();
		});
	});

	describe("Stripe config check", () => {
		it("returns cronError when service returns null (STRIPE_SECRET_KEY not configured)", async () => {
			mockReconcilePendingRefunds.mockResolvedValue(null);

			await GET();

			expect(mockCronError).toHaveBeenCalledWith("STRIPE_SECRET_KEY not configured");
		});

		it("does not call cronSuccess when service returns null", async () => {
			mockReconcilePendingRefunds.mockResolvedValue(null);

			await GET();

			expect(mockCronSuccess).not.toHaveBeenCalled();
		});

		it("does not send admin alert when service returns null", async () => {
			mockReconcilePendingRefunds.mockResolvedValue(null);

			await GET();

			expect(mockSendAdminCronFailedAlert).not.toHaveBeenCalled();
		});
	});

	describe("successful execution", () => {
		it("calls reconcilePendingRefunds", async () => {
			await GET();

			expect(mockReconcilePendingRefunds).toHaveBeenCalledOnce();
		});

		it("calls cronTimer to capture start time", async () => {
			await GET();

			expect(mockCronTimer).toHaveBeenCalledOnce();
		});

		it("calls cronSuccess with the job name and service result", async () => {
			await GET();

			expect(mockCronSuccess).toHaveBeenCalledWith(
				expect.objectContaining({
					job: "reconcile-refunds",
					checked: DEFAULT_SERVICE_RESULT.checked,
					updated: DEFAULT_SERVICE_RESULT.updated,
					staleAlerted: DEFAULT_SERVICE_RESULT.staleAlerted,
					errors: DEFAULT_SERVICE_RESULT.errors,
				}),
				1000
			);
		});

		it("includes the job name 'reconcile-refunds' in the success response data", async () => {
			await GET();

			const [data] = mockCronSuccess.mock.calls[0];
			expect(data.job).toBe("reconcile-refunds");
		});

		it("passes startTime from cronTimer to cronSuccess", async () => {
			mockCronTimer.mockReturnValue(1357);

			await GET();

			const [, startTime] = mockCronSuccess.mock.calls[0];
			expect(startTime).toBe(1357);
		});

		it("does not send admin alert when errors is 0", async () => {
			mockReconcilePendingRefunds.mockResolvedValue({
				...DEFAULT_SERVICE_RESULT,
				errors: 0,
			});

			await GET();

			expect(mockSendAdminCronFailedAlert).not.toHaveBeenCalled();
		});
	});

	describe("admin alert on errors", () => {
		it("sends admin alert when result.errors > 0", async () => {
			mockReconcilePendingRefunds.mockResolvedValue({
				checked: 8,
				updated: 1,
				staleAlerted: 2,
				errors: 3,
			});

			await GET();

			expect(mockSendAdminCronFailedAlert).toHaveBeenCalledWith(
				expect.objectContaining({
					job: "reconcile-refunds",
					errors: 3,
				})
			);
		});

		it("includes checked, updated and staleAlerted in the alert details", async () => {
			mockReconcilePendingRefunds.mockResolvedValue({
				checked: 8,
				updated: 2,
				staleAlerted: 1,
				errors: 1,
			});

			await GET();

			expect(mockSendAdminCronFailedAlert).toHaveBeenCalledWith(
				expect.objectContaining({
					details: expect.objectContaining({
						checked: 8,
						updated: 2,
						staleAlerted: 1,
					}),
				})
			);
		});

		it("still returns cronSuccess even when admin alert is sent", async () => {
			mockReconcilePendingRefunds.mockResolvedValue({
				checked: 8,
				updated: 1,
				staleAlerted: 0,
				errors: 1,
			});

			await GET();

			expect(mockCronSuccess).toHaveBeenCalledOnce();
		});
	});

	describe("error handling", () => {
		it("calls cronError when reconcilePendingRefunds throws", async () => {
			mockReconcilePendingRefunds.mockRejectedValue(new Error("Stripe API unavailable"));

			await GET();

			expect(mockCronError).toHaveBeenCalledWith("Stripe API unavailable");
		});

		it("uses the error message when an Error instance is thrown", async () => {
			mockReconcilePendingRefunds.mockRejectedValue(new Error("Prisma timeout"));

			await GET();

			expect(mockCronError).toHaveBeenCalledWith("Prisma timeout");
		});

		it("uses fallback message when a non-Error value is thrown", async () => {
			mockReconcilePendingRefunds.mockRejectedValue("unexpected string error");

			await GET();

			expect(mockCronError).toHaveBeenCalledWith("Failed to reconcile refunds");
		});

		it("uses fallback message when null is thrown", async () => {
			mockReconcilePendingRefunds.mockRejectedValue(null);

			await GET();

			expect(mockCronError).toHaveBeenCalledWith("Failed to reconcile refunds");
		});

		it("does not call cronSuccess when the service throws", async () => {
			mockReconcilePendingRefunds.mockRejectedValue(new Error("fail"));

			await GET();

			expect(mockCronSuccess).not.toHaveBeenCalled();
		});
	});
});
