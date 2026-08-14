import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockFormData } from "@/test/factories";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockEnforceRateLimit, mockUpdateTag, mockHandleActionError, mockSuccess, mockCookies } =
	vi.hoisted(() => ({
		mockEnforceRateLimit: vi.fn(),
		mockUpdateTag: vi.fn(),
		mockHandleActionError: vi.fn(),
		mockSuccess: vi.fn(),
		mockCookies: vi.fn(),
	}));

vi.mock("@/modules/admin-auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	PRODUCT_LIMITS: { COOKIE_ACTION: "product-cookie-action" },
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
vi.mock("next/headers", () => ({ cookies: mockCookies }));
vi.mock("../constants/recent-searches", () => ({
	RECENT_SEARCHES_COOKIE_NAME: "recent-searches",
}));
vi.mock("../../constants/cache", () => ({}));

import { clearRecentSearches } from "../clear-recent-searches";

// ============================================================================
// HELPERS
// ============================================================================

const emptyFormData = createMockFormData({});

function makeCookieStore() {
	return {
		get: vi.fn(),
		set: vi.fn(),
		delete: vi.fn(),
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("clearRecentSearches", () => {
	let cookieStore: ReturnType<typeof makeCookieStore>;

	beforeEach(() => {
		vi.resetAllMocks();

		cookieStore = makeCookieStore();
		mockCookies.mockResolvedValue(cookieStore);

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

	it("should return rate limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Rate limit" },
		});
		const result = await clearRecentSearches(undefined, emptyFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should delete the recent searches cookie", async () => {
		await clearRecentSearches(undefined, emptyFormData);
		expect(cookieStore.delete).toHaveBeenCalledWith("recent-searches");
	});

	// Cf. `add-recent-search.test.ts` : le tag n'avait aucun lecteur.
	it("n'invalide AUCUN tag (le lecteur cookie n'est pas caché)", async () => {
		await clearRecentSearches(undefined, emptyFormData);
		expect(mockUpdateTag).not.toHaveBeenCalled();
	});

	it("should return success response", async () => {
		const result = await clearRecentSearches(undefined, emptyFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockSuccess).toHaveBeenCalledWith("Recherches effacees");
	});

	it("should handle unexpected error via handleActionError", async () => {
		mockCookies.mockRejectedValue(new Error("cookie crash"));
		const result = await clearRecentSearches(undefined, emptyFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockHandleActionError).toHaveBeenCalled();
	});

	it("should be idempotent when invoked twice with no existing cookie", async () => {
		await clearRecentSearches(undefined, emptyFormData);
		await clearRecentSearches(undefined, emptyFormData);
		expect(cookieStore.delete).toHaveBeenCalledTimes(2);
		expect(cookieStore.delete).toHaveBeenNthCalledWith(1, "recent-searches");
		expect(cookieStore.delete).toHaveBeenNthCalledWith(2, "recent-searches");
	});

	it("supprime le cookie sans dépendre d'aucun helper d'invalidation", async () => {
		const result = await clearRecentSearches(undefined, emptyFormData);
		expect(cookieStore.delete).toHaveBeenCalledWith("recent-searches");
		expect(mockUpdateTag).not.toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});
});
