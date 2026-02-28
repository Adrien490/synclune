import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockVerifyCronRequest,
	mockCronTimer,
	mockCronSuccess,
	mockCronError,
	mockCleanupExpiredCarts,
} = vi.hoisted(() => ({
	mockVerifyCronRequest: vi.fn(),
	mockCronTimer: vi.fn(),
	mockCronSuccess: vi.fn(),
	mockCronError: vi.fn(),
	mockCleanupExpiredCarts: vi.fn(),
}));

vi.mock("@/modules/cron/lib/verify-cron", () => ({
	verifyCronRequest: mockVerifyCronRequest,
	cronTimer: mockCronTimer,
	cronSuccess: mockCronSuccess,
	cronError: mockCronError,
}));

vi.mock("@/modules/cron/services/cleanup-carts.service", () => ({
	cleanupExpiredCarts: mockCleanupExpiredCarts,
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
	deletedCount: 3,
	orphanedItemsCount: 0,
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

describe("GET /api/cron/cleanup-carts", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// Default: authorized, service succeeds
		mockVerifyCronRequest.mockResolvedValue(null);
		mockCronTimer.mockReturnValue(1000);
		mockCleanupExpiredCarts.mockResolvedValue(DEFAULT_SERVICE_RESULT);
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

		it("does not call cleanupExpiredCarts when unauthorized", async () => {
			mockVerifyCronRequest.mockResolvedValue(makeUnauthorizedResponse());

			await GET();

			expect(mockCleanupExpiredCarts).not.toHaveBeenCalled();
		});

		it("proceeds to the service when verifyCronRequest returns null", async () => {
			mockVerifyCronRequest.mockResolvedValue(null);

			await GET();

			expect(mockCleanupExpiredCarts).toHaveBeenCalledOnce();
		});
	});

	describe("successful execution", () => {
		it("calls cleanupExpiredCarts", async () => {
			await GET();

			expect(mockCleanupExpiredCarts).toHaveBeenCalledOnce();
		});

		it("calls cronTimer to capture start time", async () => {
			await GET();

			expect(mockCronTimer).toHaveBeenCalledOnce();
		});

		it("calls cronSuccess with the job name and service result", async () => {
			await GET();

			expect(mockCronSuccess).toHaveBeenCalledWith(
				expect.objectContaining({
					job: "cleanup-carts",
					deletedCount: DEFAULT_SERVICE_RESULT.deletedCount,
					orphanedItemsCount: DEFAULT_SERVICE_RESULT.orphanedItemsCount,
					hasMore: DEFAULT_SERVICE_RESULT.hasMore,
				}),
				1000,
			);
		});

		it("includes the job name 'cleanup-carts' in the success response data", async () => {
			await GET();

			const [data] = mockCronSuccess.mock.calls[0]!;
			expect(data.job).toBe("cleanup-carts");
		});

		it("passes startTime from cronTimer to cronSuccess", async () => {
			mockCronTimer.mockReturnValue(9999);

			await GET();

			const [, startTime] = mockCronSuccess.mock.calls[0]!;
			expect(startTime).toBe(9999);
		});

		it("returns the response from cronSuccess", async () => {
			const successResponse = makeSuccessResponse({ job: "cleanup-carts" });
			mockCronSuccess.mockReturnValue(successResponse);

			const result = await GET();

			expect(result).toBe(successResponse);
		});

		it("spreads all service result fields into cronSuccess data", async () => {
			mockCleanupExpiredCarts.mockResolvedValue({
				deletedCount: 42,
				orphanedItemsCount: 7,
				hasMore: true,
			});

			await GET();

			expect(mockCronSuccess).toHaveBeenCalledWith(
				expect.objectContaining({
					deletedCount: 42,
					orphanedItemsCount: 7,
					hasMore: true,
				}),
				expect.any(Number),
			);
		});
	});

	describe("error handling", () => {
		it("calls cronError when cleanupExpiredCarts throws", async () => {
			mockCleanupExpiredCarts.mockRejectedValue(new Error("DB connection lost"));

			await GET();

			expect(mockCronError).toHaveBeenCalledWith("DB connection lost");
		});

		it("returns the response from cronError when service throws", async () => {
			const errorResponse = makeErrorResponse("DB connection lost");
			mockCleanupExpiredCarts.mockRejectedValue(new Error("DB connection lost"));
			mockCronError.mockReturnValue(errorResponse);

			const result = await GET();

			expect(result).toBe(errorResponse);
		});

		it("uses the error message when an Error instance is thrown", async () => {
			mockCleanupExpiredCarts.mockRejectedValue(new Error("Prisma timeout"));

			await GET();

			expect(mockCronError).toHaveBeenCalledWith("Prisma timeout");
		});

		it("uses fallback message when a non-Error value is thrown", async () => {
			mockCleanupExpiredCarts.mockRejectedValue("unexpected string error");

			await GET();

			expect(mockCronError).toHaveBeenCalledWith("Failed to cleanup carts");
		});

		it("uses fallback message when null is thrown", async () => {
			mockCleanupExpiredCarts.mockRejectedValue(null);

			await GET();

			expect(mockCronError).toHaveBeenCalledWith("Failed to cleanup carts");
		});

		it("does not call cronSuccess when the service throws", async () => {
			mockCleanupExpiredCarts.mockRejectedValue(new Error("fail"));

			await GET();

			expect(mockCronSuccess).not.toHaveBeenCalled();
		});
	});
});
