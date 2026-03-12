import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockVerifyCronRequest,
	mockCronTimer,
	mockCronSuccess,
	mockCronError,
	mockCleanupPendingOrders,
} = vi.hoisted(() => ({
	mockVerifyCronRequest: vi.fn(),
	mockCronTimer: vi.fn(),
	mockCronSuccess: vi.fn(),
	mockCronError: vi.fn(),
	mockCleanupPendingOrders: vi.fn(),
}));

vi.mock("@/modules/cron/lib/verify-cron", () => ({
	verifyCronRequest: mockVerifyCronRequest,
	cronTimer: mockCronTimer,
	cronSuccess: mockCronSuccess,
	cronError: mockCronError,
}));

vi.mock("@/modules/cron/services/cleanup-pending-orders.service", () => ({
	cleanupPendingOrders: mockCleanupPendingOrders,
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
	checked: 12,
	cancelled: 3,
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

describe("GET /api/cron/cleanup-pending-orders", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		mockVerifyCronRequest.mockResolvedValue(null);
		mockCronTimer.mockReturnValue(1000);
		mockCleanupPendingOrders.mockResolvedValue(DEFAULT_SERVICE_RESULT);
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

		it("does not call cleanupPendingOrders when unauthorized", async () => {
			mockVerifyCronRequest.mockResolvedValue(makeUnauthorizedResponse());

			await GET();

			expect(mockCleanupPendingOrders).not.toHaveBeenCalled();
		});

		it("proceeds to the service when verifyCronRequest returns null", async () => {
			mockVerifyCronRequest.mockResolvedValue(null);

			await GET();

			expect(mockCleanupPendingOrders).toHaveBeenCalledOnce();
		});
	});

	describe("Stripe config check", () => {
		it("returns cronError when service returns null (STRIPE_SECRET_KEY not configured)", async () => {
			mockCleanupPendingOrders.mockResolvedValue(null);

			await GET();

			expect(mockCronError).toHaveBeenCalledWith("STRIPE_SECRET_KEY not configured");
		});

		it("does not call cronSuccess when service returns null", async () => {
			mockCleanupPendingOrders.mockResolvedValue(null);

			await GET();

			expect(mockCronSuccess).not.toHaveBeenCalled();
		});
	});

	describe("successful execution", () => {
		it("calls cleanupPendingOrders", async () => {
			await GET();

			expect(mockCleanupPendingOrders).toHaveBeenCalledOnce();
		});

		it("calls cronTimer to capture start time", async () => {
			await GET();

			expect(mockCronTimer).toHaveBeenCalledOnce();
		});

		it("calls cronSuccess with the job name and service result spread", async () => {
			await GET();

			expect(mockCronSuccess).toHaveBeenCalledWith(
				expect.objectContaining({
					job: "cleanup-pending-orders",
					checked: DEFAULT_SERVICE_RESULT.checked,
					cancelled: DEFAULT_SERVICE_RESULT.cancelled,
					errors: DEFAULT_SERVICE_RESULT.errors,
					hasMore: DEFAULT_SERVICE_RESULT.hasMore,
				}),
				1000,
			);
		});

		it("includes the job name 'cleanup-pending-orders' in the success response data", async () => {
			await GET();

			const [data] = mockCronSuccess.mock.calls[0]!;
			expect(data.job).toBe("cleanup-pending-orders");
		});

		it("passes startTime from cronTimer to cronSuccess", async () => {
			mockCronTimer.mockReturnValue(2468);

			await GET();

			const [, startTime] = mockCronSuccess.mock.calls[0]!;
			expect(startTime).toBe(2468);
		});

		it("returns cronSuccess regardless of the errors count in the result", async () => {
			mockCleanupPendingOrders.mockResolvedValue({
				...DEFAULT_SERVICE_RESULT,
				errors: 2,
			});

			await GET();

			expect(mockCronSuccess).toHaveBeenCalledOnce();
		});
	});

	// Note: admin alert emails on partial errors are sent by the service itself
	// (cleanupPendingOrders), not by the route handler.

	describe("error handling", () => {
		it("calls cronError when cleanupPendingOrders throws", async () => {
			mockCleanupPendingOrders.mockRejectedValue(new Error("Stripe API unavailable"));

			await GET();

			expect(mockCronError).toHaveBeenCalledWith("Stripe API unavailable");
		});

		it("uses the error message when an Error instance is thrown", async () => {
			mockCleanupPendingOrders.mockRejectedValue(new Error("Prisma timeout"));

			await GET();

			expect(mockCronError).toHaveBeenCalledWith("Prisma timeout");
		});

		it("uses fallback message when a non-Error value is thrown", async () => {
			mockCleanupPendingOrders.mockRejectedValue("unexpected string error");

			await GET();

			expect(mockCronError).toHaveBeenCalledWith("Failed to cleanup pending orders");
		});

		it("uses fallback message when null is thrown", async () => {
			mockCleanupPendingOrders.mockRejectedValue(null);

			await GET();

			expect(mockCronError).toHaveBeenCalledWith("Failed to cleanup pending orders");
		});

		it("does not call cronSuccess when the service throws", async () => {
			mockCleanupPendingOrders.mockRejectedValue(new Error("fail"));

			await GET();

			expect(mockCronSuccess).not.toHaveBeenCalled();
		});
	});
});
