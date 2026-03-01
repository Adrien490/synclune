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
		user: { findMany: vi.fn(), updateMany: vi.fn(), count: vi.fn() },
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
	safeFormGet: (formData: FormData, key: string) => {
		const v = formData.get(key);
		return typeof v === "string" ? v : null;
	},
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
	bulkDeleteUsersSchema: {},
}));

vi.mock("@/shared/constants/cache-tags", () => ({
	SHARED_CACHE_TAGS: {
		ADMIN_CUSTOMERS_LIST: "admin-customers-list",
		ADMIN_BADGES: "admin-badges",
	},
}));

vi.mock("../../../constants/cache", () => ({
	getUserFullInvalidationTags: mockGetUserFullInvalidationTags,
	USERS_CACHE_TAGS: { ACCOUNTS_LIST: "accounts-list" },
}));

vi.mock("@/app/generated/prisma/client", () => ({
	Role: { ADMIN: "ADMIN", USER: "USER" },
}));

import { bulkDeleteUsers } from "../bulk-delete-users";

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
// bulkDeleteUsers
// ============================================================================

describe("bulkDeleteUsers", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockRequireAdminWithUser.mockResolvedValue({ user: { id: "admin-123" } });
		mockValidateInput.mockReturnValue({ data: { ids: validIds } });
		mockPrisma.user.findMany.mockResolvedValue([
			{ id: "user-1", role: "USER" },
			{ id: "user-2", role: "USER" },
		]);
		mockPrisma.$transaction.mockResolvedValue([{ count: 2 }, { count: 4 }]);
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

		const result = await bulkDeleteUsers(undefined, validFormData);

		expect(result).toEqual(rateLimitError);
		expect(mockRequireAdminWithUser).not.toHaveBeenCalled();
	});

	// ──────────────────────────────────────────────────────────────
	// Auth
	// ──────────────────────────────────────────────────────────────

	it("should return auth error when not admin", async () => {
		const authError = { status: ActionStatus.UNAUTHORIZED, message: "Non autorisé" };
		mockRequireAdminWithUser.mockResolvedValue({ error: authError });

		const result = await bulkDeleteUsers(undefined, validFormData);

		expect(result).toEqual(authError);
	});

	// ──────────────────────────────────────────────────────────────
	// JSON parsing
	// ──────────────────────────────────────────────────────────────

	it("should return error for malformed JSON ids", async () => {
		const badFormData = createFormData({ ids: "not-json" });

		const result = await bulkDeleteUsers(undefined, badFormData);

		expect(mockError).toHaveBeenCalledWith("Format des IDs invalide.");
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	// ──────────────────────────────────────────────────────────────
	// Self-deletion guard
	// ──────────────────────────────────────────────────────────────

	it("should block self-deletion", async () => {
		mockValidateInput.mockReturnValue({ data: { ids: ["admin-123", "user-1"] } });

		const result = await bulkDeleteUsers(undefined, validFormData);

		expect(mockError).toHaveBeenCalledWith("Vous ne pouvez pas supprimer votre propre compte.");
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockPrisma.user.findMany).not.toHaveBeenCalled();
	});

	// ──────────────────────────────────────────────────────────────
	// Eligible users
	// ──────────────────────────────────────────────────────────────

	it("should return error when no eligible users found", async () => {
		mockPrisma.user.findMany.mockResolvedValue([]);

		const result = await bulkDeleteUsers(undefined, validFormData);

		expect(mockError).toHaveBeenCalledWith("Aucun utilisateur eligible pour la suppression.");
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	it("should filter eligible users by notDeleted", async () => {
		await bulkDeleteUsers(undefined, validFormData);

		expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					id: { in: validIds },
					deletedAt: null,
				}),
			}),
		);
	});

	// ──────────────────────────────────────────────────────────────
	// Last admin protection
	// ──────────────────────────────────────────────────────────────

	it("should block deletion when it would remove all admins", async () => {
		mockPrisma.user.findMany.mockResolvedValue([{ id: "user-1", role: "ADMIN" }]);
		mockPrisma.user.count.mockResolvedValue(1);

		const result = await bulkDeleteUsers(undefined, validFormData);

		expect(mockError).toHaveBeenCalledWith(
			expect.stringContaining("Au moins un admin doit rester"),
		);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	it("should allow deletion when other admins remain", async () => {
		mockPrisma.user.findMany.mockResolvedValue([{ id: "user-1", role: "ADMIN" }]);
		mockPrisma.user.count.mockResolvedValue(3);

		const result = await bulkDeleteUsers(undefined, validFormData);

		expect(mockPrisma.$transaction).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("should not check admin count when no admins in selection", async () => {
		mockPrisma.user.findMany.mockResolvedValue([{ id: "user-1", role: "USER" }]);

		await bulkDeleteUsers(undefined, validFormData);

		expect(mockPrisma.user.count).not.toHaveBeenCalled();
	});

	// ──────────────────────────────────────────────────────────────
	// Success — bulk soft delete with transaction
	// ──────────────────────────────────────────────────────────────

	it("should use transaction for soft delete and session cleanup", async () => {
		await bulkDeleteUsers(undefined, validFormData);

		expect(mockPrisma.$transaction).toHaveBeenCalledWith(expect.any(Array));
		const transactionArray = mockPrisma.$transaction.mock.calls[0]![0];
		expect(transactionArray).toHaveLength(2);
	});

	it("should return success with correct count", async () => {
		mockPrisma.$transaction.mockResolvedValue([{ count: 2 }, { count: 3 }]);

		const result = await bulkDeleteUsers(undefined, validFormData);

		expect(mockSuccess).toHaveBeenCalledWith(expect.stringContaining("2"));
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	// ──────────────────────────────────────────────────────────────
	// Cache invalidation
	// ──────────────────────────────────────────────────────────────

	it("should invalidate all required cache tags", async () => {
		await bulkDeleteUsers(undefined, validFormData);

		expect(mockUpdateTag).toHaveBeenCalledWith("admin-customers-list");
		expect(mockUpdateTag).toHaveBeenCalledWith("admin-badges");
		expect(mockUpdateTag).toHaveBeenCalledWith("accounts-list");
	});

	it("should invalidate per-user cache tags for each eligible user", async () => {
		mockGetUserFullInvalidationTags.mockReturnValue(["tag-a", "tag-b"]);

		await bulkDeleteUsers(undefined, validFormData);

		expect(mockGetUserFullInvalidationTags).toHaveBeenCalledWith("user-1");
		expect(mockGetUserFullInvalidationTags).toHaveBeenCalledWith("user-2");
		expect(mockUpdateTag).toHaveBeenCalledWith("tag-a");
		expect(mockUpdateTag).toHaveBeenCalledWith("tag-b");
	});

	// ──────────────────────────────────────────────────────────────
	// Error handling
	// ──────────────────────────────────────────────────────────────

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.$transaction.mockRejectedValue(new Error("DB error"));

		const result = await bulkDeleteUsers(undefined, validFormData);

		expect(mockHandleActionError).toHaveBeenCalledWith(
			expect.any(Error),
			"Erreur lors de la suppression des utilisateurs",
		);
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
