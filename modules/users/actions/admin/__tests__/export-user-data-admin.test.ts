import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockRequireAdminWithUser,
	mockEnforceRateLimit,
	mockValidateInput,
	mockSuccess,
	mockNotFound,
	mockHandleActionError,
	mockBuildUserDataExport,
	mockLogAudit,
} = vi.hoisted(() => ({
	mockRequireAdminWithUser: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockValidateInput: vi.fn(),
	mockSuccess: vi.fn(),
	mockNotFound: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockBuildUserDataExport: vi.fn(),
	mockLogAudit: vi.fn(),
}));

vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdminWithUser: mockRequireAdminWithUser,
}));

vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));

vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_USER_LIMITS: { EXPORT_DATA: "user-export-data" },
}));

vi.mock("@/shared/lib/actions", () => ({
	validateInput: mockValidateInput,
	success: mockSuccess,
	notFound: mockNotFound,
	handleActionError: mockHandleActionError,
}));

vi.mock("@/shared/lib/audit-log", () => ({
	logAudit: mockLogAudit,
}));

vi.mock("../../../schemas/user-admin.schemas", () => ({
	adminUserIdSchema: {},
}));

vi.mock("../../../services/build-user-data-export.service", () => ({
	buildUserDataExport: mockBuildUserDataExport,
}));

import { exportUserDataAdmin } from "../export-user-data-admin";

// ============================================================================
// HELPERS
// ============================================================================

const MOCK_EXPORT_DATA = {
	exportedAt: "2026-01-01T00:00:00.000Z",
	profile: {
		name: "Marie Dupont",
		email: "marie@example.com",
		createdAt: "2026-01-01T00:00:00.000Z",
		termsAcceptedAt: null,
	},
	addresses: [],
	orders: [],
	wishlist: [],
	discountUsages: [],
	newsletter: null,
	reviews: [],
	sessions: [],
	customizationRequests: [],
};

// ============================================================================
// exportUserDataAdmin
// ============================================================================

describe("exportUserDataAdmin", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockRequireAdminWithUser.mockResolvedValue({
			user: { id: "admin-123", name: "Admin", email: "admin@example.com" },
		});
		mockValidateInput.mockReturnValue({ data: { userId: "user-456" } });
		mockBuildUserDataExport.mockResolvedValue(MOCK_EXPORT_DATA);

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

		const result = await exportUserDataAdmin("user-456");

		expect(result).toEqual(rateLimitError);
		expect(mockRequireAdminWithUser).not.toHaveBeenCalled();
	});

	// ──────────────────────────────────────────────────────────────
	// Auth
	// ──────────────────────────────────────────────────────────────

	it("should return auth error when not admin", async () => {
		const authError = { status: ActionStatus.UNAUTHORIZED, message: "Non autorisé" };
		mockRequireAdminWithUser.mockResolvedValue({ error: authError });

		const result = await exportUserDataAdmin("user-456");

		expect(result).toEqual(authError);
		expect(mockBuildUserDataExport).not.toHaveBeenCalled();
	});

	// ──────────────────────────────────────────────────────────────
	// Validation
	// ──────────────────────────────────────────────────────────────

	it("should return validation error for invalid userId", async () => {
		const validationError = { status: ActionStatus.VALIDATION_ERROR, message: "ID invalide" };
		mockValidateInput.mockReturnValue({ error: validationError });

		const result = await exportUserDataAdmin("invalid");

		expect(result).toEqual(validationError);
		expect(mockBuildUserDataExport).not.toHaveBeenCalled();
	});

	// ──────────────────────────────────────────────────────────────
	// User checks
	// ──────────────────────────────────────────────────────────────

	it("should return not found when user does not exist", async () => {
		mockBuildUserDataExport.mockResolvedValue(null);

		const result = await exportUserDataAdmin("user-456");

		expect(mockNotFound).toHaveBeenCalledWith("Utilisateur");
		expect(result.status).toBe(ActionStatus.NOT_FOUND);
	});

	// ──────────────────────────────────────────────────────────────
	// Success — export data
	// ──────────────────────────────────────────────────────────────

	it("should return success with exported data", async () => {
		const result = await exportUserDataAdmin("user-456");

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockSuccess).toHaveBeenCalledWith("Données exportées avec succès", MOCK_EXPORT_DATA);
	});

	it("should call buildUserDataExport with correct userId", async () => {
		await exportUserDataAdmin("user-456");

		expect(mockBuildUserDataExport).toHaveBeenCalledWith("user-456");
	});

	// ──────────────────────────────────────────────────────────────
	// Audit logging
	// ──────────────────────────────────────────────────────────────

	it("should log audit on success", async () => {
		await exportUserDataAdmin("user-456");

		expect(mockLogAudit).toHaveBeenCalledWith(
			expect.objectContaining({
				adminId: "admin-123",
				action: "user.exportData",
				targetType: "user",
				targetId: "user-456",
				metadata: expect.objectContaining({ userEmail: "marie@example.com" }),
			}),
		);
	});

	it("should not log audit when user not found", async () => {
		mockBuildUserDataExport.mockResolvedValue(null);

		await exportUserDataAdmin("user-456");

		expect(mockLogAudit).not.toHaveBeenCalled();
	});

	// ──────────────────────────────────────────────────────────────
	// Error handling
	// ──────────────────────────────────────────────────────────────

	it("should call handleActionError on unexpected exception", async () => {
		mockBuildUserDataExport.mockRejectedValue(new Error("DB error"));

		const result = await exportUserDataAdmin("user-456");

		expect(mockHandleActionError).toHaveBeenCalledWith(
			expect.any(Error),
			"Erreur lors de l'export des données",
		);
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
