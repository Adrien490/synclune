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
	mockNotFound,
	mockHandleActionError,
	mockUpdateTag,
} = vi.hoisted(() => ({
	mockPrisma: {
		user: { findUnique: vi.fn() },
		session: { deleteMany: vi.fn() },
	},
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockValidateInput: vi.fn(),
	mockSuccess: vi.fn(),
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
	ADMIN_USER_LIMITS: { INVALIDATE_SESSIONS: "user-invalidate-sessions" },
}));

vi.mock("@/shared/lib/actions", () => ({
	validateInput: mockValidateInput,
	success: mockSuccess,
	notFound: mockNotFound,
	handleActionError: mockHandleActionError,
}));

vi.mock("next/cache", () => ({
	updateTag: mockUpdateTag,
	cacheLife: vi.fn(),
	cacheTag: vi.fn(),
}));

vi.mock("../../../schemas/user-admin.schemas", () => ({
	adminUserIdSchema: {},
}));

vi.mock("@/shared/constants/cache-tags", () => ({
	SHARED_CACHE_TAGS: {
		ADMIN_CUSTOMERS_LIST: "admin-customers-list",
		ADMIN_BADGES: "admin-badges",
	},
}));

import { invalidateUserSessions } from "../invalidate-user-sessions";

// ============================================================================
// HELPERS
// ============================================================================

function makeUser(overrides: Record<string, unknown> = {}) {
	return {
		id: "user-456",
		name: "Marie Dupont",
		email: "marie@example.com",
		...overrides,
	};
}

// ============================================================================
// invalidateUserSessions
// ============================================================================

describe("invalidateUserSessions", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockRequireAdmin.mockResolvedValue({ user: { id: "admin-123" } });
		mockValidateInput.mockReturnValue({ data: { userId: "user-456" } });
		mockPrisma.user.findUnique.mockResolvedValue(makeUser());
		mockPrisma.session.deleteMany.mockResolvedValue({ count: 3 });

		mockSuccess.mockImplementation((msg: string, data?: unknown) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
			data,
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

		const result = await invalidateUserSessions("user-456");

		expect(result).toEqual(rateLimitError);
		expect(mockRequireAdmin).not.toHaveBeenCalled();
	});

	// ──────────────────────────────────────────────────────────────
	// Auth
	// ──────────────────────────────────────────────────────────────

	it("should return auth error when not admin", async () => {
		const authError = { status: ActionStatus.UNAUTHORIZED, message: "Non autorisé" };
		mockRequireAdmin.mockResolvedValue({ error: authError });

		const result = await invalidateUserSessions("user-456");

		expect(result).toEqual(authError);
		expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
	});

	// ──────────────────────────────────────────────────────────────
	// Validation
	// ──────────────────────────────────────────────────────────────

	it("should return validation error for invalid userId", async () => {
		const validationError = { status: ActionStatus.VALIDATION_ERROR, message: "ID invalide" };
		mockValidateInput.mockReturnValue({ error: validationError });

		const result = await invalidateUserSessions("invalid");

		expect(result).toEqual(validationError);
		expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
	});

	// ──────────────────────────────────────────────────────────────
	// User checks
	// ──────────────────────────────────────────────────────────────

	it("should return not found when user does not exist", async () => {
		mockPrisma.user.findUnique.mockResolvedValue(null);

		const result = await invalidateUserSessions("user-456");

		expect(mockNotFound).toHaveBeenCalledWith("Utilisateur");
		expect(result.status).toBe(ActionStatus.NOT_FOUND);
	});

	// ──────────────────────────────────────────────────────────────
	// Success — delete sessions
	// ──────────────────────────────────────────────────────────────

	it("should delete all sessions for the user", async () => {
		await invalidateUserSessions("user-456");

		expect(mockPrisma.session.deleteMany).toHaveBeenCalledWith({
			where: { userId: "user-456" },
		});
	});

	it("should return success with session count and display name", async () => {
		mockPrisma.session.deleteMany.mockResolvedValue({ count: 5 });

		const result = await invalidateUserSessions("user-456");

		expect(mockSuccess).toHaveBeenCalledWith(expect.stringContaining("Marie Dupont"), {
			deletedCount: 5,
		});
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("should return success with count 0 when no sessions exist", async () => {
		mockPrisma.session.deleteMany.mockResolvedValue({ count: 0 });

		const result = await invalidateUserSessions("user-456");

		expect(mockSuccess).toHaveBeenCalledWith(expect.stringContaining("0 session(s)"), {
			deletedCount: 0,
		});
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("should fall back to email in success message when name is null", async () => {
		mockPrisma.user.findUnique.mockResolvedValue(makeUser({ name: null }));
		mockPrisma.session.deleteMany.mockResolvedValue({ count: 1 });

		await invalidateUserSessions("user-456");

		expect(mockSuccess).toHaveBeenCalledWith(
			expect.stringContaining("marie@example.com"),
			expect.any(Object),
		);
	});

	// ──────────────────────────────────────────────────────────────
	// Cache invalidation
	// ──────────────────────────────────────────────────────────────

	it("should invalidate shared cache tags after invalidation", async () => {
		await invalidateUserSessions("user-456");

		expect(mockUpdateTag).toHaveBeenCalledWith("admin-customers-list");
		expect(mockUpdateTag).toHaveBeenCalledWith("admin-badges");
	});

	// ──────────────────────────────────────────────────────────────
	// Error handling
	// ──────────────────────────────────────────────────────────────

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.session.deleteMany.mockRejectedValue(new Error("DB error"));

		const result = await invalidateUserSessions("user-456");

		expect(mockHandleActionError).toHaveBeenCalledWith(
			expect.any(Error),
			"Erreur lors de l'invalidation des sessions",
		);
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
