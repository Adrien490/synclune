import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockRequireAdmin,
	mockEnforceRateLimit,
	mockUpdateTag,
	mockHandleActionError,
	mockSuccess,
} = vi.hoisted(() => ({
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSuccess: vi.fn(),
}));

vi.mock("@/modules/admin-auth/lib/require-admin", () => ({
	requireAdmin: mockRequireAdmin,
	requireAdminWithUser: mockRequireAdmin,
}));
vi.mock("@/modules/admin-auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_COLLECTION_LIMITS: { REFRESH: "col-refresh" },
}));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag, cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("@/shared/lib/actions", () => ({
	safeFormGet: (formData: FormData, key: string) => {
		const v = formData.get(key);
		return typeof v === "string" ? v : null;
	},
	handleActionError: mockHandleActionError,
	success: mockSuccess,
}));
// ⚠️ Pas de mock de `COLLECTIONS_CACHE_TAGS`. Il y en avait un, sur le chemin
// `"../constants/cache"` — résolu depuis CE fichier, donc vers
// `modules/collections/actions/constants/cache`, qui n'existe pas : un no-op
// silencieux depuis toujours. Le test lisait déjà la vraie SSOT, et ne passait que
// parce qu'elle codait le littéral en dur. Depuis le 2026-08-07 elle alias
// `SHARED_CACHE_TAGS.COLLECTIONS_LIST`, d'où l'entrée ci-dessous : un mock partiel
// de `cache-tags` rendait `COLLECTIONS_CACHE_TAGS.LIST` `undefined`.
vi.mock("@/shared/constants/cache-tags", () => ({
	SHARED_CACHE_TAGS: {
		ADMIN_BADGES: "admin-badges",
		COLLECTIONS_LIST: "collections-list",
	},
}));

import { refreshCollections } from "../refresh-collections";

// ============================================================================
// TESTS
// ============================================================================

describe("refreshCollections", () => {
	const mockFormData = new FormData();

	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({ success: true });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockSuccess.mockImplementation((msg: string) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
		}));
		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));
	});

	it("should return auth error when not admin", async () => {
		mockRequireAdmin.mockResolvedValue({
			error: { status: ActionStatus.UNAUTHORIZED, message: "Non autorisé" },
		});
		const result = await refreshCollections(undefined, mockFormData);
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
		expect(mockUpdateTag).not.toHaveBeenCalled();
	});

	it("should return rate limit error when rate limit is exceeded", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Rate limit dépassé" },
		});
		const result = await refreshCollections(undefined, mockFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockUpdateTag).not.toHaveBeenCalled();
	});

	it("should invalidate all collection cache tags on success", async () => {
		mockSuccess.mockReturnValue({
			status: ActionStatus.SUCCESS,
			message: "Collections rafraîchies",
		});
		await refreshCollections(undefined, mockFormData);
		expect(mockUpdateTag).toHaveBeenCalledWith("collections-list");
		expect(mockUpdateTag).toHaveBeenCalledWith("collection-counts");
		expect(mockUpdateTag).toHaveBeenCalledWith("admin-badges");
		// `collections-list` couvre aussi le mega-menu : `getNavbarMenuData` lit
		// l'entrée de `fetchCollections` directement (ex-tag `navbar-menu` déposé).
		expect(mockUpdateTag).toHaveBeenCalledTimes(3);
	});

	it("should return success after cache invalidation", async () => {
		const result = await refreshCollections(undefined, mockFormData);
		expect(mockSuccess).toHaveBeenCalledWith("Collections rafraîchies");
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("should call handleActionError on unexpected exception", async () => {
		mockRequireAdmin.mockRejectedValue(new Error("DB crash"));
		const result = await refreshCollections(undefined, mockFormData);
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
