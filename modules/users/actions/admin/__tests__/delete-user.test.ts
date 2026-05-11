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
			user: { findUnique: vi.fn(), count: vi.fn(), update: vi.fn() },
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
	ADMIN_USER_LIMITS: { DELETE_USER: "user-delete" },
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
	deleteUserSchema: {},
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
	AccountStatus: { ACTIVE: "ACTIVE", INACTIVE: "INACTIVE" },
}));

import { deleteUser } from "../delete-user";

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

const validFormData = createFormData({ id: "user-456" });

// ============================================================================
// deleteUser
// ============================================================================

describe("deleteUser", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockRequireAdmin.mockResolvedValue({ user: { id: "admin-123", name: "Admin" } });
		mockValidateInput.mockReturnValue({ data: { id: "user-456" } });
		mockPrisma.user.findUnique.mockResolvedValue(makeUser());
		mockPrisma.user.update.mockResolvedValue({});
		mockGetUserFullInvalidationTags.mockReturnValue(["user-tag-1", "user-tag-2"]);

		// $transaction propage la callback avec un tx qui partage les mêmes mocks.
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
		// BusinessError → ActionState ERROR avec son propre message (mirror handleActionError réel).
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

		const result = await deleteUser(undefined, validFormData);

		expect(result).toEqual(rateLimitError);
		expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
	});

	// ──────────────────────────────────────────────────────────────
	// Auth
	// ──────────────────────────────────────────────────────────────

	it("should return auth error when not admin (before rate-limit)", async () => {
		const authError = { status: ActionStatus.UNAUTHORIZED, message: "Non autorisé" };
		mockRequireAdmin.mockResolvedValue({ error: authError });

		const result = await deleteUser(undefined, validFormData);

		expect(result).toEqual(authError);
		expect(mockEnforceRateLimit).not.toHaveBeenCalled();
		expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
	});

	// ──────────────────────────────────────────────────────────────
	// Validation
	// ──────────────────────────────────────────────────────────────

	it("should return validation error for invalid data", async () => {
		const validationError = { status: ActionStatus.VALIDATION_ERROR, message: "ID invalide" };
		mockValidateInput.mockReturnValue({ error: validationError });

		const result = await deleteUser(undefined, validFormData);

		expect(result).toEqual(validationError);
		expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
	});

	// ──────────────────────────────────────────────────────────────
	// Self-deletion
	// ──────────────────────────────────────────────────────────────

	it("should block self-deletion", async () => {
		mockRequireAdmin.mockResolvedValue({ user: { id: "user-456", name: "Admin" } });
		mockValidateInput.mockReturnValue({ data: { id: "user-456" } });

		const result = await deleteUser(undefined, validFormData);

		expect(mockError).toHaveBeenCalledWith("Vous ne pouvez pas supprimer votre propre compte.");
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
	});

	// ──────────────────────────────────────────────────────────────
	// User checks
	// ──────────────────────────────────────────────────────────────

	it("should return not found when user does not exist", async () => {
		mockPrisma.user.findUnique.mockResolvedValue(null);

		const result = await deleteUser(undefined, validFormData);

		expect(mockNotFound).toHaveBeenCalledWith("Utilisateur");
		expect(result.status).toBe(ActionStatus.NOT_FOUND);
	});

	it("should return error when user is already deleted", async () => {
		mockPrisma.user.findUnique.mockResolvedValue(makeUser({ deletedAt: new Date() }));

		const result = await deleteUser(undefined, validFormData);

		expect(mockError).toHaveBeenCalledWith("Cet utilisateur est deja supprime.");
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockPrisma.user.update).not.toHaveBeenCalled();
	});

	// ──────────────────────────────────────────────────────────────
	// Last admin protection (atomic count + update)
	// ──────────────────────────────────────────────────────────────

	it("should block deletion of the last admin", async () => {
		mockPrisma.user.findUnique.mockResolvedValue(makeUser({ role: "ADMIN" }));
		// 0 autres admins → bloque (check id: {not: userId})
		mockPrisma.user.count.mockResolvedValue(0);

		const result = await deleteUser(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("dernier administrateur");
		expect(mockPrisma.user.update).not.toHaveBeenCalled();
	});

	it("should allow deletion of an admin when other admins exist", async () => {
		mockPrisma.user.findUnique.mockResolvedValue(makeUser({ role: "ADMIN" }));
		mockPrisma.user.count.mockResolvedValue(2);

		const result = await deleteUser(undefined, validFormData);

		expect(mockPrisma.user.update).toHaveBeenCalledWith({
			where: { id: "user-456" },
			data: { deletedAt: expect.any(Date), accountStatus: "INACTIVE" },
		});
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("should not check admin count for non-admin users", async () => {
		mockPrisma.user.findUnique.mockResolvedValue(makeUser({ role: "USER" }));

		await deleteUser(undefined, validFormData);

		expect(mockPrisma.user.count).not.toHaveBeenCalled();
	});

	it("should use a Serializable transaction for the soft-delete", async () => {
		mockPrisma.user.findUnique.mockResolvedValue(makeUser({ role: "USER" }));

		await deleteUser(undefined, validFormData);

		expect(mockPrisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
			isolationLevel: "Serializable",
		});
	});

	// ──────────────────────────────────────────────────────────────
	// Success — soft delete
	// ──────────────────────────────────────────────────────────────

	it("should soft delete with correct id (deletedAt + INACTIVE)", async () => {
		await deleteUser(undefined, validFormData);

		expect(mockPrisma.user.update).toHaveBeenCalledWith({
			where: { id: "user-456" },
			data: { deletedAt: expect.any(Date), accountStatus: "INACTIVE" },
		});
	});

	it("should return success with user display name", async () => {
		const result = await deleteUser(undefined, validFormData);

		expect(mockSuccess).toHaveBeenCalledWith(expect.stringContaining("Marie Dupont"));
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("should fall back to email in success message when name is null", async () => {
		mockPrisma.user.findUnique.mockResolvedValue(
			makeUser({ name: null, email: "marie@example.com" }),
		);

		await deleteUser(undefined, validFormData);

		expect(mockSuccess).toHaveBeenCalledWith(expect.stringContaining("marie@example.com"));
	});

	// ──────────────────────────────────────────────────────────────
	// Cache invalidation
	// ──────────────────────────────────────────────────────────────

	it("should invalidate shared and accounts-list cache tags after deletion", async () => {
		await deleteUser(undefined, validFormData);

		expect(mockUpdateTag).toHaveBeenCalledWith("admin-customers-list");
		expect(mockUpdateTag).toHaveBeenCalledWith("admin-badges");
		expect(mockUpdateTag).toHaveBeenCalledWith("accounts-list");
	});

	it("should invalidate user-specific cache tags after deletion", async () => {
		mockGetUserFullInvalidationTags.mockReturnValue(["user-tag-1", "user-tag-2"]);

		await deleteUser(undefined, validFormData);

		expect(mockGetUserFullInvalidationTags).toHaveBeenCalledWith("user-456");
		expect(mockUpdateTag).toHaveBeenCalledWith("user-tag-1");
		expect(mockUpdateTag).toHaveBeenCalledWith("user-tag-2");
	});

	// ──────────────────────────────────────────────────────────────
	// Error handling
	// ──────────────────────────────────────────────────────────────

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.user.update.mockRejectedValue(new Error("DB connection failed"));

		const result = await deleteUser(undefined, validFormData);

		expect(mockHandleActionError).toHaveBeenCalledWith(
			expect.any(Error),
			"Erreur lors de la suppression de l'utilisateur",
		);
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
