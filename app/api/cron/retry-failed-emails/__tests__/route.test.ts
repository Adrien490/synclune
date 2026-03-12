import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockVerifyCronRequest,
	mockCronTimer,
	mockCronSuccess,
	mockCronError,
	mockRetryFailedEmails,
	mockSendAdminCronFailedAlert,
} = vi.hoisted(() => ({
	mockVerifyCronRequest: vi.fn(),
	mockCronTimer: vi.fn(),
	mockCronSuccess: vi.fn(),
	mockCronError: vi.fn(),
	mockRetryFailedEmails: vi.fn(),
	mockSendAdminCronFailedAlert: vi.fn(),
}));

vi.mock("@/modules/cron/lib/verify-cron", () => ({
	verifyCronRequest: mockVerifyCronRequest,
	cronTimer: mockCronTimer,
	cronSuccess: mockCronSuccess,
	cronError: mockCronError,
}));

vi.mock("@/modules/cron/services/retry-failed-emails.service", () => ({
	retryFailedEmails: mockRetryFailedEmails,
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
	found: 4,
	retried: 4,
	resolved: 3,
	errors: 0,
	hasMore: false,
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

describe("GET /api/cron/retry-failed-emails", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		mockVerifyCronRequest.mockResolvedValue(null);
		mockCronTimer.mockReturnValue(1000);
		mockRetryFailedEmails.mockResolvedValue(DEFAULT_SERVICE_RESULT);
		mockSendAdminCronFailedAlert.mockResolvedValue(undefined);
		mockCronSuccess.mockImplementation((data: Record<string, unknown>) =>
			makeSuccessResponse(data),
		);
		mockCronError.mockImplementation((message: string) => makeErrorResponse(message));
	});

	// --------------------------------------------------------------------------
	// Authorization
	// --------------------------------------------------------------------------

	describe("authorization", () => {
		it("returns the unauthorized response immediately when verifyCronRequest returns a response", async () => {
			const unauthorizedResponse = makeUnauthorizedResponse();
			mockVerifyCronRequest.mockResolvedValue(unauthorizedResponse);

			const result = await GET();

			expect(result).toBe(unauthorizedResponse);
		});

		it("does not call retryFailedEmails when unauthorized", async () => {
			mockVerifyCronRequest.mockResolvedValue(makeUnauthorizedResponse());

			await GET();

			expect(mockRetryFailedEmails).not.toHaveBeenCalled();
		});

		it("proceeds to the service when verifyCronRequest returns null", async () => {
			mockVerifyCronRequest.mockResolvedValue(null);

			await GET();

			expect(mockRetryFailedEmails).toHaveBeenCalledOnce();
		});
	});

	// --------------------------------------------------------------------------
	// Successful execution
	// --------------------------------------------------------------------------

	describe("successful execution", () => {
		it("calls retryFailedEmails once", async () => {
			await GET();

			expect(mockRetryFailedEmails).toHaveBeenCalledOnce();
		});

		it("calls cronTimer to capture start time", async () => {
			await GET();

			expect(mockCronTimer).toHaveBeenCalledOnce();
		});

		it("calls cronSuccess with the job name and all service result fields", async () => {
			await GET();

			expect(mockCronSuccess).toHaveBeenCalledWith(
				expect.objectContaining({
					job: "retry-failed-emails",
					found: DEFAULT_SERVICE_RESULT.found,
					retried: DEFAULT_SERVICE_RESULT.retried,
					resolved: DEFAULT_SERVICE_RESULT.resolved,
					errors: DEFAULT_SERVICE_RESULT.errors,
					hasMore: DEFAULT_SERVICE_RESULT.hasMore,
				}),
				1000,
			);
		});

		it("includes the job name 'retry-failed-emails' in the success response data", async () => {
			await GET();

			const [data] = mockCronSuccess.mock.calls[0]!;
			expect(data.job).toBe("retry-failed-emails");
		});

		it("passes startTime from cronTimer to cronSuccess", async () => {
			mockCronTimer.mockReturnValue(9876);

			await GET();

			const [, startTime] = mockCronSuccess.mock.calls[0]!;
			expect(startTime).toBe(9876);
		});

		it("does not send admin alert when errors is 0", async () => {
			mockRetryFailedEmails.mockResolvedValue({ ...DEFAULT_SERVICE_RESULT, errors: 0 });

			await GET();

			expect(mockSendAdminCronFailedAlert).not.toHaveBeenCalled();
		});

		it("returns the cronSuccess response", async () => {
			const response = await GET();

			expect(response).toBeDefined();
			expect(mockCronSuccess).toHaveBeenCalledOnce();
		});
	});

	// --------------------------------------------------------------------------
	// Admin alert on errors
	// --------------------------------------------------------------------------

	describe("admin alert on errors", () => {
		it("sends admin alert when result.errors > 0", async () => {
			mockRetryFailedEmails.mockResolvedValue({
				...DEFAULT_SERVICE_RESULT,
				errors: 2,
			});

			await GET();

			expect(mockSendAdminCronFailedAlert).toHaveBeenCalledWith(
				expect.objectContaining({
					job: "retry-failed-emails",
					errors: 2,
				}),
			);
		});

		it("includes found, retried and resolved in the alert details", async () => {
			mockRetryFailedEmails.mockResolvedValue({
				found: 5,
				retried: 5,
				resolved: 3,
				errors: 2,
				hasMore: false,
			});

			await GET();

			expect(mockSendAdminCronFailedAlert).toHaveBeenCalledWith(
				expect.objectContaining({
					details: expect.objectContaining({
						found: 5,
						retried: 5,
						resolved: 3,
					}),
				}),
			);
		});

		it("still returns cronSuccess even when admin alert is sent", async () => {
			mockRetryFailedEmails.mockResolvedValue({
				...DEFAULT_SERVICE_RESULT,
				errors: 1,
			});

			await GET();

			expect(mockCronSuccess).toHaveBeenCalledOnce();
		});

		it("does not call cronError when admin alert is sent", async () => {
			mockRetryFailedEmails.mockResolvedValue({
				...DEFAULT_SERVICE_RESULT,
				errors: 1,
			});

			await GET();

			expect(mockCronError).not.toHaveBeenCalled();
		});

		it("fires admin alert as fire-and-forget (does not await resolution)", async () => {
			let alertResolve!: () => void;
			mockSendAdminCronFailedAlert.mockReturnValue(
				new Promise<void>((resolve) => {
					alertResolve = resolve;
				}),
			);
			mockRetryFailedEmails.mockResolvedValue({
				...DEFAULT_SERVICE_RESULT,
				errors: 1,
			});

			// GET should resolve before alertResolve is called
			await GET();

			// cronSuccess was already called even though the alert promise is pending
			expect(mockCronSuccess).toHaveBeenCalledOnce();

			// Resolve the alert to avoid unhandled rejection
			alertResolve();
		});
	});

	// --------------------------------------------------------------------------
	// Error handling
	// --------------------------------------------------------------------------

	describe("error handling", () => {
		it("calls cronError when retryFailedEmails throws an Error", async () => {
			mockRetryFailedEmails.mockRejectedValue(new Error("DB connection lost"));

			await GET();

			expect(mockCronError).toHaveBeenCalledWith("DB connection lost");
		});

		it("uses the error message when an Error instance is thrown", async () => {
			mockRetryFailedEmails.mockRejectedValue(new Error("Prisma timeout"));

			await GET();

			expect(mockCronError).toHaveBeenCalledWith("Prisma timeout");
		});

		it("uses fallback message when a non-Error value is thrown", async () => {
			mockRetryFailedEmails.mockRejectedValue("unexpected string error");

			await GET();

			expect(mockCronError).toHaveBeenCalledWith("Failed to retry failed emails");
		});

		it("uses fallback message when null is thrown", async () => {
			mockRetryFailedEmails.mockRejectedValue(null);

			await GET();

			expect(mockCronError).toHaveBeenCalledWith("Failed to retry failed emails");
		});

		it("does not call cronSuccess when the service throws", async () => {
			mockRetryFailedEmails.mockRejectedValue(new Error("fail"));

			await GET();

			expect(mockCronSuccess).not.toHaveBeenCalled();
		});

		it("does not send admin alert when the service throws", async () => {
			mockRetryFailedEmails.mockRejectedValue(new Error("fail"));

			await GET();

			expect(mockSendAdminCronFailedAlert).not.toHaveBeenCalled();
		});
	});
});
