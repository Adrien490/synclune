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
	ADMIN_STORE_SETTINGS_LIMITS: { CANCEL_SCHEDULED_CLOSURE: "cancel-schedule" },
}));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag }));
vi.mock("@/shared/lib/actions", () => ({
	handleActionError: mockHandleActionError,
	success: mockSuccess,
	error: mockError,
}));
vi.mock("@/shared/lib/audit-log", () => ({ logAudit: mockLogAudit }));
vi.mock("../../constants/cache", () => ({
	STORE_SETTINGS_SINGLETON_ID: "store-settings-singleton",
	getStoreSettingsInvalidationTags: mockGetStoreSettingsInvalidationTags,
}));

import { cancelScheduledClosure } from "../cancel-scheduled-closure";

// ============================================================================
// HELPERS
// ============================================================================

const ADMIN_USER = { id: "admin-1", name: "Admin Test", email: "admin@test.com" };
const SINGLETON_ID = "store-settings-singleton";
const SCHEDULED = new Date("2030-07-01T10:00:00Z");

// ============================================================================
// TESTS
// ============================================================================

describe("cancelScheduledClosure", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdminWithUser.mockResolvedValue({ user: ADMIN_USER });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockPrisma.storeSettings.findUnique.mockResolvedValue({ scheduledCloseAt: SCHEDULED });
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

	// ─── Auth & rate limit ─────────────────────────────────────────────────

	it("returns auth error when user is not admin", async () => {
		mockRequireAdminWithUser.mockResolvedValue({
			error: { status: ActionStatus.FORBIDDEN, message: "Admin requis" },
		});
		const result = await cancelScheduledClosure(undefined, createMockFormData({}));
		expect(result.status).toBe(ActionStatus.FORBIDDEN);
	});

	it("returns error when rate limited", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Trop de requêtes" },
		});
		const result = await cancelScheduledClosure(undefined, createMockFormData({}));
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	// ─── Pre-conditions ────────────────────────────────────────────────────

	it("rejects when no scheduled closure exists", async () => {
		mockPrisma.storeSettings.findUnique.mockResolvedValue({ scheduledCloseAt: null });
		await cancelScheduledClosure(undefined, createMockFormData({}));
		expect(mockError).toHaveBeenCalledWith("Aucune fermeture planifiée");
		expect(mockPrisma.storeSettings.update).not.toHaveBeenCalled();
	});

	it("returns error when singleton does not exist", async () => {
		mockPrisma.storeSettings.findUnique.mockResolvedValue(null);
		await cancelScheduledClosure(undefined, createMockFormData({}));
		expect(mockError).toHaveBeenCalledWith("Paramètres boutique introuvables");
	});

	// ─── Mutation ──────────────────────────────────────────────────────────

	it("clears scheduledCloseAt, closureMessage, and reopensAt", async () => {
		await cancelScheduledClosure(undefined, createMockFormData({}));
		expect(mockPrisma.storeSettings.update).toHaveBeenCalledWith({
			where: { id: SINGLETON_ID },
			data: { scheduledCloseAt: null, closureMessage: null, reopensAt: null },
		});
	});

	// ─── Cache + audit ─────────────────────────────────────────────────────

	it("invalidates all cache tags", async () => {
		await cancelScheduledClosure(undefined, createMockFormData({}));
		expect(mockUpdateTag).toHaveBeenCalledWith("store-status");
		expect(mockUpdateTag).toHaveBeenCalledWith("store-settings");
	});

	it("logs audit with store.cancel-scheduled-closure action and canceled date", async () => {
		await cancelScheduledClosure(undefined, createMockFormData({}));
		expect(mockLogAudit).toHaveBeenCalledWith(
			expect.objectContaining({
				action: "store.cancel-scheduled-closure",
				targetId: SINGLETON_ID,
				metadata: { canceledScheduledCloseAt: SCHEDULED.toISOString() },
			}),
		);
	});

	// ─── Error handling ────────────────────────────────────────────────────

	it("calls handleActionError on unexpected exception", async () => {
		mockPrisma.storeSettings.update.mockRejectedValue(new Error("DB crash"));
		const result = await cancelScheduledClosure(undefined, createMockFormData({}));
		expect(mockHandleActionError).toHaveBeenCalledWith(
			expect.any(Error),
			"Impossible d'annuler la fermeture planifiée",
		);
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
