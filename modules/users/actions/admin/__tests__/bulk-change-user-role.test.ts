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
	bulkChangeUserRoleSchema: {},
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
	Role: { ADMIN: "ADMIN", USER: "USER" },
}));

import { bulkChangeUserRole } from "../bulk-change-user-role";

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
const validFormData = createFormData({
	ids: JSON.stringify(validIds),
	role: "ADMIN",
});

// ============================================================================
// bulkChangeUserRole
// ============================================================================

describe("bulkChangeUserRole", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockRequireAdminWithUser.mockResolvedValue({ user: { id: "admin-123" } });
		mockValidateInput.mockReturnValue({ data: { ids: validIds, role: "ADMIN" } });
		mockPrisma.user.findMany.mockResolvedValue([
			{ id: "user-1", role: "USER" },
			{ id: "user-2", role: "USER" },
		]);
		mockPrisma.user.updateMany.mockResolvedValue({ count: 2 });
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

		const result = await bulkChangeUserRole(undefined, validFormData);

		expect(result).toEqual(rateLimitError);
		expect(mockRequireAdminWithUser).not.toHaveBeenCalled();
	});

	// ──────────────────────────────────────────────────────────────
	// Auth
	// ──────────────────────────────────────────────────────────────

	it("should return auth error when not admin", async () => {
		const authError = { status: ActionStatus.UNAUTHORIZED, message: "Non autorisé" };
		mockRequireAdminWithUser.mockResolvedValue({ error: authError });

		const result = await bulkChangeUserRole(undefined, validFormData);

		expect(result).toEqual(authError);
	});

	// ──────────────────────────────────────────────────────────────
	// JSON parsing
	// ──────────────────────────────────────────────────────────────

	it("should return error for malformed JSON ids", async () => {
		const badFormData = createFormData({ ids: "not-json", role: "ADMIN" });

		const result = await bulkChangeUserRole(undefined, badFormData);

		expect(mockError).toHaveBeenCalledWith("Format des IDs invalide.");
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	// ──────────────────────────────────────────────────────────────
	// Self-role-change guard
	// ──────────────────────────────────────────────────────────────

	it("should block self-role-change", async () => {
		mockValidateInput.mockReturnValue({ data: { ids: ["admin-123", "user-1"], role: "USER" } });

		const result = await bulkChangeUserRole(undefined, validFormData);

		expect(mockError).toHaveBeenCalledWith("Vous ne pouvez pas changer votre propre role.");
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockPrisma.user.findMany).not.toHaveBeenCalled();
	});

	// ──────────────────────────────────────────────────────────────
	// Eligible users
	// ──────────────────────────────────────────────────────────────

	it("should return error when no eligible users found", async () => {
		mockPrisma.user.findMany.mockResolvedValue([]);

		const result = await bulkChangeUserRole(undefined, validFormData);

		expect(mockError).toHaveBeenCalledWith("Aucun utilisateur eligible pour le changement de role.");
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should filter by role different from target role", async () => {
		await bulkChangeUserRole(undefined, validFormData);

		expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					role: { not: "ADMIN" },
				}),
			})
		);
	});

	// ──────────────────────────────────────────────────────────────
	// Last admin protection
	// ──────────────────────────────────────────────────────────────

	it("should block downgrade when it would remove all admins", async () => {
		mockValidateInput.mockReturnValue({ data: { ids: validIds, role: "USER" } });
		mockPrisma.user.findMany.mockResolvedValue([
			{ id: "user-1", role: "ADMIN" },
		]);
		mockPrisma.user.count.mockResolvedValue(1);

		const result = await bulkChangeUserRole(undefined, validFormData);

		expect(mockError).toHaveBeenCalledWith(
			expect.stringContaining("Au moins un admin doit rester")
		);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockPrisma.user.updateMany).not.toHaveBeenCalled();
	});

	it("should allow downgrade when other admins remain", async () => {
		mockValidateInput.mockReturnValue({ data: { ids: validIds, role: "USER" } });
		mockPrisma.user.findMany.mockResolvedValue([
			{ id: "user-1", role: "ADMIN" },
		]);
		mockPrisma.user.count.mockResolvedValue(3);

		const result = await bulkChangeUserRole(undefined, validFormData);

		expect(mockPrisma.user.updateMany).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("should not check admin count when promoting to admin", async () => {
		mockValidateInput.mockReturnValue({ data: { ids: validIds, role: "ADMIN" } });
		mockPrisma.user.findMany.mockResolvedValue([
			{ id: "user-1", role: "USER" },
		]);

		await bulkChangeUserRole(undefined, validFormData);

		expect(mockPrisma.user.count).not.toHaveBeenCalled();
	});

	it("should not check admin count when downgrading only non-admins", async () => {
		mockValidateInput.mockReturnValue({ data: { ids: validIds, role: "USER" } });
		mockPrisma.user.findMany.mockResolvedValue([
			{ id: "user-1", role: "USER" },
		]);

		await bulkChangeUserRole(undefined, validFormData);

		expect(mockPrisma.user.count).not.toHaveBeenCalled();
	});

	// ──────────────────────────────────────────────────────────────
	// Success — bulk role change
	// ──────────────────────────────────────────────────────────────

	it("should update eligible users with new role", async () => {
		await bulkChangeUserRole(undefined, validFormData);

		expect(mockPrisma.user.updateMany).toHaveBeenCalledWith({
			where: { id: { in: ["user-1", "user-2"] } },
			data: { role: "ADMIN" },
		});
	});

	it("should return success with correct count and role label", async () => {
		const result = await bulkChangeUserRole(undefined, validFormData);

		expect(mockSuccess).toHaveBeenCalledWith(
			expect.stringContaining("administrateurs")
		);
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("should use 'utilisateurs' label when demoting to USER", async () => {
		mockValidateInput.mockReturnValue({ data: { ids: validIds, role: "USER" } });
		mockPrisma.user.findMany.mockResolvedValue([{ id: "user-1", role: "ADMIN" }]);
		mockPrisma.user.count.mockResolvedValue(5);

		await bulkChangeUserRole(undefined, validFormData);

		expect(mockSuccess).toHaveBeenCalledWith(
			expect.stringContaining("utilisateurs")
		);
	});

	// ──────────────────────────────────────────────────────────────
	// Cache invalidation
	// ──────────────────────────────────────────────────────────────

	it("should invalidate shared and per-user cache tags", async () => {
		await bulkChangeUserRole(undefined, validFormData);

		expect(mockUpdateTag).toHaveBeenCalledWith("admin-customers-list");
		expect(mockUpdateTag).toHaveBeenCalledWith("admin-badges");
		expect(mockGetUserFullInvalidationTags).toHaveBeenCalledWith("user-1");
		expect(mockGetUserFullInvalidationTags).toHaveBeenCalledWith("user-2");
	});

	// ──────────────────────────────────────────────────────────────
	// Error handling
	// ──────────────────────────────────────────────────────────────

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.user.updateMany.mockRejectedValue(new Error("DB error"));

		const result = await bulkChangeUserRole(undefined, validFormData);

		expect(mockHandleActionError).toHaveBeenCalledWith(
			expect.any(Error),
			"Erreur lors du changement de role"
		);
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
