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
	mockGetRecentProductsInvalidationTags,
} = vi.hoisted(() => ({
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockValidateInput: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSuccess: vi.fn(),
	mockCookies: vi.fn(),
	mockGetRecentProductsInvalidationTags: vi.fn(),
}));

vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	PRODUCT_LIMITS: { COOKIE_ACTION: "product-cookie-action" },
}));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag, cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("@/shared/lib/actions", () => ({
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: mockSuccess,
}));
vi.mock("next/headers", () => ({ cookies: mockCookies }));
vi.mock("@/shared/schemas/recent-product-schema", () => ({ recentProductSlugSchema: {} }));
vi.mock("../constants/recent-products", () => ({
	RECENT_PRODUCTS_COOKIE_NAME: "recent-products",
	RECENT_PRODUCTS_COOKIE_MAX_AGE: 2592000,
	RECENT_PRODUCTS_MAX_ITEMS: 10,
}));
vi.mock("../../constants/cache", () => ({
	getRecentProductsInvalidationTags: mockGetRecentProductsInvalidationTags,
}));

import { addRecentProduct } from "../add-recent-product";

// ============================================================================
// HELPERS
// ============================================================================

const validFormData = createMockFormData({ slug: "bracelet-lune" });

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

describe("addRecentProduct", () => {
	let cookieStore: ReturnType<typeof makeCookieStore>;

	beforeEach(() => {
		vi.resetAllMocks();

		cookieStore = makeCookieStore();
		mockCookies.mockResolvedValue(cookieStore);

		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockReturnValue({ data: "bracelet-lune" });
		mockGetRecentProductsInvalidationTags.mockReturnValue(["recent-products-list"]);

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
		const result = await addRecentProduct(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should return validation error for invalid slug", async () => {
		const valErr = { status: ActionStatus.VALIDATION_ERROR, message: "Slug invalide" };
		mockValidateInput.mockReturnValue({ error: valErr });
		const result = await addRecentProduct(undefined, validFormData);
		expect(result).toEqual(valErr);
	});

	it("should succeed and set cookie when no existing cookie", async () => {
		const result = await addRecentProduct(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(cookieStore.set).toHaveBeenCalledWith(
			"recent-products",
			expect.any(String),
			expect.objectContaining({ httpOnly: true, sameSite: "lax" }),
		);
	});

	it("should prepend new slug and deduplicate existing ones", async () => {
		const existing = encodeURIComponent(JSON.stringify(["collier-etoile", "bague-lune"]));
		cookieStore = makeCookieStore(existing);
		mockCookies.mockResolvedValue(cookieStore);
		mockValidateInput.mockReturnValue({ data: "collier-etoile" });

		await addRecentProduct(undefined, createMockFormData({ slug: "collier-etoile" }));

		expect(cookieStore.set).toHaveBeenCalledWith(
			"recent-products",
			encodeURIComponent(JSON.stringify(["collier-etoile", "bague-lune"])),
			expect.any(Object),
		);
	});

	it("should prepend new slug before existing items", async () => {
		const existing = encodeURIComponent(JSON.stringify(["collier-etoile", "bague-lune"]));
		cookieStore = makeCookieStore(existing);
		mockCookies.mockResolvedValue(cookieStore);

		await addRecentProduct(undefined, validFormData);

		expect(cookieStore.set).toHaveBeenCalledWith(
			"recent-products",
			encodeURIComponent(JSON.stringify(["bracelet-lune", "collier-etoile", "bague-lune"])),
			expect.any(Object),
		);
	});

	it("should slice list to max items (10)", async () => {
		const existing = Array.from({ length: 10 }, (_, i) => `produit-${i}`);
		cookieStore = makeCookieStore(encodeURIComponent(JSON.stringify(existing)));
		mockCookies.mockResolvedValue(cookieStore);

		await addRecentProduct(undefined, validFormData);

		const [, encodedValue] = cookieStore.set.mock.calls[0];
		const saved = JSON.parse(decodeURIComponent(encodedValue));
		expect(saved).toHaveLength(10);
		expect(saved[0]).toBe("bracelet-lune");
	});

	it("should silently reset on corrupted cookie", async () => {
		cookieStore = makeCookieStore("not-valid-json-at-all{{{");
		mockCookies.mockResolvedValue(cookieStore);

		const result = await addRecentProduct(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(cookieStore.set).toHaveBeenCalledWith(
			"recent-products",
			encodeURIComponent(JSON.stringify(["bracelet-lune"])),
			expect.any(Object),
		);
	});

	it("should invalidate cache after setting cookie", async () => {
		await addRecentProduct(undefined, validFormData);
		expect(mockGetRecentProductsInvalidationTags).toHaveBeenCalled();
		expect(mockUpdateTag).toHaveBeenCalledWith("recent-products-list");
	});

	it("should handle unexpected error via handleActionError", async () => {
		mockCookies.mockRejectedValue(new Error("cookie crash"));
		const result = await addRecentProduct(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockHandleActionError).toHaveBeenCalled();
	});

	it("should return updated products list in success data", async () => {
		await addRecentProduct(undefined, validFormData);
		expect(mockSuccess).toHaveBeenCalledWith("Produit ajouté", { products: ["bracelet-lune"] });
	});
});
