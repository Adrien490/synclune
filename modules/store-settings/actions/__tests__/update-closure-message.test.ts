import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockFormData } from "@/test/factories";

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
	mockGetStoreSettingsInvalidationTags,
	mockLogAudit,
} = vi.hoisted(() => ({
	mockPrisma: {
		storeSettings: { findUnique: vi.fn(), updateMany: vi.fn() },
	},
	mockRequireAdminWithUser: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockValidateInput: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockGetStoreSettingsInvalidationTags: vi.fn(),
	mockLogAudit: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdminWithUser: mockRequireAdminWithUser,
}));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_STORE_SETTINGS_LIMITS: { UPDATE_CLOSURE_MESSAGE: "update-message" },
}));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag }));
vi.mock("@/shared/lib/actions", () => ({
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: mockSuccess,
	error: mockError,
}));
vi.mock("@/shared/lib/audit-log", () => ({ logAudit: mockLogAudit }));
vi.mock("../../constants/cache", () => ({
	STORE_SETTINGS_SINGLETON_ID: "store-settings-singleton",
	getStoreSettingsInvalidationTags: mockGetStoreSettingsInvalidationTags,
}));
vi.mock("../../schemas/store-settings.schemas", () => ({
	updateClosureMessageSchema: {},
}));

import { updateClosureMessage } from "../update-closure-message";

// ============================================================================
// HELPERS
// ============================================================================

const ADMIN_USER = { id: "admin-1", name: "Admin Test", email: "admin@test.com" };
const SINGLETON_ID = "store-settings-singleton";

function formData(overrides: Record<string, string> = {}) {
	return createMockFormData({
		closureMessage: "Nouveau message de maintenance",
		...overrides,
	});
}

// ============================================================================
// TESTS
// ============================================================================

describe("updateClosureMessage", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdminWithUser.mockResolvedValue({ user: ADMIN_USER });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockReturnValue({
			data: { closureMessage: "Nouveau message" },
		});
		mockPrisma.storeSettings.findUnique.mockResolvedValue({
			isClosed: true,
			closureMessage: "Ancien message",
		});
		mockPrisma.storeSettings.updateMany.mockResolvedValue({ count: 1 });
		mockGetStoreSettingsInvalidationTags.mockReturnValue(["store-status", "store-settings"]);
		mockLogAudit.mockResolvedValue(undefined);

		mockSuccess.mockImplementation((msg: string) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
		}));
		mockError.mockImplementation((msg: string) => ({
			status: ActionStatus.ERROR,
			message: msg,
		}));
		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));
	});

	// ─── Auth ──────────────────────────────────────────────────────────────

	it("returns auth error when user is not admin", async () => {
		mockRequireAdminWithUser.mockResolvedValue({
			error: { status: ActionStatus.FORBIDDEN, message: "Admin requis" },
		});
		const result = await updateClosureMessage(undefined, formData());
		expect(result.status).toBe(ActionStatus.FORBIDDEN);
		expect(mockEnforceRateLimit).not.toHaveBeenCalled();
	});

	// ─── Rate limit ────────────────────────────────────────────────────────

	it("returns error when rate limited", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Trop de requêtes" },
		});
		const result = await updateClosureMessage(undefined, formData());
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockValidateInput).not.toHaveBeenCalled();
	});

	// ─── Validation ────────────────────────────────────────────────────────

	it("returns validation error when input is invalid", async () => {
		mockValidateInput.mockReturnValue({
			error: { status: ActionStatus.VALIDATION_ERROR, message: "Message requis" },
		});
		const result = await updateClosureMessage(undefined, formData());
		expect(result).toEqual({
			status: ActionStatus.VALIDATION_ERROR,
			message: "Message requis",
		});
	});

	// ─── Singleton check ───────────────────────────────────────────────────

	it("returns error when singleton does not exist", async () => {
		mockPrisma.storeSettings.findUnique.mockResolvedValue(null);
		await updateClosureMessage(undefined, formData());
		expect(mockError).toHaveBeenCalledWith("Paramètres boutique introuvables");
		expect(mockPrisma.storeSettings.updateMany).not.toHaveBeenCalled();
	});

	// ─── Pre-condition store closed ────────────────────────────────────────

	it("rejects when store is open (updateMany matches 0 rows)", async () => {
		mockPrisma.storeSettings.findUnique.mockResolvedValue({
			isClosed: false,
			closureMessage: null,
		});
		mockPrisma.storeSettings.updateMany.mockResolvedValue({ count: 0 });
		await updateClosureMessage(undefined, formData());
		expect(mockError).toHaveBeenCalledWith("La boutique est ouverte, aucun message à modifier");
	});

	// ─── Update mutation ───────────────────────────────────────────────────

	it("updates atomically with WHERE isClosed=true (preserves closedAt/closedBy/reopensAt)", async () => {
		mockValidateInput.mockReturnValue({
			data: { closureMessage: "Congés prolongés" },
		});
		await updateClosureMessage(undefined, formData());
		expect(mockPrisma.storeSettings.updateMany).toHaveBeenCalledWith({
			where: { id: SINGLETON_ID, isClosed: true },
			data: { closureMessage: "Congés prolongés" },
		});
	});

	it("returns success message", async () => {
		const result = await updateClosureMessage(undefined, formData());
		expect(result.message).toContain("mis à jour");
	});

	// ─── Cache invalidation ────────────────────────────────────────────────

	it("invalidates all store settings cache tags", async () => {
		await updateClosureMessage(undefined, formData());
		expect(mockUpdateTag).toHaveBeenCalledWith("store-status");
		expect(mockUpdateTag).toHaveBeenCalledWith("store-settings");
	});

	// ─── Audit logging ─────────────────────────────────────────────────────

	it("logs audit with store.update-closure-message action", async () => {
		await updateClosureMessage(undefined, formData());
		expect(mockLogAudit).toHaveBeenCalledWith(
			expect.objectContaining({
				adminId: "admin-1",
				action: "store.update-closure-message",
				targetType: "storeSettings",
				targetId: SINGLETON_ID,
			}),
		);
	});

	it("includes previous and new message in audit metadata", async () => {
		mockPrisma.storeSettings.findUnique.mockResolvedValue({
			isClosed: true,
			closureMessage: "Ancien",
		});
		mockValidateInput.mockReturnValue({
			data: { closureMessage: "Nouveau" },
		});
		await updateClosureMessage(undefined, formData());
		expect(mockLogAudit).toHaveBeenCalledWith(
			expect.objectContaining({
				metadata: { previousMessage: "Ancien", newMessage: "Nouveau" },
			}),
		);
	});

	it("uses email as adminName fallback when name is null", async () => {
		mockRequireAdminWithUser.mockResolvedValue({
			user: { id: "admin-1", name: null, email: "admin@test.com" },
		});
		await updateClosureMessage(undefined, formData());
		expect(mockLogAudit).toHaveBeenCalledWith(
			expect.objectContaining({ adminName: "admin@test.com" }),
		);
	});

	// ─── Error handling ────────────────────────────────────────────────────

	it("calls handleActionError on unexpected exception", async () => {
		mockPrisma.storeSettings.updateMany.mockRejectedValue(new Error("DB crash"));
		const result = await updateClosureMessage(undefined, formData());
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockHandleActionError).toHaveBeenCalledWith(
			expect.any(Error),
			"Impossible de mettre à jour le message de fermeture",
		);
	});
});
