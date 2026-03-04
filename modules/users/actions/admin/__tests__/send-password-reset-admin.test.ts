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
	mockNotFound,
	mockHandleActionError,
	mockAuth,
	mockLogAudit,
} = vi.hoisted(() => ({
	mockPrisma: {
		user: { findUnique: vi.fn() },
	},
	mockRequireAdminWithUser: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockValidateInput: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockNotFound: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockAuth: {
		api: { requestPasswordReset: vi.fn() },
	},
	mockLogAudit: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
}));

vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdminWithUser: mockRequireAdminWithUser,
}));

vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));

vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_USER_LIMITS: { SEND_RESET: "user-send-reset" },
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
}));

vi.mock("@/modules/auth/lib/auth", () => ({
	auth: mockAuth,
}));

vi.mock("@/shared/lib/audit-log", () => ({
	logAudit: mockLogAudit,
}));

vi.mock("../../../schemas/user-admin.schemas", () => ({
	adminUserIdSchema: {},
}));

import { sendPasswordResetAdmin } from "../send-password-reset-admin";

// ============================================================================
// HELPERS
// ============================================================================

function makeUser(overrides: Record<string, unknown> = {}) {
	return {
		id: "user-456",
		name: "Marie Dupont",
		email: "marie@example.com",
		deletedAt: null,
		accounts: [{ providerId: "credential" }],
		...overrides,
	};
}

// ============================================================================
// sendPasswordResetAdmin
// ============================================================================

describe("sendPasswordResetAdmin", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockRequireAdminWithUser.mockResolvedValue({
			user: { id: "admin-123", name: "Admin", email: "admin@example.com" },
		});
		mockValidateInput.mockReturnValue({ data: { userId: "user-456" } });
		mockPrisma.user.findUnique.mockResolvedValue(makeUser());
		mockAuth.api.requestPasswordReset.mockResolvedValue({});

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

		const result = await sendPasswordResetAdmin("user-456");

		expect(result).toEqual(rateLimitError);
		expect(mockRequireAdminWithUser).not.toHaveBeenCalled();
	});

	// ──────────────────────────────────────────────────────────────
	// Auth
	// ──────────────────────────────────────────────────────────────

	it("should return auth error when not admin", async () => {
		const authError = { status: ActionStatus.UNAUTHORIZED, message: "Non autorisé" };
		mockRequireAdminWithUser.mockResolvedValue({ error: authError });

		const result = await sendPasswordResetAdmin("user-456");

		expect(result).toEqual(authError);
		expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
	});

	// ──────────────────────────────────────────────────────────────
	// Validation
	// ──────────────────────────────────────────────────────────────

	it("should return validation error for invalid userId", async () => {
		const validationError = { status: ActionStatus.VALIDATION_ERROR, message: "ID invalide" };
		mockValidateInput.mockReturnValue({ error: validationError });

		const result = await sendPasswordResetAdmin("invalid");

		expect(result).toEqual(validationError);
		expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
	});

	// ──────────────────────────────────────────────────────────────
	// User checks
	// ──────────────────────────────────────────────────────────────

	it("should return not found when user does not exist", async () => {
		mockPrisma.user.findUnique.mockResolvedValue(null);

		const result = await sendPasswordResetAdmin("user-456");

		expect(mockNotFound).toHaveBeenCalledWith("Utilisateur");
		expect(result.status).toBe(ActionStatus.NOT_FOUND);
	});

	it("should return error when user is deleted", async () => {
		mockPrisma.user.findUnique.mockResolvedValue(makeUser({ deletedAt: new Date() }));

		const result = await sendPasswordResetAdmin("user-456");

		expect(mockError).toHaveBeenCalledWith("Impossible d'envoyer un email à un compte supprimé");
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockAuth.api.requestPasswordReset).not.toHaveBeenCalled();
	});

	it("should return error when user has no credential account (Google)", async () => {
		mockPrisma.user.findUnique.mockResolvedValue(
			makeUser({ accounts: [{ providerId: "google" }] }),
		);

		const result = await sendPasswordResetAdmin("user-456");

		expect(mockError).toHaveBeenCalledWith(expect.stringContaining("Google"));
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockAuth.api.requestPasswordReset).not.toHaveBeenCalled();
	});

	it("should return error when user has no credential account (GitHub)", async () => {
		mockPrisma.user.findUnique.mockResolvedValue(
			makeUser({ accounts: [{ providerId: "github" }] }),
		);

		const result = await sendPasswordResetAdmin("user-456");

		expect(mockError).toHaveBeenCalledWith(expect.stringContaining("github"));
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	// ──────────────────────────────────────────────────────────────
	// Success — send reset email
	// ──────────────────────────────────────────────────────────────

	it("should call auth.api.requestPasswordReset with correct params", async () => {
		await sendPasswordResetAdmin("user-456");

		expect(mockAuth.api.requestPasswordReset).toHaveBeenCalledWith({
			body: {
				email: "marie@example.com",
				redirectTo: "/reinitialiser-mot-de-passe",
			},
		});
	});

	it("should return success with display name", async () => {
		const result = await sendPasswordResetAdmin("user-456");

		expect(mockSuccess).toHaveBeenCalledWith(expect.stringContaining("Marie Dupont"));
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("should fall back to email when name is null", async () => {
		mockPrisma.user.findUnique.mockResolvedValue(makeUser({ name: null }));

		await sendPasswordResetAdmin("user-456");

		expect(mockSuccess).toHaveBeenCalledWith(expect.stringContaining("marie@example.com"));
	});

	it("should send reset for user with both credential and OAuth accounts", async () => {
		mockPrisma.user.findUnique.mockResolvedValue(
			makeUser({ accounts: [{ providerId: "credential" }, { providerId: "google" }] }),
		);

		const result = await sendPasswordResetAdmin("user-456");

		expect(mockAuth.api.requestPasswordReset).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	// ──────────────────────────────────────────────────────────────
	// Error handling
	// ──────────────────────────────────────────────────────────────

	it("should call handleActionError on unexpected exception", async () => {
		mockAuth.api.requestPasswordReset.mockRejectedValue(new Error("Email service down"));

		const result = await sendPasswordResetAdmin("user-456");

		expect(mockHandleActionError).toHaveBeenCalledWith(
			expect.any(Error),
			"Erreur lors de l'envoi de l'email",
		);
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
