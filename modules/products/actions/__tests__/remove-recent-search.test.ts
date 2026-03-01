import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockFormData } from "@/test/factories";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockEnforceRateLimit,
	mockUpdateTag,
	mockValidateInput,
	mockHandleActionError,
	mockSuccess,
	mockCookies,
	mockGetRecentSearchesInvalidationTags,
} = vi.hoisted(() => ({
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockValidateInput: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSuccess: vi.fn(),
	mockCookies: vi.fn(),
	mockGetRecentSearchesInvalidationTags: vi.fn(),
}));

vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
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
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: mockSuccess,
}));
vi.mock("next/headers", () => ({ cookies: mockCookies }));
vi.mock("../schemas/recent-searches.schemas", () => ({ removeRecentSearchSchema: {} }));
vi.mock("../constants/recent-searches", () => ({
	RECENT_SEARCHES_COOKIE_NAME: "recent-searches",
	RECENT_SEARCHES_COOKIE_MAX_AGE: 2592000,
}));
vi.mock("../../constants/cache", () => ({
	getRecentSearchesInvalidationTags: mockGetRecentSearchesInvalidationTags,
}));

import { removeRecentSearch } from "../remove-recent-search";

// ============================================================================
// HELPERS
// ============================================================================

const validFormData = createMockFormData({ term: "collier" });

function makeCookieStore(existingValue?: string) {
	return {
		get: vi.fn().mockReturnValue(existingValue ? { value: existingValue } : undefined),
		set: vi.fn(),
		delete: vi.fn(),
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("removeRecentSearch", () => {
	let cookieStore: ReturnType<typeof makeCookieStore>;

	beforeEach(() => {
		vi.resetAllMocks();

		const existing = encodeURIComponent(JSON.stringify(["bracelet lune", "collier", "bague"]));
		cookieStore = makeCookieStore(existing);
		mockCookies.mockResolvedValue(cookieStore);

		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockReturnValue({ data: { term: "collier" } });
		mockGetRecentSearchesInvalidationTags.mockReturnValue(["recent-searches-list"]);

		mockSuccess.mockImplementation((msg: string, data?: unknown) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
			data,
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
		const result = await removeRecentSearch(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should return validation error for invalid term", async () => {
		const valErr = { status: ActionStatus.VALIDATION_ERROR, message: "Terme invalide" };
		mockValidateInput.mockReturnValue({ error: valErr });
		const result = await removeRecentSearch(undefined, validFormData);
		expect(result).toEqual(valErr);
	});

	it("should remove the specified term from the list", async () => {
		await removeRecentSearch(undefined, validFormData);
		expect(cookieStore.set).toHaveBeenCalledWith(
			"recent-searches",
			encodeURIComponent(JSON.stringify(["bracelet lune", "bague"])),
			expect.any(Object),
		);
	});

	it("should delete the cookie when removing the last search term", async () => {
		const singleItem = encodeURIComponent(JSON.stringify(["collier"]));
		cookieStore = makeCookieStore(singleItem);
		mockCookies.mockResolvedValue(cookieStore);

		await removeRecentSearch(undefined, validFormData);

		expect(cookieStore.delete).toHaveBeenCalledWith("recent-searches");
		expect(cookieStore.set).not.toHaveBeenCalled();
	});

	it("should update cookie with strict sameSite when list is not empty after removal", async () => {
		await removeRecentSearch(undefined, validFormData);
		expect(cookieStore.set).toHaveBeenCalledWith(
			"recent-searches",
			expect.any(String),
			expect.objectContaining({ sameSite: "strict", httpOnly: true }),
		);
	});

	it("should silently handle corrupted cookie and delete it", async () => {
		cookieStore = makeCookieStore("bad-json{{{");
		mockCookies.mockResolvedValue(cookieStore);

		const result = await removeRecentSearch(undefined, validFormData);
		// After reset the list is empty so cookie should be deleted
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(cookieStore.delete).toHaveBeenCalledWith("recent-searches");
	});

	it("should succeed even when cookie does not exist", async () => {
		cookieStore = makeCookieStore();
		mockCookies.mockResolvedValue(cookieStore);

		const result = await removeRecentSearch(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		// List is empty -> cookie deleted
		expect(cookieStore.delete).toHaveBeenCalledWith("recent-searches");
	});

	it("should invalidate cache after removing term", async () => {
		await removeRecentSearch(undefined, validFormData);
		expect(mockGetRecentSearchesInvalidationTags).toHaveBeenCalled();
		expect(mockUpdateTag).toHaveBeenCalledWith("recent-searches-list");
	});

	it("should return updated searches list in success data", async () => {
		await removeRecentSearch(undefined, validFormData);
		expect(mockSuccess).toHaveBeenCalledWith("Recherche supprimee", {
			searches: ["bracelet lune", "bague"],
		});
	});
});
