import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockPrisma,
	mockRequireAdmin,
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
	},
	mockRequireAdmin: vi.fn(),
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
}));

vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdmin: mockRequireAdmin,
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
	bulkRestoreUsersSchema: {},
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
	AccountStatus: { ACTIVE: "ACTIVE", INACTIVE: "INACTIVE" },
}));

import { bulkRestoreUsers } from "../bulk-restore-users";

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

const validIds = ["user-1", "user-2", "user-3"];
const validFormData = createFormData({ ids: JSON.stringify(validIds) });

// ============================================================================
// bulkRestoreUsers
// ============================================================================

describe("bulkRestoreUsers", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockRequireAdmin.mockResolvedValue({ user: { id: "admin-123" } });
		mockValidateInput.mockReturnValue({ data: { ids: validIds } });
		mockPrisma.user.findMany.mockResolvedValue([{ id: "user-1" }, { id: "user-2" }]);
		mockPrisma.user.updateMany.mockResolvedValue({ count: 2 });
		mockGetUserFullInvalidationTags.mockReturnValue(["user-tag-1"]);

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

		const result = await bulkRestoreUsers(undefined, validFormData);

		expect(result).toEqual(rateLimitError);
		expect(mockRequireAdmin).not.toHaveBeenCalled();
	});

	// ──────────────────────────────────────────────────────────────
	// Auth
	// ──────────────────────────────────────────────────────────────

	it("should return auth error when not admin", async () => {
		const authError = { status: ActionStatus.UNAUTHORIZED, message: "Non autorisé" };
		mockRequireAdmin.mockResolvedValue({ error: authError });

		const result = await bulkRestoreUsers(undefined, validFormData);

		expect(result).toEqual(authError);
	});

	// ──────────────────────────────────────────────────────────────
	// JSON parsing
	// ──────────────────────────────────────────────────────────────

	it("should return error for malformed JSON ids", async () => {
		const badFormData = createFormData({ ids: "not-json" });

		const result = await bulkRestoreUsers(undefined, badFormData);

		expect(mockError).toHaveBeenCalledWith("Format des IDs invalide.");
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	// ──────────────────────────────────────────────────────────────
	// Validation
	// ──────────────────────────────────────────────────────────────

	it("should return validation error for invalid data", async () => {
		const validationError = { status: ActionStatus.VALIDATION_ERROR, message: "IDs invalides" };
		mockValidateInput.mockReturnValue({ error: validationError });

		const result = await bulkRestoreUsers(undefined, validFormData);

		expect(result).toEqual(validationError);
	});

	// ──────────────────────────────────────────────────────────────
	// Eligible users
	// ──────────────────────────────────────────────────────────────

	it("should return error when no eligible users found", async () => {
		mockPrisma.user.findMany.mockResolvedValue([]);

		const result = await bulkRestoreUsers(undefined, validFormData);

		expect(mockError).toHaveBeenCalledWith("Aucun utilisateur eligible pour la restauration.");
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockPrisma.user.updateMany).not.toHaveBeenCalled();
	});

	it("should filter eligible users by deletedAt or suspendedAt", async () => {
		await bulkRestoreUsers(undefined, validFormData);

		expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					id: { in: validIds },
					OR: [
						{ deletedAt: { not: null } },
						{ suspendedAt: { not: null } },
					],
				}),
			})
		);
	});

	// ──────────────────────────────────────────────────────────────
	// Success — bulk restore
	// ──────────────────────────────────────────────────────────────

	it("should update eligible users with correct data", async () => {
		await bulkRestoreUsers(undefined, validFormData);

		expect(mockPrisma.user.updateMany).toHaveBeenCalledWith({
			where: { id: { in: ["user-1", "user-2"] } },
			data: {
				deletedAt: null,
				suspendedAt: null,
				accountStatus: "ACTIVE",
			},
		});
	});

	it("should return success with correct count", async () => {
		mockPrisma.user.updateMany.mockResolvedValue({ count: 2 });

		const result = await bulkRestoreUsers(undefined, validFormData);

		expect(mockSuccess).toHaveBeenCalledWith(
			expect.stringContaining("2")
		);
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("should use singular form for single user", async () => {
		mockPrisma.user.findMany.mockResolvedValue([{ id: "user-1" }]);
		mockPrisma.user.updateMany.mockResolvedValue({ count: 1 });

		await bulkRestoreUsers(undefined, validFormData);

		const message = mockSuccess.mock.calls[0][0];
		expect(message).not.toContain("utilisateurs");
		expect(message).toContain("utilisateur");
	});

	// ──────────────────────────────────────────────────────────────
	// Cache invalidation
	// ──────────────────────────────────────────────────────────────

	it("should invalidate all required cache tags", async () => {
		await bulkRestoreUsers(undefined, validFormData);

		expect(mockUpdateTag).toHaveBeenCalledWith("admin-customers-list");
		expect(mockUpdateTag).toHaveBeenCalledWith("admin-badges");
		expect(mockUpdateTag).toHaveBeenCalledWith("accounts-list");
	});

	it("should invalidate per-user cache tags for each eligible user", async () => {
		mockPrisma.user.findMany.mockResolvedValue([{ id: "user-1" }, { id: "user-2" }]);
		mockGetUserFullInvalidationTags.mockReturnValue(["tag-a", "tag-b"]);

		await bulkRestoreUsers(undefined, validFormData);

		expect(mockGetUserFullInvalidationTags).toHaveBeenCalledWith("user-1");
		expect(mockGetUserFullInvalidationTags).toHaveBeenCalledWith("user-2");
		expect(mockUpdateTag).toHaveBeenCalledWith("tag-a");
		expect(mockUpdateTag).toHaveBeenCalledWith("tag-b");
	});

	// ──────────────────────────────────────────────────────────────
	// Error handling
	// ──────────────────────────────────────────────────────────────

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.user.updateMany.mockRejectedValue(new Error("DB error"));

		const result = await bulkRestoreUsers(undefined, validFormData);

		expect(mockHandleActionError).toHaveBeenCalledWith(
			expect.any(Error),
			"Erreur lors de la restauration des utilisateurs"
		);
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
