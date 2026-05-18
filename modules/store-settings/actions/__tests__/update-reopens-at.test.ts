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
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdmin: mockRequireAdminWithUser,
	requireAdminWithUser: mockRequireAdminWithUser,
}));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_STORE_SETTINGS_LIMITS: { UPDATE_REOPENS_AT: "update-reopens" },
}));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag }));
vi.mock("@/shared/lib/actions", () => ({
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: mockSuccess,
	error: mockError,
}));
vi.mock("../../constants/cache", () => ({
	STORE_SETTINGS_SINGLETON_ID: "store-settings-singleton",
	getStoreSettingsInvalidationTags: mockGetStoreSettingsInvalidationTags,
}));
vi.mock("../../schemas/store-settings.schemas", () => ({
	updateReopensAtSchema: {},
}));

import { updateReopensAt } from "../update-reopens-at";

// ============================================================================
// HELPERS
// ============================================================================

const ADMIN_USER = { id: "admin-1", name: "Admin Test", email: "admin@test.com" };
const SINGLETON_ID = "store-settings-singleton";
const FUTURE_DATE = new Date("2030-01-01T10:00:00Z");
const PREVIOUS_DATE = new Date("2026-06-01T10:00:00Z");

function formData(overrides: Record<string, string> = {}) {
	return createMockFormData({
		reopensAt: FUTURE_DATE.toISOString(),
		...overrides,
	});
}

// ============================================================================
// TESTS
// ============================================================================

describe("updateReopensAt", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdminWithUser.mockResolvedValue({ user: ADMIN_USER });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockReturnValue({
			data: { reopensAt: FUTURE_DATE },
		});
		mockPrisma.storeSettings.findUnique.mockResolvedValue({
			isClosed: true,
			reopensAt: PREVIOUS_DATE,
		});
		mockPrisma.storeSettings.updateMany.mockResolvedValue({ count: 1 });
		mockGetStoreSettingsInvalidationTags.mockReturnValue(["store-status", "store-settings"]);
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
		const result = await updateReopensAt(undefined, formData());
		expect(result.status).toBe(ActionStatus.FORBIDDEN);
		expect(mockEnforceRateLimit).not.toHaveBeenCalled();
	});

	// ─── Rate limit ────────────────────────────────────────────────────────

	it("returns error when rate limited", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Trop de requêtes" },
		});
		const result = await updateReopensAt(undefined, formData());
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockValidateInput).not.toHaveBeenCalled();
	});

	// ─── Validation ────────────────────────────────────────────────────────

	it("returns validation error when input is invalid", async () => {
		mockValidateInput.mockReturnValue({
			error: { status: ActionStatus.VALIDATION_ERROR, message: "Date passée" },
		});
		const result = await updateReopensAt(undefined, formData());
		expect(result).toEqual({
			status: ActionStatus.VALIDATION_ERROR,
			message: "Date passée",
		});
	});

	// ─── Singleton check ───────────────────────────────────────────────────

	it("returns error when singleton does not exist", async () => {
		mockPrisma.storeSettings.findUnique.mockResolvedValue(null);
		await updateReopensAt(undefined, formData());
		expect(mockError).toHaveBeenCalledWith("Paramètres boutique introuvables");
		expect(mockPrisma.storeSettings.updateMany).not.toHaveBeenCalled();
	});

	// ─── Pre-condition store closed ────────────────────────────────────────

	it("rejects when store is open (updateMany matches 0 rows)", async () => {
		mockPrisma.storeSettings.findUnique.mockResolvedValue({
			isClosed: false,
			reopensAt: null,
		});
		mockPrisma.storeSettings.updateMany.mockResolvedValue({ count: 0 });
		await updateReopensAt(undefined, formData());
		expect(mockError).toHaveBeenCalledWith(
			"La boutique est ouverte, aucune réouverture à planifier",
		);
	});

	// ─── Update mutation ───────────────────────────────────────────────────

	it("updates only reopensAt field atomically with WHERE isClosed=true", async () => {
		await updateReopensAt(undefined, formData());
		expect(mockPrisma.storeSettings.updateMany).toHaveBeenCalledWith({
			where: { id: SINGLETON_ID, isClosed: true },
			data: { reopensAt: FUTURE_DATE },
		});
	});

	it("sets reopensAt to null when empty input (disables auto-reopen)", async () => {
		mockValidateInput.mockReturnValue({ data: { reopensAt: null } });
		await updateReopensAt(undefined, formData({ reopensAt: "" }));
		expect(mockPrisma.storeSettings.updateMany).toHaveBeenCalledWith({
			where: { id: SINGLETON_ID, isClosed: true },
			data: { reopensAt: null },
		});
	});

	it("returns success message when scheduling reopen", async () => {
		const result = await updateReopensAt(undefined, formData());
		expect(result.message).toContain("Date de réouverture");
	});

	it("returns disable message when clearing reopensAt", async () => {
		mockValidateInput.mockReturnValue({ data: { reopensAt: null } });
		const result = await updateReopensAt(undefined, formData({ reopensAt: "" }));
		expect(result.message).toContain("désactivée");
	});

	// ─── Cache invalidation ────────────────────────────────────────────────

	it("invalidates all store settings cache tags", async () => {
		await updateReopensAt(undefined, formData());
		expect(mockUpdateTag).toHaveBeenCalledWith("store-status");
		expect(mockUpdateTag).toHaveBeenCalledWith("store-settings");
	});

	// ─── Audit logging ─────────────────────────────────────────────────────

	it("logs audit with store.update-reopens-at action", async () => {
		await updateReopensAt(undefined, formData());
	});

	it("includes previous and new ISO date in audit metadata", async () => {
		await updateReopensAt(undefined, formData());
	});

	it("encodes null values in audit metadata when clearing", async () => {
		mockPrisma.storeSettings.findUnique.mockResolvedValue({
			isClosed: true,
			reopensAt: null,
		});
		mockValidateInput.mockReturnValue({ data: { reopensAt: null } });
		await updateReopensAt(undefined, formData({ reopensAt: "" }));
	});

	// ─── Error handling ────────────────────────────────────────────────────

	it("calls handleActionError on unexpected exception", async () => {
		mockPrisma.storeSettings.updateMany.mockRejectedValue(new Error("DB crash"));
		const result = await updateReopensAt(undefined, formData());
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockHandleActionError).toHaveBeenCalledWith(
			expect.any(Error),
			"Impossible de mettre à jour la date de réouverture",
		);
	});
});
