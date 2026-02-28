import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockVerifyCronRequest,
	mockCronTimer,
	mockCronSuccess,
	mockCronError,
	mockCleanupOrphanMedia,
	mockSendAdminCronFailedAlert,
} = vi.hoisted(() => ({
	mockVerifyCronRequest: vi.fn(),
	mockCronTimer: vi.fn(),
	mockCronSuccess: vi.fn(),
	mockCronError: vi.fn(),
	mockCleanupOrphanMedia: vi.fn(),
	mockSendAdminCronFailedAlert: vi.fn(),
}));

vi.mock("@/modules/cron/lib/verify-cron", () => ({
	verifyCronRequest: mockVerifyCronRequest,
	cronTimer: mockCronTimer,
	cronSuccess: mockCronSuccess,
	cronError: mockCronError,
}));

vi.mock("@/modules/cron/services/cleanup-orphan-media.service", () => ({
	cleanupOrphanMedia: mockCleanupOrphanMedia,
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
	scanned: 50,
	deleted: 3,
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

describe("GET /api/cron/cleanup-orphan-media", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		mockVerifyCronRequest.mockResolvedValue(null);
		mockCronTimer.mockReturnValue(1000);
		mockCleanupOrphanMedia.mockResolvedValue(DEFAULT_SERVICE_RESULT);
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

		it("does not call cleanupOrphanMedia when unauthorized", async () => {
			mockVerifyCronRequest.mockResolvedValue(makeUnauthorizedResponse());

			await GET();

			expect(mockCleanupOrphanMedia).not.toHaveBeenCalled();
		});

		it("proceeds to the service when verifyCronRequest returns null", async () => {
			mockVerifyCronRequest.mockResolvedValue(null);

			await GET();

			expect(mockCleanupOrphanMedia).toHaveBeenCalledOnce();
		});
	});

	describe("successful execution", () => {
		it("calls cleanupOrphanMedia", async () => {
			await GET();

			expect(mockCleanupOrphanMedia).toHaveBeenCalledOnce();
		});

		it("calls cronTimer to capture start time", async () => {
			await GET();

			expect(mockCronTimer).toHaveBeenCalledOnce();
		});

		it("calls cronSuccess with the job name and service result", async () => {
			await GET();

			expect(mockCronSuccess).toHaveBeenCalledWith(
				expect.objectContaining({
					job: "cleanup-orphan-media",
				}),
				1000,
			);
		});

		it("includes the job name 'cleanup-orphan-media' in the success response data", async () => {
			await GET();

			const [data] = mockCronSuccess.mock.calls[0]!;
			expect(data.job).toBe("cleanup-orphan-media");
		});

		it("passes startTime from cronTimer to cronSuccess", async () => {
			mockCronTimer.mockReturnValue(1111);

			await GET();

			const [, startTime] = mockCronSuccess.mock.calls[0]!;
			expect(startTime).toBe(1111);
		});

		it("does not send admin alert on success", async () => {
			await GET();

			expect(mockSendAdminCronFailedAlert).not.toHaveBeenCalled();
		});
	});

	describe("error handling with admin alert in catch", () => {
		it("sends admin alert when cleanupOrphanMedia throws", async () => {
			mockCleanupOrphanMedia.mockRejectedValue(new Error("UploadThing API error"));

			await GET();

			expect(mockSendAdminCronFailedAlert).toHaveBeenCalledWith(
				expect.objectContaining({
					job: "cleanup-orphan-media",
					errors: 1,
				}),
			);
		});

		it("includes the error message in the alert details when an Error is thrown", async () => {
			mockCleanupOrphanMedia.mockRejectedValue(new Error("UploadThing API error"));

			await GET();

			expect(mockSendAdminCronFailedAlert).toHaveBeenCalledWith(
				expect.objectContaining({
					details: expect.objectContaining({ error: "UploadThing API error" }),
				}),
			);
		});

		it("includes the stringified value in alert details when a non-Error is thrown", async () => {
			mockCleanupOrphanMedia.mockRejectedValue("string error value");

			await GET();

			expect(mockSendAdminCronFailedAlert).toHaveBeenCalledWith(
				expect.objectContaining({
					details: expect.objectContaining({ error: "string error value" }),
				}),
			);
		});

		it("calls cronError when cleanupOrphanMedia throws", async () => {
			mockCleanupOrphanMedia.mockRejectedValue(new Error("UploadThing API error"));

			await GET();

			expect(mockCronError).toHaveBeenCalledWith("UploadThing API error");
		});

		it("uses fallback message when a non-Error value is thrown", async () => {
			mockCleanupOrphanMedia.mockRejectedValue("unexpected string error");

			await GET();

			expect(mockCronError).toHaveBeenCalledWith("Failed to cleanup orphan media");
		});

		it("uses fallback message when null is thrown", async () => {
			mockCleanupOrphanMedia.mockRejectedValue(null);

			await GET();

			expect(mockCronError).toHaveBeenCalledWith("Failed to cleanup orphan media");
		});

		it("does not call cronSuccess when the service throws", async () => {
			mockCleanupOrphanMedia.mockRejectedValue(new Error("fail"));

			await GET();

			expect(mockCronSuccess).not.toHaveBeenCalled();
		});
	});
});
