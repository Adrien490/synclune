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
} = vi.hoisted(() => ({
	mockPrisma: {
		user: { findUnique: vi.fn(), update: vi.fn() },
	},
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockValidateInput: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockNotFound: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockUpdateTag: vi.fn(),
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
	restoreUserSchema: {},
}));

vi.mock("@/shared/constants/cache-tags", () => ({
	SHARED_CACHE_TAGS: {
		ADMIN_CUSTOMERS_LIST: "admin-customers-list",
		ADMIN_BADGES: "admin-badges",
	},
}));

vi.mock("@/app/generated/prisma/client", () => ({
	AccountStatus: { ACTIVE: "ACTIVE", INACTIVE: "INACTIVE" },
}));

import { restoreUser } from "../restore-user";

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
		suspendedAt: new Date(),
		deletedAt: null,
		...overrides,
	};
}

const validFormData = createFormData({ id: "user-456" });

// ============================================================================
// restoreUser
// ============================================================================

describe("restoreUser", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockRequireAdmin.mockResolvedValue({ user: { id: "admin-123" } });
		mockValidateInput.mockReturnValue({ data: { id: "user-456" } });
		mockPrisma.user.findUnique.mockResolvedValue(makeUser());
		mockPrisma.user.update.mockResolvedValue({});

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

		const result = await restoreUser(undefined, validFormData);

		expect(result).toEqual(rateLimitError);
		expect(mockRequireAdmin).not.toHaveBeenCalled();
	});

	// ──────────────────────────────────────────────────────────────
	// Auth
	// ──────────────────────────────────────────────────────────────

	it("should return auth error when not admin", async () => {
		const authError = { status: ActionStatus.UNAUTHORIZED, message: "Non autorisé" };
		mockRequireAdmin.mockResolvedValue({ error: authError });

		const result = await restoreUser(undefined, validFormData);

		expect(result).toEqual(authError);
		expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
	});

	// ──────────────────────────────────────────────────────────────
	// Validation
	// ──────────────────────────────────────────────────────────────

	it("should return validation error for invalid data", async () => {
		const validationError = { status: ActionStatus.VALIDATION_ERROR, message: "ID invalide" };
		mockValidateInput.mockReturnValue({ error: validationError });

		const result = await restoreUser(undefined, validFormData);

		expect(result).toEqual(validationError);
		expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
	});

	// ──────────────────────────────────────────────────────────────
	// User checks
	// ──────────────────────────────────────────────────────────────

	it("should return not found when user does not exist", async () => {
		mockPrisma.user.findUnique.mockResolvedValue(null);

		const result = await restoreUser(undefined, validFormData);

		expect(mockNotFound).toHaveBeenCalledWith("Utilisateur");
		expect(result.status).toBe(ActionStatus.NOT_FOUND);
	});

	it("should return error when user is neither deleted nor suspended", async () => {
		mockPrisma.user.findUnique.mockResolvedValue(makeUser({ deletedAt: null, suspendedAt: null }));

		const result = await restoreUser(undefined, validFormData);

		expect(mockError).toHaveBeenCalledWith("Cet utilisateur n'est ni supprime ni suspendu.");
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockPrisma.user.update).not.toHaveBeenCalled();
	});

	// ──────────────────────────────────────────────────────────────
	// Success — restore
	// ──────────────────────────────────────────────────────────────

	it("should restore a suspended user", async () => {
		mockPrisma.user.findUnique.mockResolvedValue(
			makeUser({ suspendedAt: new Date(), deletedAt: null }),
		);

		const result = await restoreUser(undefined, validFormData);

		expect(mockPrisma.user.update).toHaveBeenCalledWith({
			where: { id: "user-456" },
			data: {
				deletedAt: null,
				suspendedAt: null,
				accountStatus: "ACTIVE",
			},
		});
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("should restore a deleted user", async () => {
		mockPrisma.user.findUnique.mockResolvedValue(
			makeUser({ deletedAt: new Date(), suspendedAt: null }),
		);

		const result = await restoreUser(undefined, validFormData);

		expect(mockPrisma.user.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: "user-456" },
				data: expect.objectContaining({ deletedAt: null, suspendedAt: null }),
			}),
		);
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("should return success with user display name", async () => {
		await restoreUser(undefined, validFormData);

		expect(mockSuccess).toHaveBeenCalledWith(expect.stringContaining("Marie Dupont"));
	});

	it("should fall back to email in success message when name is null", async () => {
		mockPrisma.user.findUnique.mockResolvedValue(
			makeUser({ name: null, email: "marie@example.com" }),
		);

		await restoreUser(undefined, validFormData);

		expect(mockSuccess).toHaveBeenCalledWith(expect.stringContaining("marie@example.com"));
	});

	// ──────────────────────────────────────────────────────────────
	// Cache invalidation
	// ──────────────────────────────────────────────────────────────

	it("should invalidate shared cache tags after restore", async () => {
		await restoreUser(undefined, validFormData);

		expect(mockUpdateTag).toHaveBeenCalledWith("admin-customers-list");
		expect(mockUpdateTag).toHaveBeenCalledWith("admin-badges");
	});

	// ──────────────────────────────────────────────────────────────
	// Error handling
	// ──────────────────────────────────────────────────────────────

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.user.update.mockRejectedValue(new Error("DB connection failed"));

		const result = await restoreUser(undefined, validFormData);

		expect(mockHandleActionError).toHaveBeenCalledWith(
			expect.any(Error),
			"Erreur lors de la restauration de l'utilisateur",
		);
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
