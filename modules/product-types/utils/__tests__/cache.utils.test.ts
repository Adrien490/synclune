import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Mocks
// ============================================================================

const mockCacheLife = vi.fn();
const mockCacheTag = vi.fn();

vi.mock("next/cache", () => ({
	cacheLife: (...args: unknown[]) => mockCacheLife(...args),
	cacheTag: (...args: unknown[]) => mockCacheTag(...args),
}));

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

// ============================================================================
// Imports (after mocks)
// ============================================================================

import {
	cacheProductTypes,
	cacheProductTypesAdmin,
	cacheProductTypesPublic,
	cacheProductTypeDetail,
	cacheProductTypeCounts,
	getProductTypeInvalidationTags,
	productTypeDetailTag,
	productTypeCountsTag,
} from "../cache.utils";

beforeEach(() => {
	vi.clearAllMocks();
});

// ============================================================================
// cacheProductTypes (legacy / public alias)
// ============================================================================

describe("cacheProductTypes", () => {
	it("sets reference cache life and LIST tag", () => {
		cacheProductTypes();

		expect(mockCacheLife).toHaveBeenCalledWith("reference");
		expect(mockCacheTag).toHaveBeenCalledWith("product-types-list");
	});
});

// ============================================================================
// cacheProductTypesPublic
// ============================================================================

describe("cacheProductTypesPublic", () => {
	it("uses 'reference' profile (data stable : navbar / sitemap)", () => {
		cacheProductTypesPublic();

		expect(mockCacheLife).toHaveBeenCalledWith("reference");
		expect(mockCacheTag).toHaveBeenCalledWith("product-types-list");
	});
});

// ============================================================================
// cacheProductTypesAdmin
// ============================================================================

describe("cacheProductTypesAdmin", () => {
	it("uses 'user' profile (admin feedback rapide post-mutation)", () => {
		cacheProductTypesAdmin();

		expect(mockCacheLife).toHaveBeenCalledWith("user");
		expect(mockCacheTag).toHaveBeenCalledWith("product-types-list");
	});
});

// ============================================================================
// cacheProductTypeDetail
// ============================================================================

describe("cacheProductTypeDetail", () => {
	it("tags granular detail + LIST + uses 'user' profile", () => {
		cacheProductTypeDetail("bagues");

		expect(mockCacheLife).toHaveBeenCalledWith("user");
		expect(mockCacheTag).toHaveBeenCalledWith("product-types-list");
		expect(mockCacheTag).toHaveBeenCalledWith("product-type-bagues");
	});
});

// ============================================================================
// cacheProductTypeCounts
// ============================================================================

describe("cacheProductTypeCounts", () => {
	it("tags counts by productTypeId + uses 'user' profile", () => {
		cacheProductTypeCounts("pt-123");

		expect(mockCacheLife).toHaveBeenCalledWith("user");
		expect(mockCacheTag).toHaveBeenCalledWith("product-type-pt-123-counts");
	});

	it("also tags products-list (cascade : les mutations produit invalident les counts)", () => {
		cacheProductTypeCounts("pt-123");

		expect(mockCacheTag).toHaveBeenCalledWith("products-list");
	});
});

// ============================================================================
// Tag builders
// ============================================================================

describe("productTypeDetailTag", () => {
	it("returns slug-prefixed tag", () => {
		expect(productTypeDetailTag("bagues")).toBe("product-type-bagues");
	});
});

describe("productTypeCountsTag", () => {
	it("returns id-prefixed counts tag", () => {
		expect(productTypeCountsTag("pt-1")).toBe("product-type-pt-1-counts");
	});
});

// ============================================================================
// getProductTypeInvalidationTags
// ============================================================================

describe("getProductTypeInvalidationTags", () => {
	it("returns LIST + ADMIN_BADGES + NAVBAR_MENU + PRODUCTS_LIST cascade by default", () => {
		const tags = getProductTypeInvalidationTags();

		expect(tags).toContain("product-types-list");
		expect(tags).toContain("admin-badges");
		expect(tags).toContain("navbar-menu");
		// Cascade : tout changement de label/slug impacte les cards produits.
		expect(tags).toContain("products-list");
		expect(tags).toHaveLength(4);
	});

	it("includes detail tag when slug is provided", () => {
		const tags = getProductTypeInvalidationTags("bagues");

		expect(tags).toContain("product-type-bagues");
		expect(tags).toHaveLength(5);
	});

	it("omits detail tag when slug is undefined", () => {
		const tags = getProductTypeInvalidationTags(undefined);

		expect(tags).not.toContain("product-type-undefined");
	});

	it("includes counts tag when productTypeId is provided", () => {
		const tags = getProductTypeInvalidationTags("bagues", "pt-123");

		expect(tags).toContain("product-type-pt-123-counts");
		expect(tags).toHaveLength(6);
	});

	it("omits counts tag when productTypeId is undefined", () => {
		const tags = getProductTypeInvalidationTags("bagues");

		expect(tags.some((t) => t.endsWith("-counts"))).toBe(false);
	});
});
