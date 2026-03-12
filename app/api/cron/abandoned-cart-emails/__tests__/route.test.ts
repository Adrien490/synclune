import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockVerifyCronRequest,
	mockCronTimer,
	mockCronSuccess,
	mockCronError,
	mockSendAbandonedCartEmails,
	mockSendAdminCronFailedAlert,
} = vi.hoisted(() => ({
	mockVerifyCronRequest: vi.fn(),
	mockCronTimer: vi.fn(),
	mockCronSuccess: vi.fn(),
	mockCronError: vi.fn(),
	mockSendAbandonedCartEmails: vi.fn(),
	mockSendAdminCronFailedAlert: vi.fn(),
}));

vi.mock("@/modules/cron/lib/verify-cron", () => ({
	verifyCronRequest: mockVerifyCronRequest,
	cronTimer: mockCronTimer,
	cronSuccess: mockCronSuccess,
	cronError: mockCronError,
}));

vi.mock("@/modules/cron/services/abandoned-cart-emails.service", () => ({
	sendAbandonedCartEmails: mockSendAbandonedCartEmails,
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
	sent: 3,
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

describe("GET /api/cron/abandoned-cart-emails", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		mockVerifyCronRequest.mockResolvedValue(null);
		mockCronTimer.mockReturnValue(1000);
		mockSendAbandonedCartEmails.mockResolvedValue(DEFAULT_SERVICE_RESULT);
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

		it("does not call sendAbandonedCartEmails when unauthorized", async () => {
			mockVerifyCronRequest.mockResolvedValue(makeUnauthorizedResponse());

			await GET();

			expect(mockSendAbandonedCartEmails).not.toHaveBeenCalled();
		});

		it("proceeds to the service when verifyCronRequest returns null", async () => {
			mockVerifyCronRequest.mockResolvedValue(null);

			await GET();

			expect(mockSendAbandonedCartEmails).toHaveBeenCalledOnce();
		});
	});

	describe("successful execution", () => {
		it("calls sendAbandonedCartEmails", async () => {
			await GET();

			expect(mockSendAbandonedCartEmails).toHaveBeenCalledOnce();
		});

		it("calls cronTimer to capture start time", async () => {
			await GET();

			expect(mockCronTimer).toHaveBeenCalledOnce();
		});

		it("calls cronSuccess with the job name and service result", async () => {
			await GET();

			expect(mockCronSuccess).toHaveBeenCalledWith(
				expect.objectContaining({
					job: "abandoned-cart-emails",
					found: DEFAULT_SERVICE_RESULT.found,
					sent: DEFAULT_SERVICE_RESULT.sent,
					errors: DEFAULT_SERVICE_RESULT.errors,
					hasMore: DEFAULT_SERVICE_RESULT.hasMore,
				}),
				1000,
			);
		});

		it("includes the job name 'abandoned-cart-emails' in the success response data", async () => {
			await GET();

			const [data] = mockCronSuccess.mock.calls[0]!;
			expect(data.job).toBe("abandoned-cart-emails");
		});

		it("passes startTime from cronTimer to cronSuccess", async () => {
			mockCronTimer.mockReturnValue(2468);

			await GET();

			const [, startTime] = mockCronSuccess.mock.calls[0]!;
			expect(startTime).toBe(2468);
		});

		it("does not send admin alert when errors is 0", async () => {
			mockSendAbandonedCartEmails.mockResolvedValue({
				...DEFAULT_SERVICE_RESULT,
				errors: 0,
			});

			await GET();

			expect(mockSendAdminCronFailedAlert).not.toHaveBeenCalled();
		});
	});

	describe("admin alert on errors", () => {
		it("sends admin alert when result.errors > 0", async () => {
			mockSendAbandonedCartEmails.mockResolvedValue({
				found: 5,
				sent: 2,
				errors: 3,
				hasMore: false,
			});

			await GET();

			expect(mockSendAdminCronFailedAlert).toHaveBeenCalledWith(
				expect.objectContaining({
					job: "abandoned-cart-emails",
					errors: 3,
				}),
			);
		});

		it("includes found and sent in the alert details", async () => {
			mockSendAbandonedCartEmails.mockResolvedValue({
				found: 5,
				sent: 2,
				errors: 1,
				hasMore: false,
			});

			await GET();

			expect(mockSendAdminCronFailedAlert).toHaveBeenCalledWith(
				expect.objectContaining({
					details: expect.objectContaining({
						found: 5,
						sent: 2,
					}),
				}),
			);
		});

		it("still returns cronSuccess even when admin alert is sent", async () => {
			mockSendAbandonedCartEmails.mockResolvedValue({
				found: 5,
				sent: 2,
				errors: 1,
				hasMore: false,
			});

			await GET();

			expect(mockCronSuccess).toHaveBeenCalledOnce();
		});
	});

	describe("error handling", () => {
		it("calls cronError when sendAbandonedCartEmails throws", async () => {
			mockSendAbandonedCartEmails.mockRejectedValue(new Error("Database connection lost"));

			await GET();

			expect(mockCronError).toHaveBeenCalledWith("Database connection lost");
		});

		it("uses the error message when an Error instance is thrown", async () => {
			mockSendAbandonedCartEmails.mockRejectedValue(new Error("Prisma timeout"));

			await GET();

			expect(mockCronError).toHaveBeenCalledWith("Prisma timeout");
		});

		it("uses fallback message when a non-Error value is thrown", async () => {
			mockSendAbandonedCartEmails.mockRejectedValue("unexpected string error");

			await GET();

			expect(mockCronError).toHaveBeenCalledWith("Failed to send abandoned cart emails");
		});

		it("uses fallback message when null is thrown", async () => {
			mockSendAbandonedCartEmails.mockRejectedValue(null);

			await GET();

			expect(mockCronError).toHaveBeenCalledWith("Failed to send abandoned cart emails");
		});

		it("does not call cronSuccess when the service throws", async () => {
			mockSendAbandonedCartEmails.mockRejectedValue(new Error("fail"));

			await GET();

			expect(mockCronSuccess).not.toHaveBeenCalled();
		});
	});
});
