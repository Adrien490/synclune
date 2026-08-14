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
} = vi.hoisted(() => ({
	mockPrisma: {
		storeSettings: { findUnique: vi.fn(), updateMany: vi.fn() },
	},
	mockRequireAdminWithUser: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockGetStoreSettingsInvalidationTags: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/modules/admin-auth/lib/require-admin", () => ({
	requireAdmin: mockRequireAdminWithUser,
	requireAdminWithUser: mockRequireAdminWithUser,
}));
vi.mock("@/modules/admin-auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_STORE_SETTINGS_LIMITS: { REOPEN_STORE: "reopen-store" },
}));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag }));
vi.mock("@/shared/lib/actions", () => ({
	handleActionError: mockHandleActionError,
	success: mockSuccess,
	error: mockError,
}));
vi.mock("../../constants/cache", () => ({
	STORE_SETTINGS_SINGLETON_ID: "store-settings-singleton",
	getStoreSettingsInvalidationTags: mockGetStoreSettingsInvalidationTags,
}));

import { reopenStore } from "../reopen-store";

// ============================================================================
// HELPERS
// ============================================================================

const ADMIN_USER = { id: "admin-1", name: "Admin Test", email: "admin@test.com" };
const SINGLETON_ID = "store-settings-singleton";

// ============================================================================
// TESTS
// ============================================================================

describe("reopenStore", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdminWithUser.mockResolvedValue({ user: ADMIN_USER });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockPrisma.storeSettings.findUnique.mockResolvedValue({ id: SINGLETON_ID });
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

	// ─── Auth & rate limit ─────────────────────────────────────────────────

	it("returns auth error when user is not admin", async () => {
		mockRequireAdminWithUser.mockResolvedValue({
			error: { status: ActionStatus.FORBIDDEN, message: "Admin requis" },
		});
		const result = await reopenStore(undefined, createMockFormData({}));
		expect(result.status).toBe(ActionStatus.FORBIDDEN);
		expect(mockEnforceRateLimit).not.toHaveBeenCalled();
	});

	it("returns error when rate limited", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Trop de requêtes" },
		});
		const result = await reopenStore(undefined, createMockFormData({}));
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockPrisma.storeSettings.updateMany).not.toHaveBeenCalled();
	});

	// ─── Idempotence ───────────────────────────────────────────────────────

	it("rejects when store is already open (updateMany matches 0 rows)", async () => {
		mockPrisma.storeSettings.updateMany.mockResolvedValue({ count: 0 });
		mockPrisma.storeSettings.findUnique.mockResolvedValue({ id: SINGLETON_ID });
		await reopenStore(undefined, createMockFormData({}));
		expect(mockError).toHaveBeenCalledWith("La boutique est déjà ouverte");
	});

	it("returns error when singleton does not exist", async () => {
		mockPrisma.storeSettings.updateMany.mockResolvedValue({ count: 0 });
		mockPrisma.storeSettings.findUnique.mockResolvedValue(null);
		await reopenStore(undefined, createMockFormData({}));
		expect(mockError).toHaveBeenCalledWith("Paramètres boutique introuvables");
	});

	// ─── Mutation ──────────────────────────────────────────────────────────

	it("reopens store atomically with check-and-set WHERE isClosed=true", async () => {
		await reopenStore(undefined, createMockFormData({}));
		expect(mockPrisma.storeSettings.updateMany).toHaveBeenCalledWith({
			where: { id: SINGLETON_ID, isClosed: true },
			data: {
				isClosed: false,
				closureMessage: null,
				closedAt: null,
				closedBy: null,
				reopensAt: null,
			},
		});
	});

	// ─── Cache + audit + success ──────────────────────────────────────────

	it("invalidates all cache tags", async () => {
		await reopenStore(undefined, createMockFormData({}));
		expect(mockUpdateTag).toHaveBeenCalledWith("store-status");
		expect(mockUpdateTag).toHaveBeenCalledWith("store-settings");
	});

	it("logs audit with store.reopen action and empty metadata", async () => {
		await reopenStore(undefined, createMockFormData({}));
	});

	it("returns success message", async () => {
		const result = await reopenStore(undefined, createMockFormData({}));
		expect(result.message).toContain("réouverte");
	});

	// ─── Error handling ────────────────────────────────────────────────────

	it("calls handleActionError on unexpected exception", async () => {
		mockPrisma.storeSettings.updateMany.mockRejectedValue(new Error("DB crash"));
		const result = await reopenStore(undefined, createMockFormData({}));
		expect(mockHandleActionError).toHaveBeenCalledWith(
			expect.any(Error),
			"Impossible de réouvrir la boutique",
		);
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
