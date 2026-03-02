import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockVerifyCronRequest,
	mockCronTimer,
	mockCronSuccess,
	mockCronError,
	mockProcessScheduledDiscounts,
	mockSendAdminCronFailedAlert,
} = vi.hoisted(() => ({
	mockVerifyCronRequest: vi.fn(),
	mockCronTimer: vi.fn(),
	mockCronSuccess: vi.fn(),
	mockCronError: vi.fn(),
	mockProcessScheduledDiscounts: vi.fn(),
	mockSendAdminCronFailedAlert: vi.fn(),
}));

vi.mock("@/modules/cron/lib/verify-cron", () => ({
	verifyCronRequest: mockVerifyCronRequest,
	cronTimer: mockCronTimer,
	cronSuccess: mockCronSuccess,
	cronError: mockCronError,
}));

vi.mock("@/modules/cron/services/process-scheduled-discounts.service", () => ({
	processScheduledDiscounts: mockProcessScheduledDiscounts,
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
	activated: 2,
	deactivated: 1,
	hasMore: false,
};

// ============================================================================
// Tests: maxDuration export
// ============================================================================

describe("maxDuration", () => {
	it("is exported as 30", () => {
		expect(maxDuration).toBe(30);
	});
});

// ============================================================================
// Tests: GET handler
// ============================================================================

describe("GET /api/cron/process-scheduled-discounts", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		mockVerifyCronRequest.mockResolvedValue(null);
		mockCronTimer.mockReturnValue(1000);
		mockProcessScheduledDiscounts.mockResolvedValue(DEFAULT_SERVICE_RESULT);
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

		it("does not call processScheduledDiscounts when unauthorized", async () => {
			mockVerifyCronRequest.mockResolvedValue(makeUnauthorizedResponse());

			await GET();

			expect(mockProcessScheduledDiscounts).not.toHaveBeenCalled();
		});

		it("proceeds to the service when verifyCronRequest returns null", async () => {
			mockVerifyCronRequest.mockResolvedValue(null);

			await GET();

			expect(mockProcessScheduledDiscounts).toHaveBeenCalledOnce();
		});
	});

	describe("successful execution", () => {
		it("calls processScheduledDiscounts", async () => {
			await GET();

			expect(mockProcessScheduledDiscounts).toHaveBeenCalledOnce();
		});

		it("calls cronTimer to capture start time", async () => {
			await GET();

			expect(mockCronTimer).toHaveBeenCalledOnce();
		});

		it("calls cronSuccess with the job name and service result", async () => {
			await GET();

			expect(mockCronSuccess).toHaveBeenCalledWith(
				expect.objectContaining({
					job: "process-scheduled-discounts",
				}),
				1000,
			);
		});

		it("includes the job name 'process-scheduled-discounts' in the success response data", async () => {
			await GET();

			const [data] = mockCronSuccess.mock.calls[0]!;
			expect(data.job).toBe("process-scheduled-discounts");
		});

		it("passes startTime from cronTimer to cronSuccess", async () => {
			mockCronTimer.mockReturnValue(6666);

			await GET();

			const [, startTime] = mockCronSuccess.mock.calls[0]!;
			expect(startTime).toBe(6666);
		});

		it("does not send admin alert on success", async () => {
			await GET();

			expect(mockSendAdminCronFailedAlert).not.toHaveBeenCalled();
		});
	});

	describe("error handling with admin alert in catch", () => {
		it("sends admin alert when processScheduledDiscounts throws", async () => {
			mockProcessScheduledDiscounts.mockRejectedValue(new Error("DB error"));

			await GET();

			expect(mockSendAdminCronFailedAlert).toHaveBeenCalledWith(
				expect.objectContaining({
					job: "process-scheduled-discounts",
					errors: 1,
				}),
			);
		});

		it("includes the error message in the alert details when an Error is thrown", async () => {
			mockProcessScheduledDiscounts.mockRejectedValue(new Error("DB error"));

			await GET();

			expect(mockSendAdminCronFailedAlert).toHaveBeenCalledWith(
				expect.objectContaining({
					details: expect.objectContaining({ error: "DB error" }),
				}),
			);
		});

		it("includes the stringified value in alert details when a non-Error is thrown", async () => {
			mockProcessScheduledDiscounts.mockRejectedValue("string error value");

			await GET();

			expect(mockSendAdminCronFailedAlert).toHaveBeenCalledWith(
				expect.objectContaining({
					details: expect.objectContaining({ error: "string error value" }),
				}),
			);
		});

		it("calls cronError when processScheduledDiscounts throws", async () => {
			mockProcessScheduledDiscounts.mockRejectedValue(new Error("DB error"));

			await GET();

			expect(mockCronError).toHaveBeenCalledWith("DB error");
		});

		it("uses fallback message when a non-Error value is thrown", async () => {
			mockProcessScheduledDiscounts.mockRejectedValue("unexpected string error");

			await GET();

			expect(mockCronError).toHaveBeenCalledWith("Failed to process scheduled discounts");
		});

		it("uses fallback message when null is thrown", async () => {
			mockProcessScheduledDiscounts.mockRejectedValue(null);

			await GET();

			expect(mockCronError).toHaveBeenCalledWith("Failed to process scheduled discounts");
		});

		it("does not call cronSuccess when the service throws", async () => {
			mockProcessScheduledDiscounts.mockRejectedValue(new Error("fail"));

			await GET();

			expect(mockCronSuccess).not.toHaveBeenCalled();
		});
	});
});
