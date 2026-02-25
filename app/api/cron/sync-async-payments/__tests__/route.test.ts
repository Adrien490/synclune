import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockVerifyCronRequest,
	mockCronTimer,
	mockCronSuccess,
	mockCronError,
	mockSyncAsyncPayments,
	mockSendAdminCronFailedAlert,
} = vi.hoisted(() => ({
	mockVerifyCronRequest: vi.fn(),
	mockCronTimer: vi.fn(),
	mockCronSuccess: vi.fn(),
	mockCronError: vi.fn(),
	mockSyncAsyncPayments: vi.fn(),
	mockSendAdminCronFailedAlert: vi.fn(),
}));

vi.mock("@/modules/cron/lib/verify-cron", () => ({
	verifyCronRequest: mockVerifyCronRequest,
	cronTimer: mockCronTimer,
	cronSuccess: mockCronSuccess,
	cronError: mockCronError,
}));

vi.mock("@/modules/cron/services/sync-async-payments.service", () => ({
	syncAsyncPayments: mockSyncAsyncPayments,
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
	checked: 10,
	updated: 2,
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

describe("GET /api/cron/sync-async-payments", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		mockVerifyCronRequest.mockResolvedValue(null);
		mockCronTimer.mockReturnValue(1000);
		mockSyncAsyncPayments.mockResolvedValue(DEFAULT_SERVICE_RESULT);
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

		it("does not call syncAsyncPayments when unauthorized", async () => {
			mockVerifyCronRequest.mockResolvedValue(makeUnauthorizedResponse());

			await GET();

			expect(mockSyncAsyncPayments).not.toHaveBeenCalled();
		});

		it("proceeds to the service when verifyCronRequest returns null", async () => {
			mockVerifyCronRequest.mockResolvedValue(null);

			await GET();

			expect(mockSyncAsyncPayments).toHaveBeenCalledOnce();
		});
	});

	describe("Stripe config check", () => {
		it("returns cronError when service returns null (STRIPE_SECRET_KEY not configured)", async () => {
			mockSyncAsyncPayments.mockResolvedValue(null);

			await GET();

			expect(mockCronError).toHaveBeenCalledWith("STRIPE_SECRET_KEY not configured");
		});

		it("does not call cronSuccess when service returns null", async () => {
			mockSyncAsyncPayments.mockResolvedValue(null);

			await GET();

			expect(mockCronSuccess).not.toHaveBeenCalled();
		});
	});

	describe("successful execution", () => {
		it("calls syncAsyncPayments", async () => {
			await GET();

			expect(mockSyncAsyncPayments).toHaveBeenCalledOnce();
		});

		it("calls cronTimer to capture start time", async () => {
			await GET();

			expect(mockCronTimer).toHaveBeenCalledOnce();
		});

		it("calls cronSuccess with the job name and service result", async () => {
			await GET();

			expect(mockCronSuccess).toHaveBeenCalledWith(
				expect.objectContaining({
					job: "sync-async-payments",
					checked: DEFAULT_SERVICE_RESULT.checked,
					updated: DEFAULT_SERVICE_RESULT.updated,
					errors: DEFAULT_SERVICE_RESULT.errors,
				}),
				1000
			);
		});

		it("includes the job name 'sync-async-payments' in the success response data", async () => {
			await GET();

			const [data] = mockCronSuccess.mock.calls[0];
			expect(data.job).toBe("sync-async-payments");
		});

		it("passes startTime from cronTimer to cronSuccess", async () => {
			mockCronTimer.mockReturnValue(5555);

			await GET();

			const [, startTime] = mockCronSuccess.mock.calls[0];
			expect(startTime).toBe(5555);
		});

		it("does not send admin alert when errors is 0", async () => {
			mockSyncAsyncPayments.mockResolvedValue({ ...DEFAULT_SERVICE_RESULT, errors: 0 });

			await GET();

			expect(mockSendAdminCronFailedAlert).not.toHaveBeenCalled();
		});
	});

	describe("admin alert on errors", () => {
		it("sends admin alert when result.errors > 0", async () => {
			mockSyncAsyncPayments.mockResolvedValue({
				checked: 10,
				updated: 3,
				errors: 2,
			});

			await GET();

			expect(mockSendAdminCronFailedAlert).toHaveBeenCalledWith(
				expect.objectContaining({
					job: "sync-async-payments",
					errors: 2,
				})
			);
		});

		it("includes checked and updated in the alert details", async () => {
			mockSyncAsyncPayments.mockResolvedValue({
				checked: 10,
				updated: 3,
				errors: 1,
			});

			await GET();

			expect(mockSendAdminCronFailedAlert).toHaveBeenCalledWith(
				expect.objectContaining({
					details: expect.objectContaining({ checked: 10, updated: 3 }),
				})
			);
		});

		it("still returns cronSuccess even when admin alert is sent", async () => {
			mockSyncAsyncPayments.mockResolvedValue({ checked: 5, updated: 1, errors: 1 });

			await GET();

			expect(mockCronSuccess).toHaveBeenCalledOnce();
		});
	});

	describe("error handling", () => {
		it("calls cronError when syncAsyncPayments throws", async () => {
			mockSyncAsyncPayments.mockRejectedValue(new Error("Stripe API error"));

			await GET();

			expect(mockCronError).toHaveBeenCalledWith("Stripe API error");
		});

		it("uses the error message when an Error instance is thrown", async () => {
			mockSyncAsyncPayments.mockRejectedValue(new Error("Prisma timeout"));

			await GET();

			expect(mockCronError).toHaveBeenCalledWith("Prisma timeout");
		});

		it("uses fallback message when a non-Error value is thrown", async () => {
			mockSyncAsyncPayments.mockRejectedValue("unexpected string error");

			await GET();

			expect(mockCronError).toHaveBeenCalledWith("Failed to sync async payments");
		});

		it("uses fallback message when null is thrown", async () => {
			mockSyncAsyncPayments.mockRejectedValue(null);

			await GET();

			expect(mockCronError).toHaveBeenCalledWith("Failed to sync async payments");
		});

		it("does not call cronSuccess when the service throws", async () => {
			mockSyncAsyncPayments.mockRejectedValue(new Error("fail"));

			await GET();

			expect(mockCronSuccess).not.toHaveBeenCalled();
		});
	});
});
