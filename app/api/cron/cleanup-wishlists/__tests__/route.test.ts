import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockVerifyCronRequest,
	mockCronTimer,
	mockCronSuccess,
	mockCronError,
	mockCleanupExpiredWishlists,
} = vi.hoisted(() => ({
	mockVerifyCronRequest: vi.fn(),
	mockCronTimer: vi.fn(),
	mockCronSuccess: vi.fn(),
	mockCronError: vi.fn(),
	mockCleanupExpiredWishlists: vi.fn(),
}));

vi.mock("@/modules/cron/lib/verify-cron", () => ({
	verifyCronRequest: mockVerifyCronRequest,
	cronTimer: mockCronTimer,
	cronSuccess: mockCronSuccess,
	cronError: mockCronError,
}));

vi.mock("@/modules/cron/services/cleanup-wishlists.service", () => ({
	cleanupExpiredWishlists: mockCleanupExpiredWishlists,
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
	deletedCount: 5,
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

describe("GET /api/cron/cleanup-wishlists", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		mockVerifyCronRequest.mockResolvedValue(null);
		mockCronTimer.mockReturnValue(1000);
		mockCleanupExpiredWishlists.mockResolvedValue(DEFAULT_SERVICE_RESULT);
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

		it("does not call cleanupExpiredWishlists when unauthorized", async () => {
			mockVerifyCronRequest.mockResolvedValue(makeUnauthorizedResponse());

			await GET();

			expect(mockCleanupExpiredWishlists).not.toHaveBeenCalled();
		});

		it("proceeds to the service when verifyCronRequest returns null", async () => {
			mockVerifyCronRequest.mockResolvedValue(null);

			await GET();

			expect(mockCleanupExpiredWishlists).toHaveBeenCalledOnce();
		});
	});

	describe("successful execution", () => {
		it("calls cleanupExpiredWishlists", async () => {
			await GET();

			expect(mockCleanupExpiredWishlists).toHaveBeenCalledOnce();
		});

		it("calls cronTimer to capture start time", async () => {
			await GET();

			expect(mockCronTimer).toHaveBeenCalledOnce();
		});

		it("calls cronSuccess with the job name and service result", async () => {
			await GET();

			expect(mockCronSuccess).toHaveBeenCalledWith(
				expect.objectContaining({
					job: "cleanup-wishlists",
					deletedCount: DEFAULT_SERVICE_RESULT.deletedCount,
					hasMore: DEFAULT_SERVICE_RESULT.hasMore,
				}),
				1000
			);
		});

		it("includes the job name 'cleanup-wishlists' in the success response data", async () => {
			await GET();

			const [data] = mockCronSuccess.mock.calls[0];
			expect(data.job).toBe("cleanup-wishlists");
		});

		it("passes startTime from cronTimer to cronSuccess", async () => {
			mockCronTimer.mockReturnValue(9999);

			await GET();

			const [, startTime] = mockCronSuccess.mock.calls[0];
			expect(startTime).toBe(9999);
		});

		it("returns the response from cronSuccess", async () => {
			const successResponse = makeSuccessResponse({ job: "cleanup-wishlists" });
			mockCronSuccess.mockReturnValue(successResponse);

			const result = await GET();

			expect(result).toBe(successResponse);
		});
	});

	describe("error handling", () => {
		it("calls cronError when cleanupExpiredWishlists throws", async () => {
			mockCleanupExpiredWishlists.mockRejectedValue(new Error("DB connection lost"));

			await GET();

			expect(mockCronError).toHaveBeenCalledWith("DB connection lost");
		});

		it("returns the response from cronError when service throws", async () => {
			const errorResponse = makeErrorResponse("DB connection lost");
			mockCleanupExpiredWishlists.mockRejectedValue(new Error("DB connection lost"));
			mockCronError.mockReturnValue(errorResponse);

			const result = await GET();

			expect(result).toBe(errorResponse);
		});

		it("uses the error message when an Error instance is thrown", async () => {
			mockCleanupExpiredWishlists.mockRejectedValue(new Error("Prisma timeout"));

			await GET();

			expect(mockCronError).toHaveBeenCalledWith("Prisma timeout");
		});

		it("uses fallback message when a non-Error value is thrown", async () => {
			mockCleanupExpiredWishlists.mockRejectedValue("unexpected string error");

			await GET();

			expect(mockCronError).toHaveBeenCalledWith("Failed to cleanup wishlists");
		});

		it("uses fallback message when null is thrown", async () => {
			mockCleanupExpiredWishlists.mockRejectedValue(null);

			await GET();

			expect(mockCronError).toHaveBeenCalledWith("Failed to cleanup wishlists");
		});

		it("does not call cronSuccess when the service throws", async () => {
			mockCleanupExpiredWishlists.mockRejectedValue(new Error("fail"));

			await GET();

			expect(mockCronSuccess).not.toHaveBeenCalled();
		});
	});
});
