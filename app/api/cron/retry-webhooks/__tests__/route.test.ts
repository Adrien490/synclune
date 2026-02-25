import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockVerifyCronRequest,
	mockCronTimer,
	mockCronSuccess,
	mockCronError,
	mockRetryFailedWebhooks,
	mockSendAdminCronFailedAlert,
} = vi.hoisted(() => ({
	mockVerifyCronRequest: vi.fn(),
	mockCronTimer: vi.fn(),
	mockCronSuccess: vi.fn(),
	mockCronError: vi.fn(),
	mockRetryFailedWebhooks: vi.fn(),
	mockSendAdminCronFailedAlert: vi.fn(),
}));

vi.mock("@/modules/cron/lib/verify-cron", () => ({
	verifyCronRequest: mockVerifyCronRequest,
	cronTimer: mockCronTimer,
	cronSuccess: mockCronSuccess,
	cronError: mockCronError,
}));

vi.mock("@/modules/cron/services/retry-webhooks.service", () => ({
	retryFailedWebhooks: mockRetryFailedWebhooks,
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
	found: 3,
	retried: 3,
	succeeded: 2,
	permanentlyFailed: 0,
	orphansRecovered: 1,
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

describe("GET /api/cron/retry-webhooks", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		mockVerifyCronRequest.mockResolvedValue(null);
		mockCronTimer.mockReturnValue(1000);
		mockRetryFailedWebhooks.mockResolvedValue(DEFAULT_SERVICE_RESULT);
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

		it("does not call retryFailedWebhooks when unauthorized", async () => {
			mockVerifyCronRequest.mockResolvedValue(makeUnauthorizedResponse());

			await GET();

			expect(mockRetryFailedWebhooks).not.toHaveBeenCalled();
		});

		it("proceeds to the service when verifyCronRequest returns null", async () => {
			mockVerifyCronRequest.mockResolvedValue(null);

			await GET();

			expect(mockRetryFailedWebhooks).toHaveBeenCalledOnce();
		});
	});

	describe("Stripe config check", () => {
		it("returns cronError when service returns null (STRIPE_SECRET_KEY not configured)", async () => {
			mockRetryFailedWebhooks.mockResolvedValue(null);

			await GET();

			expect(mockCronError).toHaveBeenCalledWith("STRIPE_SECRET_KEY not configured");
		});

		it("does not call cronSuccess when service returns null", async () => {
			mockRetryFailedWebhooks.mockResolvedValue(null);

			await GET();

			expect(mockCronSuccess).not.toHaveBeenCalled();
		});

		it("does not send admin alert when service returns null", async () => {
			mockRetryFailedWebhooks.mockResolvedValue(null);

			await GET();

			expect(mockSendAdminCronFailedAlert).not.toHaveBeenCalled();
		});
	});

	describe("successful execution", () => {
		it("calls retryFailedWebhooks", async () => {
			await GET();

			expect(mockRetryFailedWebhooks).toHaveBeenCalledOnce();
		});

		it("calls cronTimer to capture start time", async () => {
			await GET();

			expect(mockCronTimer).toHaveBeenCalledOnce();
		});

		it("calls cronSuccess with the job name and service result", async () => {
			await GET();

			expect(mockCronSuccess).toHaveBeenCalledWith(
				expect.objectContaining({
					job: "retry-webhooks",
					found: DEFAULT_SERVICE_RESULT.found,
					retried: DEFAULT_SERVICE_RESULT.retried,
					succeeded: DEFAULT_SERVICE_RESULT.succeeded,
					permanentlyFailed: DEFAULT_SERVICE_RESULT.permanentlyFailed,
					orphansRecovered: DEFAULT_SERVICE_RESULT.orphansRecovered,
					errors: DEFAULT_SERVICE_RESULT.errors,
				}),
				1000
			);
		});

		it("includes the job name 'retry-webhooks' in the success response data", async () => {
			await GET();

			const [data] = mockCronSuccess.mock.calls[0];
			expect(data.job).toBe("retry-webhooks");
		});

		it("passes startTime from cronTimer to cronSuccess", async () => {
			mockCronTimer.mockReturnValue(9876);

			await GET();

			const [, startTime] = mockCronSuccess.mock.calls[0];
			expect(startTime).toBe(9876);
		});

		it("does not send admin alert when errors is 0", async () => {
			mockRetryFailedWebhooks.mockResolvedValue({ ...DEFAULT_SERVICE_RESULT, errors: 0 });

			await GET();

			expect(mockSendAdminCronFailedAlert).not.toHaveBeenCalled();
		});
	});

	describe("admin alert on errors", () => {
		it("sends admin alert when result.errors > 0", async () => {
			mockRetryFailedWebhooks.mockResolvedValue({
				...DEFAULT_SERVICE_RESULT,
				errors: 2,
			});

			await GET();

			expect(mockSendAdminCronFailedAlert).toHaveBeenCalledWith(
				expect.objectContaining({
					job: "retry-webhooks",
					errors: 2,
				})
			);
		});

		it("includes found, retried, succeeded, permanentlyFailed and orphansRecovered in the alert details", async () => {
			mockRetryFailedWebhooks.mockResolvedValue({
				found: 5,
				retried: 5,
				succeeded: 3,
				permanentlyFailed: 1,
				orphansRecovered: 0,
				errors: 1,
			});

			await GET();

			expect(mockSendAdminCronFailedAlert).toHaveBeenCalledWith(
				expect.objectContaining({
					details: expect.objectContaining({
						found: 5,
						retried: 5,
						succeeded: 3,
						permanentlyFailed: 1,
						orphansRecovered: 0,
					}),
				})
			);
		});

		it("still returns cronSuccess even when admin alert is sent", async () => {
			mockRetryFailedWebhooks.mockResolvedValue({
				...DEFAULT_SERVICE_RESULT,
				errors: 1,
			});

			await GET();

			expect(mockCronSuccess).toHaveBeenCalledOnce();
		});
	});

	describe("error handling", () => {
		it("calls cronError when retryFailedWebhooks throws", async () => {
			mockRetryFailedWebhooks.mockRejectedValue(new Error("Stripe connection refused"));

			await GET();

			expect(mockCronError).toHaveBeenCalledWith("Stripe connection refused");
		});

		it("uses the error message when an Error instance is thrown", async () => {
			mockRetryFailedWebhooks.mockRejectedValue(new Error("Prisma timeout"));

			await GET();

			expect(mockCronError).toHaveBeenCalledWith("Prisma timeout");
		});

		it("uses fallback message when a non-Error value is thrown", async () => {
			mockRetryFailedWebhooks.mockRejectedValue("unexpected string error");

			await GET();

			expect(mockCronError).toHaveBeenCalledWith("Failed to retry webhooks");
		});

		it("uses fallback message when null is thrown", async () => {
			mockRetryFailedWebhooks.mockRejectedValue(null);

			await GET();

			expect(mockCronError).toHaveBeenCalledWith("Failed to retry webhooks");
		});

		it("does not call cronSuccess when the service throws", async () => {
			mockRetryFailedWebhooks.mockRejectedValue(new Error("fail"));

			await GET();

			expect(mockCronSuccess).not.toHaveBeenCalled();
		});
	});
});
