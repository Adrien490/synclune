import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockRequireAdmin,
	mockEnforceRateLimit,
	mockSuccess,
	mockHandleActionError,
	mockUpdateTag,
} = vi.hoisted(() => ({
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockSuccess: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockUpdateTag: vi.fn(),
}));

vi.mock("@/modules/auth/lib/require-auth", () => ({ requireAdmin: mockRequireAdmin }));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_COLOR_LIMITS: { REFRESH: "refresh" },
}));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag }));
vi.mock("@/shared/lib/actions", () => ({
	handleActionError: mockHandleActionError,
	success: mockSuccess,
}));

import { refreshColors } from "../refresh-colors";

// ============================================================================
// TESTS
// ============================================================================

describe("refreshColors", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({ success: true });
		mockEnforceRateLimit.mockResolvedValue({ success: true });

		mockSuccess.mockImplementation((msg: string) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
		}));
		mockHandleActionError.mockImplementation((_e: unknown, f: string) => ({
			status: ActionStatus.ERROR,
			message: f,
		}));
	});

	it("returns auth error when user is not admin", async () => {
		mockRequireAdmin.mockResolvedValue({
			error: { status: ActionStatus.FORBIDDEN, message: "Admin requis" },
		});
		const result = await refreshColors(undefined, new FormData());
		expect(result.status).toBe(ActionStatus.FORBIDDEN);
		expect(mockUpdateTag).not.toHaveBeenCalled();
	});

	it("returns error when rate limited", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Rate limited" },
		});
		const result = await refreshColors(undefined, new FormData());
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockUpdateTag).not.toHaveBeenCalled();
	});

	it("invalidates both colors list and admin badges cache tags", async () => {
		await refreshColors(undefined, new FormData());

		expect(mockUpdateTag).toHaveBeenCalledTimes(2);
		expect(mockUpdateTag).toHaveBeenCalledWith("colors-list");
		expect(mockUpdateTag).toHaveBeenCalledWith("admin-badges");
	});

	it("returns success message", async () => {
		const result = await refreshColors(undefined, new FormData());
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("calls handleActionError on unexpected exception", async () => {
		mockRequireAdmin.mockRejectedValue(new Error("Unexpected"));
		const result = await refreshColors(undefined, new FormData());
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockHandleActionError).toHaveBeenCalledWith(
			expect.any(Error),
			"Une erreur est survenue lors du rafraîchissement",
		);
	});
});
