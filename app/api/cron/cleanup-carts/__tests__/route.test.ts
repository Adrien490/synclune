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
	mockSendAdminCronFailedAlert,
} = vi.hoisted(() => ({
	mockVerifyCronRequest: vi.fn(),
	mockCronTimer: vi.fn(),
	mockCronSuccess: vi.fn(),
	mockCronError: vi.fn(),
	mockCleanupExpiredCarts: vi.fn(),
	mockSendAdminCronFailedAlert: vi.fn(),
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
	processed: 5,
	errored: 0,
	skipped: 0,
	deletedCount: 5,
	orphanedItemsCount: 0,
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
// Tests: GET handler (wired via withCronGuard)
// ============================================================================

describe("GET /api/cron/cleanup-carts", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		mockVerifyCronRequest.mockResolvedValue(null);
		mockCronTimer.mockReturnValue(1000);
		mockCleanupExpiredCarts.mockResolvedValue(DEFAULT_SERVICE_RESULT);
		mockSendAdminCronFailedAlert.mockResolvedValue(undefined);
		mockCronSuccess.mockImplementation((data: Record<string, unknown>) =>
			makeSuccessResponse(data),
		);
		mockCronError.mockImplementation((message: string) => makeErrorResponse(message));
	});

	it("returns the unauthorized response immediately when verifyCronRequest fails", async () => {
		const unauthorizedResponse = makeUnauthorizedResponse();
		mockVerifyCronRequest.mockResolvedValue(unauthorizedResponse);

		const result = await GET();

		expect(result).toBe(unauthorizedResponse);
		expect(mockCleanupExpiredCarts).not.toHaveBeenCalled();
	});

	it("delegates to cleanupExpiredCarts and tags the success response with the job name", async () => {
		await GET();

		expect(mockCleanupExpiredCarts).toHaveBeenCalledOnce();
		expect(mockCronSuccess).toHaveBeenCalledWith(
			expect.objectContaining({ job: "cleanup-carts" }),
			1000,
		);
	});

	it("notifies the admin and returns the default error message when the service throws", async () => {
		mockCleanupExpiredCarts.mockRejectedValue(new Error("DB lost"));

		await GET();

		expect(mockSendAdminCronFailedAlert).toHaveBeenCalledWith(
			expect.objectContaining({
				job: "cleanup-carts",
				errors: 1,
				details: expect.objectContaining({ error: "DB lost" }),
			}),
		);
		expect(mockCronError).toHaveBeenCalledWith("DB lost");
		expect(mockCronSuccess).not.toHaveBeenCalled();
	});

	it("falls back to the default error message when a non-Error is thrown", async () => {
		mockCleanupExpiredCarts.mockRejectedValue("string boom");

		await GET();

		expect(mockCronError).toHaveBeenCalledWith("Failed to cleanup carts");
	});
});
