import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockPrisma,
	mockRequireAdmin,
	mockRequireAuth,
	mockEnforceRateLimit,
	mockValidateInput,
	mockSuccess,
	mockError,
	mockNotFound,
	mockHandleActionError,
	mockUpdateTag,
	mockGetUserFullInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		user: { findUnique: vi.fn(), update: vi.fn() },
		session: { deleteMany: vi.fn() },
		$transaction: vi.fn(),
	},
	mockRequireAdmin: vi.fn(),
	mockRequireAuth: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockValidateInput: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockNotFound: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockGetUserFullInvalidationTags: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
}));

vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdmin: mockRequireAdmin,
	requireAuth: mockRequireAuth,
}));

vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));

vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_USER_LIMITS: { SINGLE_OPERATIONS: "user-single" },
}));

vi.mock("@/shared/lib/actions", () => ({
	validateInput: mockValidateInput,
	success: mockSuccess,
	error: mockError,
	notFound: mockNotFound,
	handleActionError: mockHandleActionError,
}));

vi.mock("next/cache", () => ({
	updateTag: mockUpdateTag,
	cacheLife: vi.fn(),
	cacheTag: vi.fn(),
}));

vi.mock("../../../schemas/user-admin.schemas", () => ({
	suspendUserSchema: {},
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

import { suspendUser } from "../suspend-user";

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
		suspendedAt: null,
		deletedAt: null,
		...overrides,
	};
}

const validFormData = createFormData({ id: "user-456" });

// ============================================================================
// suspendUser
// ============================================================================

describe("suspendUser", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockRequireAdmin.mockResolvedValue({ user: { id: "admin-123" } });
		mockRequireAuth.mockResolvedValue({ user: { id: "admin-123", name: "Admin" } });
		mockValidateInput.mockReturnValue({ data: { id: "user-456" } });
		mockPrisma.user.findUnique.mockResolvedValue(makeUser());
		mockPrisma.$transaction.mockResolvedValue([{}, { count: 2 }]);
		mockGetUserFullInvalidationTags.mockReturnValue(["user-tag-1", "user-tag-2"]);

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

		const result = await suspendUser(undefined, validFormData);

		expect(result).toEqual(rateLimitError);
		expect(mockRequireAdmin).not.toHaveBeenCalled();
	});

	// ──────────────────────────────────────────────────────────────
	// Auth
	// ──────────────────────────────────────────────────────────────

	it("should return auth error when not admin", async () => {
		const authError = { status: ActionStatus.UNAUTHORIZED, message: "Non autorisé" };
		mockRequireAdmin.mockResolvedValue({ error: authError });

		const result = await suspendUser(undefined, validFormData);

		expect(result).toEqual(authError);
		expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
	});

	it("should return auth error when requireAuth fails", async () => {
		const authError = { status: ActionStatus.UNAUTHORIZED, message: "Session expirée" };
		mockRequireAuth.mockResolvedValue({ error: authError });

		const result = await suspendUser(undefined, validFormData);

		expect(result).toEqual(authError);
		expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
	});

	// ──────────────────────────────────────────────────────────────
	// Validation
	// ──────────────────────────────────────────────────────────────

	it("should return validation error for invalid data", async () => {
		const validationError = { status: ActionStatus.VALIDATION_ERROR, message: "ID invalide" };
		mockValidateInput.mockReturnValue({ error: validationError });

		const result = await suspendUser(undefined, validFormData);

		expect(result).toEqual(validationError);
		expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
	});

	// ──────────────────────────────────────────────────────────────
	// Self-suspension
	// ──────────────────────────────────────────────────────────────

	it("should block self-suspension", async () => {
		mockRequireAuth.mockResolvedValue({ user: { id: "user-456", name: "Admin" } });
		mockValidateInput.mockReturnValue({ data: { id: "user-456" } });

		const result = await suspendUser(undefined, validFormData);

		expect(mockError).toHaveBeenCalledWith("Vous ne pouvez pas suspendre votre propre compte.");
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
	});

	// ──────────────────────────────────────────────────────────────
	// User checks
	// ──────────────────────────────────────────────────────────────

	it("should return not found when user does not exist", async () => {
		mockPrisma.user.findUnique.mockResolvedValue(null);

		const result = await suspendUser(undefined, validFormData);

		expect(mockNotFound).toHaveBeenCalledWith("Utilisateur");
		expect(result.status).toBe(ActionStatus.NOT_FOUND);
	});

	it("should return error when user is deleted", async () => {
		mockPrisma.user.findUnique.mockResolvedValue(makeUser({ deletedAt: new Date() }));

		const result = await suspendUser(undefined, validFormData);

		expect(mockError).toHaveBeenCalledWith("Cet utilisateur est supprime. Restaurez-le d'abord.");
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should return error when user is already suspended", async () => {
		mockPrisma.user.findUnique.mockResolvedValue(makeUser({ suspendedAt: new Date() }));

		const result = await suspendUser(undefined, validFormData);

		expect(mockError).toHaveBeenCalledWith("Cet utilisateur est deja suspendu.");
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	// ──────────────────────────────────────────────────────────────
	// Success — transaction
	// ──────────────────────────────────────────────────────────────

	it("should execute transaction combining user update and session deletion", async () => {
		await suspendUser(undefined, validFormData);

		// The action passes an array to $transaction (array pattern, not callback pattern)
		expect(mockPrisma.$transaction).toHaveBeenCalledWith(expect.any(Array));
		const passedArray: unknown[] = mockPrisma.$transaction.mock.calls[0][0];
		expect(passedArray).toHaveLength(2);
	});

	it("should return success with user display name", async () => {
		const result = await suspendUser(undefined, validFormData);

		expect(mockSuccess).toHaveBeenCalledWith(
			expect.stringContaining("Marie Dupont")
		);
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("should fall back to email in success message when name is null", async () => {
		mockPrisma.user.findUnique.mockResolvedValue(
			makeUser({ name: null, email: "marie@example.com" })
		);

		await suspendUser(undefined, validFormData);

		expect(mockSuccess).toHaveBeenCalledWith(
			expect.stringContaining("marie@example.com")
		);
	});

	// ──────────────────────────────────────────────────────────────
	// Cache invalidation
	// ──────────────────────────────────────────────────────────────

	it("should invalidate shared cache tags after suspension", async () => {
		await suspendUser(undefined, validFormData);

		expect(mockUpdateTag).toHaveBeenCalledWith("admin-customers-list");
		expect(mockUpdateTag).toHaveBeenCalledWith("admin-badges");
	});

	it("should invalidate user-specific cache tags after suspension", async () => {
		mockGetUserFullInvalidationTags.mockReturnValue(["user-tag-1", "user-tag-2"]);

		await suspendUser(undefined, validFormData);

		expect(mockGetUserFullInvalidationTags).toHaveBeenCalledWith("user-456");
		expect(mockUpdateTag).toHaveBeenCalledWith("user-tag-1");
		expect(mockUpdateTag).toHaveBeenCalledWith("user-tag-2");
	});

	// ──────────────────────────────────────────────────────────────
	// Error handling
	// ──────────────────────────────────────────────────────────────

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.$transaction.mockRejectedValue(new Error("DB connection failed"));

		const result = await suspendUser(undefined, validFormData);

		expect(mockHandleActionError).toHaveBeenCalledWith(
			expect.any(Error),
			"Erreur lors de la suspension de l'utilisateur"
		);
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
