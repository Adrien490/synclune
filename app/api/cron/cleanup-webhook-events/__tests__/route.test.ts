import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockVerifyCronRequest,
	mockCronTimer,
	mockCronSuccess,
	mockCronError,
	mockCleanupOldWebhookEvents,
	mockSendAdminCronFailedAlert,
} = vi.hoisted(() => ({
	mockVerifyCronRequest: vi.fn(),
	mockCronTimer: vi.fn(),
	mockCronSuccess: vi.fn(),
	mockCronError: vi.fn(),
	mockCleanupOldWebhookEvents: vi.fn(),
	mockSendAdminCronFailedAlert: vi.fn(),
}));

vi.mock("@/modules/cron/lib/verify-cron", () => ({
	verifyCronRequest: mockVerifyCronRequest,
	cronTimer: mockCronTimer,
	cronSuccess: mockCronSuccess,
	cronError: mockCronError,
}));

vi.mock("@/modules/cron/services/cleanup-webhook-events.service", () => ({
	cleanupOldWebhookEvents: mockCleanupOldWebhookEvents,
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
	deletedCount: 150,
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

describe("GET /api/cron/cleanup-webhook-events", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		mockVerifyCronRequest.mockResolvedValue(null);
		mockCronTimer.mockReturnValue(1000);
		mockCleanupOldWebhookEvents.mockResolvedValue(DEFAULT_SERVICE_RESULT);
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

		it("does not call cleanupOldWebhookEvents when unauthorized", async () => {
			mockVerifyCronRequest.mockResolvedValue(makeUnauthorizedResponse());

			await GET();

			expect(mockCleanupOldWebhookEvents).not.toHaveBeenCalled();
		});

		it("proceeds to the service when verifyCronRequest returns null", async () => {
			mockVerifyCronRequest.mockResolvedValue(null);

			await GET();

			expect(mockCleanupOldWebhookEvents).toHaveBeenCalledOnce();
		});
	});

	describe("successful execution", () => {
		it("calls cleanupOldWebhookEvents", async () => {
			await GET();

			expect(mockCleanupOldWebhookEvents).toHaveBeenCalledOnce();
		});

		it("calls cronTimer to capture start time", async () => {
			await GET();

			expect(mockCronTimer).toHaveBeenCalledOnce();
		});

		it("calls cronSuccess with the job name and service result", async () => {
			await GET();

			expect(mockCronSuccess).toHaveBeenCalledWith(
				expect.objectContaining({
					job: "cleanup-webhook-events",
				}),
				1000
			);
		});

		it("includes the job name 'cleanup-webhook-events' in the success response data", async () => {
			await GET();

			const [data] = mockCronSuccess.mock.calls[0];
			expect(data.job).toBe("cleanup-webhook-events");
		});

		it("passes startTime from cronTimer to cronSuccess", async () => {
			mockCronTimer.mockReturnValue(2468);

			await GET();

			const [, startTime] = mockCronSuccess.mock.calls[0];
			expect(startTime).toBe(2468);
		});

		it("does not send admin alert on success", async () => {
			await GET();

			expect(mockSendAdminCronFailedAlert).not.toHaveBeenCalled();
		});
	});

	describe("error handling with admin alert in catch", () => {
		it("sends admin alert when cleanupOldWebhookEvents throws", async () => {
			mockCleanupOldWebhookEvents.mockRejectedValue(new Error("DB constraint error"));

			await GET();

			expect(mockSendAdminCronFailedAlert).toHaveBeenCalledWith(
				expect.objectContaining({
					job: "cleanup-webhook-events",
					errors: 1,
				})
			);
		});

		it("includes the error message in the alert details when an Error is thrown", async () => {
			mockCleanupOldWebhookEvents.mockRejectedValue(new Error("DB constraint error"));

			await GET();

			expect(mockSendAdminCronFailedAlert).toHaveBeenCalledWith(
				expect.objectContaining({
					details: expect.objectContaining({ error: "DB constraint error" }),
				})
			);
		});

		it("includes the stringified value in alert details when a non-Error is thrown", async () => {
			mockCleanupOldWebhookEvents.mockRejectedValue("string error value");

			await GET();

			expect(mockSendAdminCronFailedAlert).toHaveBeenCalledWith(
				expect.objectContaining({
					details: expect.objectContaining({ error: "string error value" }),
				})
			);
		});

		it("calls cronError when cleanupOldWebhookEvents throws", async () => {
			mockCleanupOldWebhookEvents.mockRejectedValue(new Error("DB constraint error"));

			await GET();

			expect(mockCronError).toHaveBeenCalledWith("DB constraint error");
		});

		it("uses fallback message when a non-Error value is thrown", async () => {
			mockCleanupOldWebhookEvents.mockRejectedValue("unexpected string error");

			await GET();

			expect(mockCronError).toHaveBeenCalledWith("Failed to cleanup webhook events");
		});

		it("uses fallback message when null is thrown", async () => {
			mockCleanupOldWebhookEvents.mockRejectedValue(null);

			await GET();

			expect(mockCronError).toHaveBeenCalledWith("Failed to cleanup webhook events");
		});

		it("does not call cronSuccess when the service throws", async () => {
			mockCleanupOldWebhookEvents.mockRejectedValue(new Error("fail"));

			await GET();

			expect(mockCronSuccess).not.toHaveBeenCalled();
		});
	});
});
