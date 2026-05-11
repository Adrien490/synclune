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
	mockNotFound,
	mockHandleActionError,
	mockUpdateTag,
	mockGetUserFullInvalidationTags,
	MockBusinessError,
} = vi.hoisted(() => {
	class BusinessErrorMock extends Error {
		readonly code?: string;
		constructor(message: string, code?: string) {
			super(message);
			this.name = "BusinessError";
			this.code = code;
		}
	}
	return {
		mockPrisma: {
			user: { findUnique: vi.fn(), update: vi.fn(), count: vi.fn() },
			$transaction: vi.fn(),
		},
		mockRequireAdmin: vi.fn(),
		mockEnforceRateLimit: vi.fn(),
		mockValidateInput: vi.fn(),
		mockSuccess: vi.fn(),
		mockError: vi.fn(),
		mockNotFound: vi.fn(),
		mockHandleActionError: vi.fn(),
		mockUpdateTag: vi.fn(),
		mockGetUserFullInvalidationTags: vi.fn(),
		MockBusinessError: BusinessErrorMock,
	};
});

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));

vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdminWithUser: mockRequireAdmin,
}));

vi.mock("@/shared/lib/audit-log", () => ({
	logAudit: vi.fn(),
	logAuditTx: vi.fn(),
}));

vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));

vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_USER_LIMITS: { SINGLE_OPERATIONS: "user-single" },
}));

vi.mock("@/shared/lib/actions", () => ({
	safeFormGet: (formData: FormData, key: string) => {
		const v = formData.get(key);
		return typeof v === "string" ? v : null;
	},
	validateInput: mockValidateInput,
	success: mockSuccess,
	error: mockError,
	notFound: mockNotFound,
	handleActionError: mockHandleActionError,
	BusinessError: MockBusinessError,
}));

vi.mock("next/cache", () => ({
	updateTag: mockUpdateTag,
	cacheLife: vi.fn(),
	cacheTag: vi.fn(),
}));

vi.mock("../../../schemas/user-admin.schemas", () => ({
	changeUserRoleSchema: {},
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

import { changeUserRole } from "../change-user-role";

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

function makeUser(overrides: Record<string, unknown> = {}) {
	return {
		id: "user-456",
		name: "Marie Dupont",
		email: "marie@example.com",
		role: "USER",
		deletedAt: null,
		...overrides,
	};
}

const promoteFormData = createFormData({ id: "user-456", role: "ADMIN" });
const demoteFormData = createFormData({ id: "user-456", role: "USER" });

// ============================================================================
// changeUserRole
// ============================================================================

describe("changeUserRole", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockRequireAdmin.mockResolvedValue({ user: { id: "admin-123", name: "Admin" } });
		mockValidateInput.mockReturnValue({ data: { id: "user-456", role: "ADMIN" } });
		mockPrisma.user.findUnique.mockResolvedValue(makeUser({ role: "USER" }));
		mockPrisma.user.update.mockResolvedValue({});
		mockGetUserFullInvalidationTags.mockReturnValue(["user-tag-1", "user-tag-2"]);

		mockPrisma.$transaction.mockImplementation(async (callback: unknown) => {
			if (typeof callback === "function") {
				return await (callback as (tx: typeof mockPrisma) => unknown)(mockPrisma);
			}
			return [];
		});

		mockSuccess.mockImplementation((msg: string, data?: unknown) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
			data,
		}));
		mockError.mockImplementation((msg: string) => ({
			status: ActionStatus.ERROR,
			message: msg,
		}));
		mockNotFound.mockImplementation((entity: string) => ({
			status: ActionStatus.NOT_FOUND,
			message: `${entity} introuvable`,
		}));
		mockHandleActionError.mockImplementation((e: unknown, fallbackMsg: string) => {
			const message = e instanceof MockBusinessError ? e.message : fallbackMsg;
			return { status: ActionStatus.ERROR, message };
		});
	});

	// ──────────────────────────────────────────────────────────────
	// Rate limit
	// ──────────────────────────────────────────────────────────────

	it("should return rate limit error when rate limited", async () => {
		const rateLimitError = { status: ActionStatus.ERROR, message: "Trop de requêtes" };
		mockEnforceRateLimit.mockResolvedValue({ error: rateLimitError });

		const result = await changeUserRole(undefined, promoteFormData);

		expect(result).toEqual(rateLimitError);
		expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
	});

	// ──────────────────────────────────────────────────────────────
	// Auth
	// ──────────────────────────────────────────────────────────────

	it("should return auth error when not admin (before rate-limit)", async () => {
		const authError = { status: ActionStatus.UNAUTHORIZED, message: "Non autorisé" };
		mockRequireAdmin.mockResolvedValue({ error: authError });

		const result = await changeUserRole(undefined, promoteFormData);

		expect(result).toEqual(authError);
		expect(mockEnforceRateLimit).not.toHaveBeenCalled();
		expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
	});

	// ──────────────────────────────────────────────────────────────
	// Validation
	// ──────────────────────────────────────────────────────────────

	it("should return validation error for invalid data", async () => {
		const validationError = { status: ActionStatus.VALIDATION_ERROR, message: "Données invalides" };
		mockValidateInput.mockReturnValue({ error: validationError });

		const result = await changeUserRole(undefined, promoteFormData);

		expect(result).toEqual(validationError);
		expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
	});

	// ──────────────────────────────────────────────────────────────
	// Self-role-change
	// ──────────────────────────────────────────────────────────────

	it("should block self-role-change", async () => {
		mockRequireAdmin.mockResolvedValue({ user: { id: "user-456", name: "Admin" } });
		mockValidateInput.mockReturnValue({ data: { id: "user-456", role: "USER" } });

		const result = await changeUserRole(undefined, promoteFormData);

		expect(mockError).toHaveBeenCalledWith("Vous ne pouvez pas changer votre propre role.");
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
	});

	// ──────────────────────────────────────────────────────────────
	// User checks
	// ──────────────────────────────────────────────────────────────

	it("should return not found when user does not exist", async () => {
		mockPrisma.user.findUnique.mockResolvedValue(null);

		const result = await changeUserRole(undefined, promoteFormData);

		expect(mockNotFound).toHaveBeenCalledWith("Utilisateur");
		expect(result.status).toBe(ActionStatus.NOT_FOUND);
	});

	it("should return error when user is deleted", async () => {
		mockPrisma.user.findUnique.mockResolvedValue(makeUser({ deletedAt: new Date() }));

		const result = await changeUserRole(undefined, promoteFormData);

		expect(mockError).toHaveBeenCalledWith(
			"Impossible de changer le role d'un utilisateur supprime.",
		);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockPrisma.user.update).not.toHaveBeenCalled();
	});

	it("should return error when user already has the target role", async () => {
		mockPrisma.user.findUnique.mockResolvedValue(makeUser({ role: "ADMIN" }));
		mockValidateInput.mockReturnValue({ data: { id: "user-456", role: "ADMIN" } });

		const result = await changeUserRole(undefined, promoteFormData);

		expect(mockError).toHaveBeenCalledWith("Cet utilisateur a deja le role ADMIN.");
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockPrisma.user.update).not.toHaveBeenCalled();
	});

	// ──────────────────────────────────────────────────────────────
	// Last admin protection (atomic count + update — TOCTOU-safe)
	// ──────────────────────────────────────────────────────────────

	it("should block downgrade of the last admin", async () => {
		mockPrisma.user.findUnique.mockResolvedValue(makeUser({ role: "ADMIN" }));
		mockValidateInput.mockReturnValue({ data: { id: "user-456", role: "USER" } });
		// 0 autre admin → bloque (count exclut le user en cours via id: {not: userId})
		mockPrisma.user.count.mockResolvedValue(0);

		const result = await changeUserRole(undefined, demoteFormData);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("dernier administrateur");
		expect(mockPrisma.user.update).not.toHaveBeenCalled();
	});

	it("should allow downgrade of an admin when other admins exist", async () => {
		mockPrisma.user.findUnique.mockResolvedValue(makeUser({ role: "ADMIN" }));
		mockValidateInput.mockReturnValue({ data: { id: "user-456", role: "USER" } });
		mockPrisma.user.count.mockResolvedValue(2);

		const result = await changeUserRole(undefined, demoteFormData);

		expect(mockPrisma.user.update).toHaveBeenCalledWith({
			where: { id: "user-456" },
			data: { role: "USER" },
		});
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("should not check admin count when promoting a user to admin", async () => {
		mockPrisma.user.findUnique.mockResolvedValue(makeUser({ role: "USER" }));
		mockValidateInput.mockReturnValue({ data: { id: "user-456", role: "ADMIN" } });

		await changeUserRole(undefined, promoteFormData);

		expect(mockPrisma.user.count).not.toHaveBeenCalled();
	});

	it("should use a Serializable transaction for the role change", async () => {
		mockPrisma.user.findUnique.mockResolvedValue(makeUser({ role: "USER" }));
		mockValidateInput.mockReturnValue({ data: { id: "user-456", role: "ADMIN" } });

		await changeUserRole(undefined, promoteFormData);

		expect(mockPrisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
			isolationLevel: "Serializable",
		});
	});

	it("should exclude the target userId from the remaining-admins count", async () => {
		mockPrisma.user.findUnique.mockResolvedValue(makeUser({ role: "ADMIN" }));
		mockValidateInput.mockReturnValue({ data: { id: "user-456", role: "USER" } });
		mockPrisma.user.count.mockResolvedValue(2);

		await changeUserRole(undefined, demoteFormData);

		expect(mockPrisma.user.count).toHaveBeenCalledWith({
			where: { role: "ADMIN", deletedAt: null, id: { not: "user-456" } },
		});
	});

	// ──────────────────────────────────────────────────────────────
	// Success — role update
	// ──────────────────────────────────────────────────────────────

	it("should update user role with correct data", async () => {
		mockPrisma.user.findUnique.mockResolvedValue(makeUser({ role: "USER" }));
		mockValidateInput.mockReturnValue({ data: { id: "user-456", role: "ADMIN" } });

		await changeUserRole(undefined, promoteFormData);

		expect(mockPrisma.user.update).toHaveBeenCalledWith({
			where: { id: "user-456" },
			data: { role: "ADMIN" },
		});
	});

	it("should return success with 'administrateur' label when promoting to ADMIN", async () => {
		mockPrisma.user.findUnique.mockResolvedValue(makeUser({ role: "USER" }));
		mockValidateInput.mockReturnValue({ data: { id: "user-456", role: "ADMIN" } });

		const result = await changeUserRole(undefined, promoteFormData);

		expect(mockSuccess).toHaveBeenCalledWith(expect.stringContaining("administrateur"));
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("should return success with 'utilisateur' label when demoting to USER", async () => {
		mockPrisma.user.findUnique.mockResolvedValue(makeUser({ role: "ADMIN" }));
		mockValidateInput.mockReturnValue({ data: { id: "user-456", role: "USER" } });
		mockPrisma.user.count.mockResolvedValue(2);

		const result = await changeUserRole(undefined, demoteFormData);

		expect(mockSuccess).toHaveBeenCalledWith(expect.stringContaining("utilisateur"));
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("should include user display name in success message", async () => {
		mockPrisma.user.findUnique.mockResolvedValue(makeUser({ role: "USER", name: "Marie Dupont" }));
		mockValidateInput.mockReturnValue({ data: { id: "user-456", role: "ADMIN" } });

		await changeUserRole(undefined, promoteFormData);

		expect(mockSuccess).toHaveBeenCalledWith(expect.stringContaining("Marie Dupont"));
	});

	it("should fall back to email in success message when name is null", async () => {
		mockPrisma.user.findUnique.mockResolvedValue(
			makeUser({ role: "USER", name: null, email: "marie@example.com" }),
		);
		mockValidateInput.mockReturnValue({ data: { id: "user-456", role: "ADMIN" } });

		await changeUserRole(undefined, promoteFormData);

		expect(mockSuccess).toHaveBeenCalledWith(expect.stringContaining("marie@example.com"));
	});

	// ──────────────────────────────────────────────────────────────
	// Cache invalidation
	// ──────────────────────────────────────────────────────────────

	it("should invalidate shared cache tags after role change", async () => {
		await changeUserRole(undefined, promoteFormData);

		expect(mockUpdateTag).toHaveBeenCalledWith("admin-customers-list");
		expect(mockUpdateTag).toHaveBeenCalledWith("admin-badges");
	});

	it("should invalidate user-specific cache tags after role change", async () => {
		mockGetUserFullInvalidationTags.mockReturnValue(["user-tag-1", "user-tag-2"]);

		await changeUserRole(undefined, promoteFormData);

		expect(mockGetUserFullInvalidationTags).toHaveBeenCalledWith("user-456");
		expect(mockUpdateTag).toHaveBeenCalledWith("user-tag-1");
		expect(mockUpdateTag).toHaveBeenCalledWith("user-tag-2");
	});

	// ──────────────────────────────────────────────────────────────
	// Error handling
	// ──────────────────────────────────────────────────────────────

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.user.update.mockRejectedValue(new Error("DB connection failed"));

		const result = await changeUserRole(undefined, promoteFormData);

		expect(mockHandleActionError).toHaveBeenCalledWith(
			expect.any(Error),
			"Erreur lors du changement de role",
		);
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
