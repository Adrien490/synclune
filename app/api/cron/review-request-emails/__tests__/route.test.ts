import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockVerifyCronRequest,
	mockCronTimer,
	mockCronSuccess,
	mockCronError,
	mockSendDelayedReviewRequestEmails,
	mockSendAdminCronFailedAlert,
} = vi.hoisted(() => ({
	mockVerifyCronRequest: vi.fn(),
	mockCronTimer: vi.fn(),
	mockCronSuccess: vi.fn(),
	mockCronError: vi.fn(),
	mockSendDelayedReviewRequestEmails: vi.fn(),
	mockSendAdminCronFailedAlert: vi.fn(),
}));

vi.mock("@/modules/cron/lib/verify-cron", () => ({
	verifyCronRequest: mockVerifyCronRequest,
	cronTimer: mockCronTimer,
	cronSuccess: mockCronSuccess,
	cronError: mockCronError,
}));

vi.mock("@/modules/cron/services/review-request-emails.service", () => ({
	sendDelayedReviewRequestEmails: mockSendDelayedReviewRequestEmails,
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
	sent: 4,
	errors: 0,
	hasMore: false,
	remindersFound: 0,
	remindersSent: 0,
	reminderErrors: 0,
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

describe("GET /api/cron/review-request-emails", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		mockVerifyCronRequest.mockResolvedValue(null);
		mockCronTimer.mockReturnValue(1000);
		mockSendDelayedReviewRequestEmails.mockResolvedValue(DEFAULT_SERVICE_RESULT);
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

		it("does not call sendDelayedReviewRequestEmails when unauthorized", async () => {
			mockVerifyCronRequest.mockResolvedValue(makeUnauthorizedResponse());

			await GET();

			expect(mockSendDelayedReviewRequestEmails).not.toHaveBeenCalled();
		});

		it("proceeds to the service when verifyCronRequest returns null", async () => {
			mockVerifyCronRequest.mockResolvedValue(null);

			await GET();

			expect(mockSendDelayedReviewRequestEmails).toHaveBeenCalledOnce();
		});
	});

	describe("successful execution", () => {
		it("calls sendDelayedReviewRequestEmails", async () => {
			await GET();

			expect(mockSendDelayedReviewRequestEmails).toHaveBeenCalledOnce();
		});

		it("calls cronTimer to capture start time", async () => {
			await GET();

			expect(mockCronTimer).toHaveBeenCalledOnce();
		});

		it("calls cronSuccess with the job name and service result", async () => {
			await GET();

			expect(mockCronSuccess).toHaveBeenCalledWith(
				expect.objectContaining({
					job: "review-request-emails",
					found: DEFAULT_SERVICE_RESULT.found,
					sent: DEFAULT_SERVICE_RESULT.sent,
					errors: DEFAULT_SERVICE_RESULT.errors,
				}),
				1000,
			);
		});

		it("includes the job name 'review-request-emails' in the success response data", async () => {
			await GET();

			const [data] = mockCronSuccess.mock.calls[0]!;
			expect(data.job).toBe("review-request-emails");
		});

		it("passes startTime from cronTimer to cronSuccess", async () => {
			mockCronTimer.mockReturnValue(2222);

			await GET();

			const [, startTime] = mockCronSuccess.mock.calls[0]!;
			expect(startTime).toBe(2222);
		});

		it("does not send admin alert when errors is 0", async () => {
			mockSendDelayedReviewRequestEmails.mockResolvedValue({
				...DEFAULT_SERVICE_RESULT,
				errors: 0,
			});

			await GET();

			expect(mockSendAdminCronFailedAlert).not.toHaveBeenCalled();
		});
	});

	describe("admin alert on errors", () => {
		it("sends admin alert when result.errors > 0", async () => {
			mockSendDelayedReviewRequestEmails.mockResolvedValue({
				...DEFAULT_SERVICE_RESULT,
				found: 4,
				sent: 2,
				errors: 2,
				reminderErrors: 0,
			});

			await GET();

			expect(mockSendAdminCronFailedAlert).toHaveBeenCalledWith(
				expect.objectContaining({
					job: "review-request-emails",
					errors: 2,
				}),
			);
		});

		it("includes found and sent in the alert details", async () => {
			mockSendDelayedReviewRequestEmails.mockResolvedValue({
				...DEFAULT_SERVICE_RESULT,
				found: 4,
				sent: 3,
				errors: 1,
				reminderErrors: 0,
			});

			await GET();

			expect(mockSendAdminCronFailedAlert).toHaveBeenCalledWith(
				expect.objectContaining({
					details: expect.objectContaining({ found: 4, sent: 3 }),
				}),
			);
		});

		it("still returns cronSuccess even when admin alert is sent", async () => {
			mockSendDelayedReviewRequestEmails.mockResolvedValue({
				...DEFAULT_SERVICE_RESULT,
				found: 4,
				sent: 3,
				errors: 1,
				reminderErrors: 0,
			});

			await GET();

			expect(mockCronSuccess).toHaveBeenCalledOnce();
		});
	});

	describe("error handling", () => {
		it("calls cronError when sendDelayedReviewRequestEmails throws", async () => {
			mockSendDelayedReviewRequestEmails.mockRejectedValue(new Error("Email API error"));

			await GET();

			expect(mockCronError).toHaveBeenCalledWith("Email API error");
		});

		it("uses the error message when an Error instance is thrown", async () => {
			mockSendDelayedReviewRequestEmails.mockRejectedValue(new Error("Resend timeout"));

			await GET();

			expect(mockCronError).toHaveBeenCalledWith("Resend timeout");
		});

		it("uses fallback message when a non-Error value is thrown", async () => {
			mockSendDelayedReviewRequestEmails.mockRejectedValue("unexpected string error");

			await GET();

			expect(mockCronError).toHaveBeenCalledWith("Failed to send review request emails");
		});

		it("uses fallback message when null is thrown", async () => {
			mockSendDelayedReviewRequestEmails.mockRejectedValue(null);

			await GET();

			expect(mockCronError).toHaveBeenCalledWith("Failed to send review request emails");
		});

		it("does not call cronSuccess when the service throws", async () => {
			mockSendDelayedReviewRequestEmails.mockRejectedValue(new Error("fail"));

			await GET();

			expect(mockCronSuccess).not.toHaveBeenCalled();
		});
	});
});
