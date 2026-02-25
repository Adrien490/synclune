import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockVerifyCronRequest,
	mockCronTimer,
	mockCronSuccess,
	mockCronError,
	mockCleanupUnconfirmedNewsletterSubscriptions,
} = vi.hoisted(() => ({
	mockVerifyCronRequest: vi.fn(),
	mockCronTimer: vi.fn(),
	mockCronSuccess: vi.fn(),
	mockCronError: vi.fn(),
	mockCleanupUnconfirmedNewsletterSubscriptions: vi.fn(),
}));

vi.mock("@/modules/cron/lib/verify-cron", () => ({
	verifyCronRequest: mockVerifyCronRequest,
	cronTimer: mockCronTimer,
	cronSuccess: mockCronSuccess,
	cronError: mockCronError,
}));

vi.mock("@/modules/cron/services/cleanup-newsletter.service", () => ({
	cleanupUnconfirmedNewsletterSubscriptions: mockCleanupUnconfirmedNewsletterSubscriptions,
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
	deletedCount: 8,
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

describe("GET /api/cron/cleanup-newsletter", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		mockVerifyCronRequest.mockResolvedValue(null);
		mockCronTimer.mockReturnValue(1000);
		mockCleanupUnconfirmedNewsletterSubscriptions.mockResolvedValue(DEFAULT_SERVICE_RESULT);
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

		it("does not call cleanupUnconfirmedNewsletterSubscriptions when unauthorized", async () => {
			mockVerifyCronRequest.mockResolvedValue(makeUnauthorizedResponse());

			await GET();

			expect(mockCleanupUnconfirmedNewsletterSubscriptions).not.toHaveBeenCalled();
		});

		it("proceeds to the service when verifyCronRequest returns null", async () => {
			mockVerifyCronRequest.mockResolvedValue(null);

			await GET();

			expect(mockCleanupUnconfirmedNewsletterSubscriptions).toHaveBeenCalledOnce();
		});
	});

	describe("successful execution", () => {
		it("calls cleanupUnconfirmedNewsletterSubscriptions", async () => {
			await GET();

			expect(mockCleanupUnconfirmedNewsletterSubscriptions).toHaveBeenCalledOnce();
		});

		it("calls cronTimer to capture start time", async () => {
			await GET();

			expect(mockCronTimer).toHaveBeenCalledOnce();
		});

		it("calls cronSuccess with the job name and service result", async () => {
			await GET();

			expect(mockCronSuccess).toHaveBeenCalledWith(
				expect.objectContaining({
					job: "cleanup-newsletter",
					deletedCount: DEFAULT_SERVICE_RESULT.deletedCount,
					hasMore: DEFAULT_SERVICE_RESULT.hasMore,
				}),
				1000
			);
		});

		it("includes the job name 'cleanup-newsletter' in the success response data", async () => {
			await GET();

			const [data] = mockCronSuccess.mock.calls[0];
			expect(data.job).toBe("cleanup-newsletter");
		});

		it("passes startTime from cronTimer to cronSuccess", async () => {
			mockCronTimer.mockReturnValue(7777);

			await GET();

			const [, startTime] = mockCronSuccess.mock.calls[0];
			expect(startTime).toBe(7777);
		});

		it("returns the response from cronSuccess", async () => {
			const successResponse = makeSuccessResponse({ job: "cleanup-newsletter" });
			mockCronSuccess.mockReturnValue(successResponse);

			const result = await GET();

			expect(result).toBe(successResponse);
		});
	});

	describe("error handling", () => {
		it("calls cronError when cleanupUnconfirmedNewsletterSubscriptions throws", async () => {
			mockCleanupUnconfirmedNewsletterSubscriptions.mockRejectedValue(
				new Error("DB connection lost")
			);

			await GET();

			expect(mockCronError).toHaveBeenCalledWith("DB connection lost");
		});

		it("returns the response from cronError when service throws", async () => {
			const errorResponse = makeErrorResponse("DB connection lost");
			mockCleanupUnconfirmedNewsletterSubscriptions.mockRejectedValue(
				new Error("DB connection lost")
			);
			mockCronError.mockReturnValue(errorResponse);

			const result = await GET();

			expect(result).toBe(errorResponse);
		});

		it("uses the error message when an Error instance is thrown", async () => {
			mockCleanupUnconfirmedNewsletterSubscriptions.mockRejectedValue(
				new Error("Prisma timeout")
			);

			await GET();

			expect(mockCronError).toHaveBeenCalledWith("Prisma timeout");
		});

		it("uses fallback message when a non-Error value is thrown", async () => {
			mockCleanupUnconfirmedNewsletterSubscriptions.mockRejectedValue(
				"unexpected string error"
			);

			await GET();

			expect(mockCronError).toHaveBeenCalledWith(
				"Failed to cleanup newsletter subscriptions"
			);
		});

		it("uses fallback message when null is thrown", async () => {
			mockCleanupUnconfirmedNewsletterSubscriptions.mockRejectedValue(null);

			await GET();

			expect(mockCronError).toHaveBeenCalledWith(
				"Failed to cleanup newsletter subscriptions"
			);
		});

		it("does not call cronSuccess when the service throws", async () => {
			mockCleanupUnconfirmedNewsletterSubscriptions.mockRejectedValue(new Error("fail"));

			await GET();

			expect(mockCronSuccess).not.toHaveBeenCalled();
		});
	});
});
