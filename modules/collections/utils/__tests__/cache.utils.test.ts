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
	cacheCollections,
	cacheCollectionDetail,
	getCollectionInvalidationTags,
} from "../cache.utils";

beforeEach(() => {
	vi.clearAllMocks();
});

// ============================================================================
// cacheCollections
// ============================================================================

describe("cacheCollections", () => {
	it("sets collections cache life and LIST tag", () => {
		cacheCollections();

		expect(mockCacheLife).toHaveBeenCalledWith("reference");
		expect(mockCacheTag).toHaveBeenCalledWith("collections-list");
	});
});

// ============================================================================
// cacheCollectionDetail
// ============================================================================

describe("cacheCollectionDetail", () => {
	it("sets collections cache life and DETAIL + PRODUCTS + LIST tags", () => {
		cacheCollectionDetail("ete-2024");

		expect(mockCacheLife).toHaveBeenCalledWith("reference");
		expect(mockCacheTag).toHaveBeenCalledWith(
			"collection-ete-2024",
			"collection-ete-2024-products",
			"collections-list",
		);
	});

	it("uses the slug in DETAIL and PRODUCTS tags", () => {
		cacheCollectionDetail("noel");

		expect(mockCacheTag).toHaveBeenCalledWith(
			"collection-noel",
			"collection-noel-products",
			"collections-list",
		);
	});
});

// ============================================================================
// getCollectionInvalidationTags
// ============================================================================

describe("getCollectionInvalidationTags", () => {
	it("returns all expected invalidation tags", () => {
		const tags = getCollectionInvalidationTags("ete-2024");

		expect(tags).toContain("collections-list");
		expect(tags).toContain("collection-counts");
		expect(tags).toContain("collection-ete-2024");
		expect(tags).toContain("collection-ete-2024-products");
		expect(tags).toContain("products-list");
		expect(tags).toContain("admin-badges");
		expect(tags).toHaveLength(6);
	});

	it("uses the slug in DETAIL and PRODUCTS tags", () => {
		const tags = getCollectionInvalidationTags("noel");

		expect(tags).toContain("collection-noel");
		expect(tags).toContain("collection-noel-products");
	});

	it("does not include tags from other collections", () => {
		const tags = getCollectionInvalidationTags("printemps");

		const otherTags = tags.filter((t) => t.includes("ete-2024") || t.includes("noel"));
		expect(otherTags).toHaveLength(0);
	});
});
