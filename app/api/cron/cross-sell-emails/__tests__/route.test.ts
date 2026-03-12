import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockVerifyCronRequest,
	mockCronTimer,
	mockCronSuccess,
	mockCronError,
	mockSendCrossSellEmails,
	mockSendAdminCronFailedAlert,
} = vi.hoisted(() => ({
	mockVerifyCronRequest: vi.fn(),
	mockCronTimer: vi.fn(),
	mockCronSuccess: vi.fn(),
	mockCronError: vi.fn(),
	mockSendCrossSellEmails: vi.fn(),
	mockSendAdminCronFailedAlert: vi.fn(),
}));

vi.mock("@/modules/cron/lib/verify-cron", () => ({
	verifyCronRequest: mockVerifyCronRequest,
	cronTimer: mockCronTimer,
	cronSuccess: mockCronSuccess,
	cronError: mockCronError,
}));

vi.mock("@/modules/cron/services/cross-sell-emails.service", () => ({
	sendCrossSellEmails: mockSendCrossSellEmails,
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
	found: 5,
	sent: 4,
	skipped: 1,
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

describe("GET /api/cron/cross-sell-emails", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		mockVerifyCronRequest.mockResolvedValue(null);
		mockCronTimer.mockReturnValue(1000);
		mockSendCrossSellEmails.mockResolvedValue(DEFAULT_SERVICE_RESULT);
		mockSendAdminCronFailedAlert.mockResolvedValue(undefined);
		mockCronSuccess.mockImplementation((data: Record<string, unknown>) =>
			makeSuccessResponse(data),
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

		it("does not call sendCrossSellEmails when unauthorized", async () => {
			mockVerifyCronRequest.mockResolvedValue(makeUnauthorizedResponse());

			await GET();

			expect(mockSendCrossSellEmails).not.toHaveBeenCalled();
		});

		it("proceeds to the service when verifyCronRequest returns null", async () => {
			mockVerifyCronRequest.mockResolvedValue(null);

			await GET();

			expect(mockSendCrossSellEmails).toHaveBeenCalledOnce();
		});
	});

	describe("successful execution", () => {
		it("calls sendCrossSellEmails", async () => {
			await GET();

			expect(mockSendCrossSellEmails).toHaveBeenCalledOnce();
		});

		it("calls cronTimer to capture start time", async () => {
			await GET();

			expect(mockCronTimer).toHaveBeenCalledOnce();
		});

		it("calls cronSuccess with the job name and service result", async () => {
			await GET();

			expect(mockCronSuccess).toHaveBeenCalledWith(
				expect.objectContaining({
					job: "cross-sell-emails",
					found: DEFAULT_SERVICE_RESULT.found,
					sent: DEFAULT_SERVICE_RESULT.sent,
					skipped: DEFAULT_SERVICE_RESULT.skipped,
					errors: DEFAULT_SERVICE_RESULT.errors,
					hasMore: DEFAULT_SERVICE_RESULT.hasMore,
				}),
				1000,
			);
		});

		it("includes the job name 'cross-sell-emails' in the success response data", async () => {
			await GET();

			const [data] = mockCronSuccess.mock.calls[0]!;
			expect(data.job).toBe("cross-sell-emails");
		});

		it("passes startTime from cronTimer to cronSuccess", async () => {
			mockCronTimer.mockReturnValue(2468);

			await GET();

			const [, startTime] = mockCronSuccess.mock.calls[0]!;
			expect(startTime).toBe(2468);
		});

		it("does not send admin alert when errors is 0", async () => {
			mockSendCrossSellEmails.mockResolvedValue({
				...DEFAULT_SERVICE_RESULT,
				errors: 0,
			});

			await GET();

			expect(mockSendAdminCronFailedAlert).not.toHaveBeenCalled();
		});
	});

	describe("admin alert on errors", () => {
		it("sends admin alert when result.errors > 0", async () => {
			mockSendCrossSellEmails.mockResolvedValue({
				...DEFAULT_SERVICE_RESULT,
				found: 5,
				sent: 3,
				skipped: 1,
				errors: 1,
			});

			await GET();

			expect(mockSendAdminCronFailedAlert).toHaveBeenCalledWith(
				expect.objectContaining({
					job: "cross-sell-emails",
					errors: 1,
				}),
			);
		});

		it("includes found, sent and skipped in the alert details", async () => {
			mockSendCrossSellEmails.mockResolvedValue({
				...DEFAULT_SERVICE_RESULT,
				found: 5,
				sent: 2,
				skipped: 1,
				errors: 2,
			});

			await GET();

			expect(mockSendAdminCronFailedAlert).toHaveBeenCalledWith(
				expect.objectContaining({
					details: expect.objectContaining({
						found: 5,
						sent: 2,
						skipped: 1,
					}),
				}),
			);
		});

		it("still returns cronSuccess even when admin alert is sent", async () => {
			mockSendCrossSellEmails.mockResolvedValue({
				...DEFAULT_SERVICE_RESULT,
				errors: 2,
			});

			await GET();

			expect(mockCronSuccess).toHaveBeenCalledOnce();
		});

		it("does not call cronError when only the admin alert resolves", async () => {
			mockSendCrossSellEmails.mockResolvedValue({
				...DEFAULT_SERVICE_RESULT,
				errors: 1,
			});

			await GET();

			expect(mockCronError).not.toHaveBeenCalled();
		});

		it("fires admin alert as a fire-and-forget (does not await)", async () => {
			let alertResolved = false;
			mockSendAdminCronFailedAlert.mockImplementation(
				() =>
					new Promise<void>((resolve) => {
						setTimeout(() => {
							alertResolved = true;
							resolve();
						}, 50);
					}),
			);
			mockSendCrossSellEmails.mockResolvedValue({
				...DEFAULT_SERVICE_RESULT,
				errors: 1,
			});

			await GET();

			// cronSuccess was already called before the alert promise resolved
			expect(mockCronSuccess).toHaveBeenCalledOnce();
			expect(alertResolved).toBe(false);
		});
	});

	describe("error handling", () => {
		it("calls cronError when sendCrossSellEmails throws", async () => {
			mockSendCrossSellEmails.mockRejectedValue(new Error("DB connection lost"));

			await GET();

			expect(mockCronError).toHaveBeenCalledWith("DB connection lost");
		});

		it("uses the error message when an Error instance is thrown", async () => {
			mockSendCrossSellEmails.mockRejectedValue(new Error("Resend rate limit exceeded"));

			await GET();

			expect(mockCronError).toHaveBeenCalledWith("Resend rate limit exceeded");
		});

		it("uses fallback message when a non-Error value is thrown", async () => {
			mockSendCrossSellEmails.mockRejectedValue("unexpected string error");

			await GET();

			expect(mockCronError).toHaveBeenCalledWith("Failed to send cross-sell emails");
		});

		it("uses fallback message when null is thrown", async () => {
			mockSendCrossSellEmails.mockRejectedValue(null);

			await GET();

			expect(mockCronError).toHaveBeenCalledWith("Failed to send cross-sell emails");
		});

		it("does not call cronSuccess when the service throws", async () => {
			mockSendCrossSellEmails.mockRejectedValue(new Error("fail"));

			await GET();

			expect(mockCronSuccess).not.toHaveBeenCalled();
		});

		it("does not send admin alert when the service throws", async () => {
			mockSendCrossSellEmails.mockRejectedValue(new Error("fail"));

			await GET();

			expect(mockSendAdminCronFailedAlert).not.toHaveBeenCalled();
		});
	});
});
