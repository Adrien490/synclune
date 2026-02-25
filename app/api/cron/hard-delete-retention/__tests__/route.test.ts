import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockVerifyCronRequest,
	mockCronTimer,
	mockCronSuccess,
	mockCronError,
	mockHardDeleteExpiredRecords,
	mockSendAdminCronFailedAlert,
} = vi.hoisted(() => ({
	mockVerifyCronRequest: vi.fn(),
	mockCronTimer: vi.fn(),
	mockCronSuccess: vi.fn(),
	mockCronError: vi.fn(),
	mockHardDeleteExpiredRecords: vi.fn(),
	mockSendAdminCronFailedAlert: vi.fn(),
}));

vi.mock("@/modules/cron/lib/verify-cron", () => ({
	verifyCronRequest: mockVerifyCronRequest,
	cronTimer: mockCronTimer,
	cronSuccess: mockCronSuccess,
	cronError: mockCronError,
}));

vi.mock("@/modules/cron/services/hard-delete-retention.service", () => ({
	hardDeleteExpiredRecords: mockHardDeleteExpiredRecords,
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
	deletedOrders: 2,
	deletedUsers: 1,
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

describe("GET /api/cron/hard-delete-retention", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		mockVerifyCronRequest.mockResolvedValue(null);
		mockCronTimer.mockReturnValue(1000);
		mockHardDeleteExpiredRecords.mockResolvedValue(DEFAULT_SERVICE_RESULT);
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

		it("does not call hardDeleteExpiredRecords when unauthorized", async () => {
			mockVerifyCronRequest.mockResolvedValue(makeUnauthorizedResponse());

			await GET();

			expect(mockHardDeleteExpiredRecords).not.toHaveBeenCalled();
		});

		it("proceeds to the service when verifyCronRequest returns null", async () => {
			mockVerifyCronRequest.mockResolvedValue(null);

			await GET();

			expect(mockHardDeleteExpiredRecords).toHaveBeenCalledOnce();
		});
	});

	describe("successful execution", () => {
		it("calls hardDeleteExpiredRecords", async () => {
			await GET();

			expect(mockHardDeleteExpiredRecords).toHaveBeenCalledOnce();
		});

		it("calls cronTimer to capture start time", async () => {
			await GET();

			expect(mockCronTimer).toHaveBeenCalledOnce();
		});

		it("calls cronSuccess with the job name and service result", async () => {
			await GET();

			expect(mockCronSuccess).toHaveBeenCalledWith(
				expect.objectContaining({
					job: "hard-delete-retention",
				}),
				1000
			);
		});

		it("includes the job name 'hard-delete-retention' in the success response data", async () => {
			await GET();

			const [data] = mockCronSuccess.mock.calls[0];
			expect(data.job).toBe("hard-delete-retention");
		});

		it("passes startTime from cronTimer to cronSuccess", async () => {
			mockCronTimer.mockReturnValue(3333);

			await GET();

			const [, startTime] = mockCronSuccess.mock.calls[0];
			expect(startTime).toBe(3333);
		});

		it("does not send admin alert on success", async () => {
			await GET();

			expect(mockSendAdminCronFailedAlert).not.toHaveBeenCalled();
		});
	});

	describe("error handling with admin alert in catch", () => {
		it("sends admin alert when hardDeleteExpiredRecords throws", async () => {
			mockHardDeleteExpiredRecords.mockRejectedValue(new Error("DB integrity error"));

			await GET();

			expect(mockSendAdminCronFailedAlert).toHaveBeenCalledWith(
				expect.objectContaining({
					job: "hard-delete-retention",
					errors: 1,
				})
			);
		});

		it("includes the error message in the alert details when an Error is thrown", async () => {
			mockHardDeleteExpiredRecords.mockRejectedValue(new Error("DB integrity error"));

			await GET();

			expect(mockSendAdminCronFailedAlert).toHaveBeenCalledWith(
				expect.objectContaining({
					details: expect.objectContaining({ error: "DB integrity error" }),
				})
			);
		});

		it("includes the stringified value in alert details when a non-Error is thrown", async () => {
			mockHardDeleteExpiredRecords.mockRejectedValue("string error value");

			await GET();

			expect(mockSendAdminCronFailedAlert).toHaveBeenCalledWith(
				expect.objectContaining({
					details: expect.objectContaining({ error: "string error value" }),
				})
			);
		});

		it("calls cronError when hardDeleteExpiredRecords throws", async () => {
			mockHardDeleteExpiredRecords.mockRejectedValue(new Error("DB integrity error"));

			await GET();

			expect(mockCronError).toHaveBeenCalledWith("DB integrity error");
		});

		it("uses fallback message when a non-Error value is thrown", async () => {
			mockHardDeleteExpiredRecords.mockRejectedValue("unexpected string error");

			await GET();

			expect(mockCronError).toHaveBeenCalledWith(
				"Failed to hard delete expired records"
			);
		});

		it("uses fallback message when null is thrown", async () => {
			mockHardDeleteExpiredRecords.mockRejectedValue(null);

			await GET();

			expect(mockCronError).toHaveBeenCalledWith(
				"Failed to hard delete expired records"
			);
		});

		it("does not call cronSuccess when the service throws", async () => {
			mockHardDeleteExpiredRecords.mockRejectedValue(new Error("fail"));

			await GET();

			expect(mockCronSuccess).not.toHaveBeenCalled();
		});
	});
});
