import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockPrisma,
	mockRequireAdminWithUser,
	mockEnforceRateLimit,
	mockValidateInput,
	mockSuccess,
	mockError,
	mockHandleActionError,
	mockUpdateTag,
	mockGetUserFullInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		user: { findMany: vi.fn(), updateMany: vi.fn() },
		session: { deleteMany: vi.fn() },
		$transaction: vi.fn(),
	},
	mockRequireAdminWithUser: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockValidateInput: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockGetUserFullInvalidationTags: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));

vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdminWithUser: mockRequireAdminWithUser,
}));

vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));

vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_USER_LIMITS: { BULK_OPERATIONS: "user-bulk" },
}));

vi.mock("@/shared/lib/actions", () => ({
	validateInput: mockValidateInput,
	success: mockSuccess,
	error: mockError,
	handleActionError: mockHandleActionError,
}));

vi.mock("next/cache", () => ({
	updateTag: mockUpdateTag,
	cacheLife: vi.fn(),
	cacheTag: vi.fn(),
}));

vi.mock("../../../schemas/user-admin.schemas", () => ({
	bulkSuspendUsersSchema: {},
}));

vi.mock("@/shared/constants/cache-tags", () => ({
	SHARED_CACHE_TAGS: {
		ADMIN_CUSTOMERS_LIST: "admin-customers-list",
		ADMIN_BADGES: "admin-badges",
	},
}));

vi.mock("../../../constants/cache", () => ({
	getUserFullInvalidationTags: mockGetUserFullInvalidationTags,
}));

vi.mock("@/app/generated/prisma/client", () => ({
	AccountStatus: { ACTIVE: "ACTIVE", INACTIVE: "INACTIVE" },
}));

import { bulkSuspendUsers } from "../bulk-suspend-users";

// ============================================================================
// HELPERS
// ============================================================================

function createFormData(data: Record<string, string>): FormData {
	const formData = new FormData();
	for (const [key, value] of Object.entries(data)) {
		formData.set(key, value);
	}
	return formData;
}

const validIds = ["user-1", "user-2"];
const validFormData = createFormData({ ids: JSON.stringify(validIds) });

// ============================================================================
// bulkSuspendUsers
// ============================================================================

describe("bulkSuspendUsers", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockRequireAdminWithUser.mockResolvedValue({ user: { id: "admin-123" } });
		mockValidateInput.mockReturnValue({ data: { ids: validIds } });
		mockPrisma.user.findMany.mockResolvedValue([{ id: "user-1" }, { id: "user-2" }]);
		mockPrisma.$transaction.mockResolvedValue([{}, { count: 2 }]);
		mockGetUserFullInvalidationTags.mockReturnValue(["user-tag"]);

		mockSuccess.mockImplementation((msg: string, data?: unknown) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
			data,
		}));
		mockError.mockImplementation((msg: string) => ({
			status: ActionStatus.ERROR,
			message: msg,
		}));
		mockHandleActionError.mockImplementation((_e: unknown, msg: string) => ({
			status: ActionStatus.ERROR,
			message: msg,
		}));
	});

	// ──────────────────────────────────────────────────────────────
	// Rate limit
	// ──────────────────────────────────────────────────────────────

	it("should return rate limit error when rate limited", async () => {
		const rateLimitError = { status: ActionStatus.ERROR, message: "Trop de requêtes" };
		mockEnforceRateLimit.mockResolvedValue({ error: rateLimitError });

		const result = await bulkSuspendUsers(undefined, validFormData);

		expect(result).toEqual(rateLimitError);
		expect(mockRequireAdminWithUser).not.toHaveBeenCalled();
	});

	// ──────────────────────────────────────────────────────────────
	// Auth
	// ──────────────────────────────────────────────────────────────

	it("should return auth error when not admin", async () => {
		const authError = { status: ActionStatus.UNAUTHORIZED, message: "Non autorisé" };
		mockRequireAdminWithUser.mockResolvedValue({ error: authError });

		const result = await bulkSuspendUsers(undefined, validFormData);

		expect(result).toEqual(authError);
	});

	// ──────────────────────────────────────────────────────────────
	// JSON parsing
	// ──────────────────────────────────────────────────────────────

	it("should return error for malformed JSON ids", async () => {
		const badFormData = createFormData({ ids: "not-json" });

		const result = await bulkSuspendUsers(undefined, badFormData);

		expect(mockError).toHaveBeenCalledWith("Format des IDs invalide.");
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	// ──────────────────────────────────────────────────────────────
	// Self-suspension guard
	// ──────────────────────────────────────────────────────────────

	it("should block self-suspension", async () => {
		mockValidateInput.mockReturnValue({ data: { ids: ["admin-123", "user-1"] } });

		const result = await bulkSuspendUsers(undefined, validFormData);

		expect(mockError).toHaveBeenCalledWith("Vous ne pouvez pas suspendre votre propre compte.");
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockPrisma.user.findMany).not.toHaveBeenCalled();
	});

	// ──────────────────────────────────────────────────────────────
	// Eligible users
	// ──────────────────────────────────────────────────────────────

	it("should return error when no eligible users found", async () => {
		mockPrisma.user.findMany.mockResolvedValue([]);

		const result = await bulkSuspendUsers(undefined, validFormData);

		expect(mockError).toHaveBeenCalledWith("Aucun utilisateur eligible pour la suspension.");
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	it("should filter eligible users by notDeleted and not already suspended", async () => {
		await bulkSuspendUsers(undefined, validFormData);

		expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					id: { in: validIds },
					deletedAt: null,
					suspendedAt: null,
				}),
			})
		);
	});

	// ──────────────────────────────────────────────────────────────
	// Success — bulk suspend with transaction
	// ──────────────────────────────────────────────────────────────

	it("should use transaction to suspend users and delete sessions", async () => {
		await bulkSuspendUsers(undefined, validFormData);

		expect(mockPrisma.$transaction).toHaveBeenCalledWith(expect.any(Array));
		const transactionArray = mockPrisma.$transaction.mock.calls[0][0];
		expect(transactionArray).toHaveLength(2);
	});

	it("should return success with correct count", async () => {
		const result = await bulkSuspendUsers(undefined, validFormData);

		expect(mockSuccess).toHaveBeenCalledWith(
			expect.stringContaining("2")
		);
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	// ──────────────────────────────────────────────────────────────
	// Cache invalidation
	// ──────────────────────────────────────────────────────────────

	it("should invalidate shared cache tags after suspension", async () => {
		await bulkSuspendUsers(undefined, validFormData);

		expect(mockUpdateTag).toHaveBeenCalledWith("admin-customers-list");
		expect(mockUpdateTag).toHaveBeenCalledWith("admin-badges");
	});

	it("should invalidate per-user cache tags", async () => {
		mockGetUserFullInvalidationTags.mockReturnValue(["tag-a"]);

		await bulkSuspendUsers(undefined, validFormData);

		expect(mockGetUserFullInvalidationTags).toHaveBeenCalledWith("user-1");
		expect(mockGetUserFullInvalidationTags).toHaveBeenCalledWith("user-2");
		expect(mockUpdateTag).toHaveBeenCalledWith("tag-a");
	});

	// ──────────────────────────────────────────────────────────────
	// Error handling
	// ──────────────────────────────────────────────────────────────

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.$transaction.mockRejectedValue(new Error("DB error"));

		const result = await bulkSuspendUsers(undefined, validFormData);

		expect(mockHandleActionError).toHaveBeenCalledWith(
			expect.any(Error),
			"Erreur lors de la suspension des utilisateurs"
		);
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
