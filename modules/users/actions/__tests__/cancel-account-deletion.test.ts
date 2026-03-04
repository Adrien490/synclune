import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { VALID_USER_ID } from "@/test/factories";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockPrisma,
	mockRequireAuth,
	mockEnforceRateLimit,
	mockUpdateTag,
	mockHandleActionError,
	mockSuccess,
	mockError,
} = vi.hoisted(() => ({
	mockPrisma: {
		user: { findUnique: vi.fn(), update: vi.fn() },
	},
	mockRequireAuth: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/modules/auth/lib/require-auth", () => ({ requireAuth: mockRequireAuth }));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	USER_LIMITS: { CANCEL_DELETION: "user-cancel-deletion" },
}));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag, cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("@/shared/lib/actions", () => ({
	handleActionError: mockHandleActionError,
	success: mockSuccess,
	error: mockError,
}));
vi.mock("@/shared/constants/cache-tags", () => ({
	SHARED_CACHE_TAGS: { ADMIN_CUSTOMERS_LIST: "admin-customers-list" },
}));
vi.mock("../../constants/cache", () => ({
	USERS_CACHE_TAGS: { CURRENT_USER: (id: string) => `user-${id}` },
}));

import { cancelAccountDeletion } from "../cancel-account-deletion";

// ============================================================================
// TESTS
// ============================================================================

describe("cancelAccountDeletion", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockRequireAuth.mockResolvedValue({
			user: { id: VALID_USER_ID, email: "user@example.com", name: "User" },
		});
		mockPrisma.user.findUnique.mockResolvedValue({ accountStatus: "PENDING_DELETION" });
		mockPrisma.user.update.mockResolvedValue({});

		mockSuccess.mockImplementation((msg: string) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
		}));
		mockError.mockImplementation((msg: string) => ({ status: ActionStatus.ERROR, message: msg }));
		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));
	});

	it("should return rate limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Rate" },
		});
		const result = await cancelAccountDeletion(undefined);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should return auth error when not authenticated", async () => {
		mockRequireAuth.mockResolvedValue({
			error: { status: ActionStatus.UNAUTHORIZED, message: "No" },
		});
		const result = await cancelAccountDeletion(undefined);
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
	});

	it("should return error when account is not pending deletion (ACTIVE status)", async () => {
		mockPrisma.user.findUnique.mockResolvedValue({ accountStatus: "ACTIVE" });
		const result = await cancelAccountDeletion(undefined);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("Aucune demande de suppression");
	});

	it("should return error when user not found (null)", async () => {
		mockPrisma.user.findUnique.mockResolvedValue(null);
		const result = await cancelAccountDeletion(undefined);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("Aucune demande de suppression");
	});

	it("should update user with ACTIVE status and null deletionRequestedAt", async () => {
		await cancelAccountDeletion(undefined);
		expect(mockPrisma.user.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: VALID_USER_ID },
				data: expect.objectContaining({
					accountStatus: "ACTIVE",
					deletionRequestedAt: null,
				}),
			}),
		);
	});

	it("should invalidate cache tags", async () => {
		await cancelAccountDeletion(undefined);
		expect(mockUpdateTag).toHaveBeenCalledWith(`user-${VALID_USER_ID}`);
		expect(mockUpdateTag).toHaveBeenCalledWith("admin-customers-list");
	});

	it("should succeed with proper message", async () => {
		const result = await cancelAccountDeletion(undefined);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("annulée");
	});

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.user.findUnique.mockRejectedValue(new Error("DB crash"));
		const result = await cancelAccountDeletion(undefined);
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
