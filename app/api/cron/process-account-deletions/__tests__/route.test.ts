import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockVerifyCronRequest,
	mockCronTimer,
	mockCronSuccess,
	mockCronError,
	mockProcessAccountDeletions,
	mockSendAdminCronFailedAlert,
} = vi.hoisted(() => ({
	mockVerifyCronRequest: vi.fn(),
	mockCronTimer: vi.fn(),
	mockCronSuccess: vi.fn(),
	mockCronError: vi.fn(),
	mockProcessAccountDeletions: vi.fn(),
	mockSendAdminCronFailedAlert: vi.fn(),
}));

vi.mock("@/modules/cron/lib/verify-cron", () => ({
	verifyCronRequest: mockVerifyCronRequest,
	cronTimer: mockCronTimer,
	cronSuccess: mockCronSuccess,
	cronError: mockCronError,
}));

vi.mock("@/modules/cron/services/process-account-deletions.service", () => ({
	processAccountDeletions: mockProcessAccountDeletions,
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
	processed: 3,
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

describe("GET /api/cron/process-account-deletions", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		mockVerifyCronRequest.mockResolvedValue(null);
		mockCronTimer.mockReturnValue(1000);
		mockProcessAccountDeletions.mockResolvedValue(DEFAULT_SERVICE_RESULT);
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

		it("does not call processAccountDeletions when unauthorized", async () => {
			mockVerifyCronRequest.mockResolvedValue(makeUnauthorizedResponse());

			await GET();

			expect(mockProcessAccountDeletions).not.toHaveBeenCalled();
		});

		it("proceeds to the service when verifyCronRequest returns null", async () => {
			mockVerifyCronRequest.mockResolvedValue(null);

			await GET();

			expect(mockProcessAccountDeletions).toHaveBeenCalledOnce();
		});
	});

	describe("successful execution", () => {
		it("calls processAccountDeletions", async () => {
			await GET();

			expect(mockProcessAccountDeletions).toHaveBeenCalledOnce();
		});

		it("calls cronTimer to capture start time", async () => {
			await GET();

			expect(mockCronTimer).toHaveBeenCalledOnce();
		});

		it("calls cronSuccess with the job name and service result", async () => {
			await GET();

			expect(mockCronSuccess).toHaveBeenCalledWith(
				expect.objectContaining({
					job: "process-account-deletions",
					processed: DEFAULT_SERVICE_RESULT.processed,
					errors: DEFAULT_SERVICE_RESULT.errors,
					hasMore: DEFAULT_SERVICE_RESULT.hasMore,
				}),
				1000,
			);
		});

		it("includes the job name 'process-account-deletions' in the success response data", async () => {
			await GET();

			const [data] = mockCronSuccess.mock.calls[0]!;
			expect(data.job).toBe("process-account-deletions");
		});

		it("passes startTime from cronTimer to cronSuccess", async () => {
			mockCronTimer.mockReturnValue(4444);

			await GET();

			const [, startTime] = mockCronSuccess.mock.calls[0]!;
			expect(startTime).toBe(4444);
		});

		it("does not send admin alert when errors is 0", async () => {
			mockProcessAccountDeletions.mockResolvedValue({
				...DEFAULT_SERVICE_RESULT,
				errors: 0,
			});

			await GET();

			expect(mockSendAdminCronFailedAlert).not.toHaveBeenCalled();
		});
	});

	describe("admin alert on errors", () => {
		it("sends admin alert when result.errors > 0", async () => {
			mockProcessAccountDeletions.mockResolvedValue({
				processed: 5,
				errors: 2,
				hasMore: false,
			});

			await GET();

			expect(mockSendAdminCronFailedAlert).toHaveBeenCalledWith(
				expect.objectContaining({
					job: "process-account-deletions",
					errors: 2,
				}),
			);
		});

		it("includes processed and hasMore in the alert details", async () => {
			mockProcessAccountDeletions.mockResolvedValue({
				processed: 5,
				errors: 1,
				hasMore: true,
			});

			await GET();

			expect(mockSendAdminCronFailedAlert).toHaveBeenCalledWith(
				expect.objectContaining({
					details: expect.objectContaining({ processed: 5, hasMore: true }),
				}),
			);
		});

		it("still returns cronSuccess even when admin alert is sent", async () => {
			mockProcessAccountDeletions.mockResolvedValue({
				processed: 3,
				errors: 1,
				hasMore: false,
			});

			await GET();

			expect(mockCronSuccess).toHaveBeenCalledOnce();
		});
	});

	describe("error handling", () => {
		it("calls cronError when processAccountDeletions throws", async () => {
			mockProcessAccountDeletions.mockRejectedValue(new Error("DB connection lost"));

			await GET();

			expect(mockCronError).toHaveBeenCalledWith("DB connection lost");
		});

		it("uses the error message when an Error instance is thrown", async () => {
			mockProcessAccountDeletions.mockRejectedValue(new Error("Prisma timeout"));

			await GET();

			expect(mockCronError).toHaveBeenCalledWith("Prisma timeout");
		});

		it("uses fallback message when a non-Error value is thrown", async () => {
			mockProcessAccountDeletions.mockRejectedValue("unexpected string error");

			await GET();

			expect(mockCronError).toHaveBeenCalledWith("Failed to process account deletions");
		});

		it("uses fallback message when null is thrown", async () => {
			mockProcessAccountDeletions.mockRejectedValue(null);

			await GET();

			expect(mockCronError).toHaveBeenCalledWith("Failed to process account deletions");
		});

		it("does not call cronSuccess when the service throws", async () => {
			mockProcessAccountDeletions.mockRejectedValue(new Error("fail"));

			await GET();

			expect(mockCronSuccess).not.toHaveBeenCalled();
		});
	});
});
