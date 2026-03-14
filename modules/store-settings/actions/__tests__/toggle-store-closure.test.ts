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
		storeSettings: { findUnique: vi.fn(), update: vi.fn() },
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
	ADMIN_STORE_SETTINGS_LIMITS: { TOGGLE_CLOSURE: "toggle" },
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
	toggleStoreClosureSchema: {},
}));

import { toggleStoreClosure } from "../toggle-store-closure";

// ============================================================================
// HELPERS
// ============================================================================

const ADMIN_USER = { id: "admin-1", name: "Admin Test", email: "admin@test.com" };
const SINGLETON_ID = "store-settings-singleton";

function closureFormData(overrides: Record<string, string> = {}) {
	return createMockFormData({
		isClosed: "true",
		closureMessage: "Maintenance en cours",
		reopensAt: "",
		...overrides,
	});
}

// ============================================================================
// TESTS
// ============================================================================

describe("toggleStoreClosure", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdminWithUser.mockResolvedValue({ user: ADMIN_USER });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockReturnValue({
			data: {
				isClosed: true,
				closureMessage: "Maintenance en cours",
				reopensAt: null,
			},
		});
		mockPrisma.storeSettings.findUnique.mockResolvedValue({ id: SINGLETON_ID });
		mockPrisma.storeSettings.update.mockResolvedValue({});
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
		const result = await toggleStoreClosure(undefined, closureFormData());
		expect(result.status).toBe(ActionStatus.FORBIDDEN);
	});

	it("does not proceed to rate limit check when auth fails", async () => {
		mockRequireAdminWithUser.mockResolvedValue({
			error: { status: ActionStatus.FORBIDDEN, message: "Admin requis" },
		});
		await toggleStoreClosure(undefined, closureFormData());
		expect(mockEnforceRateLimit).not.toHaveBeenCalled();
	});

	// ─── Rate limit ────────────────────────────────────────────────────────

	it("returns error when rate limited", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Trop de requêtes" },
		});
		const result = await toggleStoreClosure(undefined, closureFormData());
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	// ─── Validation ────────────────────────────────────────────────────────

	it("returns validation error when input is invalid", async () => {
		mockValidateInput.mockReturnValue({
			error: { status: ActionStatus.VALIDATION_ERROR, message: "Champ requis" },
		});
		const result = await toggleStoreClosure(undefined, closureFormData());
		expect(result).toEqual({ status: ActionStatus.VALIDATION_ERROR, message: "Champ requis" });
	});

	// ─── Singleton check ───────────────────────────────────────────────────

	it("returns error when singleton does not exist", async () => {
		mockPrisma.storeSettings.findUnique.mockResolvedValue(null);
		await toggleStoreClosure(undefined, closureFormData());
		expect(mockError).toHaveBeenCalledWith("Paramètres boutique introuvables");
	});

	it("does not update when singleton is missing", async () => {
		mockPrisma.storeSettings.findUnique.mockResolvedValue(null);
		await toggleStoreClosure(undefined, closureFormData());
		expect(mockPrisma.storeSettings.update).not.toHaveBeenCalled();
	});

	// ─── Close store ───────────────────────────────────────────────────────

	it("closes store with message and reopensAt", async () => {
		const reopensAt = new Date("2026-04-01T10:00:00Z");
		mockValidateInput.mockReturnValue({
			data: {
				isClosed: true,
				closureMessage: "Vacances",
				reopensAt,
			},
		});

		await toggleStoreClosure(undefined, closureFormData());

		expect(mockPrisma.storeSettings.update).toHaveBeenCalledWith({
			where: { id: SINGLETON_ID },
			data: {
				isClosed: true,
				closureMessage: "Vacances",
				closedAt: expect.any(Date),
				closedBy: "Admin Test",
				reopensAt,
			},
		});
	});

	it("uses email as closedBy when admin has no name", async () => {
		mockRequireAdminWithUser.mockResolvedValue({
			user: { id: "admin-1", name: null, email: "admin@test.com" },
		});

		await toggleStoreClosure(undefined, closureFormData());

		expect(mockPrisma.storeSettings.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					closedBy: "admin@test.com",
				}),
			}),
		);
	});

	it("returns success message for closure", async () => {
		const result = await toggleStoreClosure(undefined, closureFormData());
		expect(result.message).toContain("fermée");
	});

	// ─── Reopen store ──────────────────────────────────────────────────────

	it("reopens store and clears all closure fields", async () => {
		mockValidateInput.mockReturnValue({
			data: { isClosed: false, closureMessage: "", reopensAt: null },
		});

		await toggleStoreClosure(undefined, closureFormData({ isClosed: "false", closureMessage: "" }));

		expect(mockPrisma.storeSettings.update).toHaveBeenCalledWith({
			where: { id: SINGLETON_ID },
			data: {
				isClosed: false,
				closureMessage: null,
				closedAt: null,
				closedBy: null,
				reopensAt: null,
			},
		});
	});

	it("returns success message for reopening", async () => {
		mockValidateInput.mockReturnValue({
			data: { isClosed: false, closureMessage: "", reopensAt: null },
		});
		const result = await toggleStoreClosure(undefined, closureFormData({ isClosed: "false" }));
		expect(result.message).toContain("réouverte");
	});

	// ─── Cache invalidation ────────────────────────────────────────────────

	it("invalidates all store settings cache tags", async () => {
		await toggleStoreClosure(undefined, closureFormData());
		expect(mockUpdateTag).toHaveBeenCalledWith("store-status");
		expect(mockUpdateTag).toHaveBeenCalledWith("store-settings");
	});

	// ─── Audit logging ─────────────────────────────────────────────────────

	it("logs audit with store.close action on closure", async () => {
		await toggleStoreClosure(undefined, closureFormData());
		expect(mockLogAudit).toHaveBeenCalledWith(
			expect.objectContaining({
				adminId: "admin-1",
				action: "store.close",
				targetType: "storeSettings",
				targetId: SINGLETON_ID,
			}),
		);
	});

	it("logs audit with store.reopen action on reopening", async () => {
		mockValidateInput.mockReturnValue({
			data: { isClosed: false, closureMessage: "", reopensAt: null },
		});
		await toggleStoreClosure(undefined, closureFormData({ isClosed: "false" }));
		expect(mockLogAudit).toHaveBeenCalledWith(
			expect.objectContaining({ action: "store.reopen", metadata: {} }),
		);
	});

	it("includes closure metadata in audit log", async () => {
		const reopensAt = new Date("2026-04-01T10:00:00Z");
		mockValidateInput.mockReturnValue({
			data: { isClosed: true, closureMessage: "Maintenance", reopensAt },
		});
		await toggleStoreClosure(undefined, closureFormData());
		expect(mockLogAudit).toHaveBeenCalledWith(
			expect.objectContaining({
				metadata: {
					closureMessage: "Maintenance",
					reopensAt: "2026-04-01T10:00:00.000Z",
				},
			}),
		);
	});

	// ─── Error handling ────────────────────────────────────────────────────

	it("calls handleActionError on unexpected exception", async () => {
		mockPrisma.storeSettings.update.mockRejectedValue(new Error("DB crash"));
		const result = await toggleStoreClosure(undefined, closureFormData());
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockHandleActionError).toHaveBeenCalledWith(
			expect.any(Error),
			"Impossible de modifier le statut de la boutique",
		);
	});
});
