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
vi.mock("../schemas/recent-searches.schemas", () => ({ addRecentSearchSchema: {} }));
vi.mock("../constants/recent-searches", () => ({
	RECENT_SEARCHES_COOKIE_NAME: "recent-searches",
	RECENT_SEARCHES_COOKIE_MAX_AGE: 2592000,
	RECENT_SEARCHES_MAX_ITEMS: 5,
}));
vi.mock("../../constants/cache", () => ({
	getRecentSearchesInvalidationTags: mockGetRecentSearchesInvalidationTags,
}));

import { addRecentSearch } from "../add-recent-search";

// ============================================================================
// HELPERS
// ============================================================================

const validFormData = createMockFormData({ term: "bracelet lune" });

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

describe("addRecentSearch", () => {
	let cookieStore: ReturnType<typeof makeCookieStore>;

	beforeEach(() => {
		vi.resetAllMocks();

		cookieStore = makeCookieStore();
		mockCookies.mockResolvedValue(cookieStore);

		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockReturnValue({ data: { term: "bracelet lune" } });
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
		const result = await addRecentSearch(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should return validation error for invalid term", async () => {
		const valErr = { status: ActionStatus.VALIDATION_ERROR, message: "Terme invalide" };
		mockValidateInput.mockReturnValue({ error: valErr });
		const result = await addRecentSearch(undefined, validFormData);
		expect(result).toEqual(valErr);
	});

	it("should succeed and set cookie with strict sameSite when no existing cookie", async () => {
		const result = await addRecentSearch(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(cookieStore.set).toHaveBeenCalledWith(
			"recent-searches",
			expect.any(String),
			expect.objectContaining({ httpOnly: true, sameSite: "strict" }),
		);
	});

	it("should prepend new term and deduplicate existing ones", async () => {
		const existing = encodeURIComponent(JSON.stringify(["collier", "bague"]));
		cookieStore = makeCookieStore(existing);
		mockCookies.mockResolvedValue(cookieStore);
		mockValidateInput.mockReturnValue({ data: { term: "collier" } });

		await addRecentSearch(undefined, createMockFormData({ term: "collier" }));

		expect(cookieStore.set).toHaveBeenCalledWith(
			"recent-searches",
			encodeURIComponent(JSON.stringify(["collier", "bague"])),
			expect.any(Object),
		);
	});

	it("should prepend new term before existing searches", async () => {
		const existing = encodeURIComponent(JSON.stringify(["collier", "bague"]));
		cookieStore = makeCookieStore(existing);
		mockCookies.mockResolvedValue(cookieStore);

		await addRecentSearch(undefined, validFormData);

		expect(cookieStore.set).toHaveBeenCalledWith(
			"recent-searches",
			encodeURIComponent(JSON.stringify(["bracelet lune", "collier", "bague"])),
			expect.any(Object),
		);
	});

	it("should slice list to max items (5)", async () => {
		const existing = ["a", "b", "c", "d", "e"];
		cookieStore = makeCookieStore(encodeURIComponent(JSON.stringify(existing)));
		mockCookies.mockResolvedValue(cookieStore);

		await addRecentSearch(undefined, validFormData);

		const [, encodedValue] = cookieStore.set.mock.calls[0]!;
		const saved = JSON.parse(decodeURIComponent(encodedValue));
		expect(saved).toHaveLength(5);
		expect(saved[0]).toBe("bracelet lune");
	});

	it("should silently reset on corrupted cookie", async () => {
		cookieStore = makeCookieStore("corrupt{{{json");
		mockCookies.mockResolvedValue(cookieStore);

		const result = await addRecentSearch(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(cookieStore.set).toHaveBeenCalledWith(
			"recent-searches",
			encodeURIComponent(JSON.stringify(["bracelet lune"])),
			expect.any(Object),
		);
	});

	it("should invalidate cache after setting cookie", async () => {
		await addRecentSearch(undefined, validFormData);
		expect(mockGetRecentSearchesInvalidationTags).toHaveBeenCalled();
		expect(mockUpdateTag).toHaveBeenCalledWith("recent-searches-list");
	});

	it("should return updated searches list in success data", async () => {
		await addRecentSearch(undefined, validFormData);
		expect(mockSuccess).toHaveBeenCalledWith("Recherche ajoutée", { searches: ["bracelet lune"] });
	});
});
