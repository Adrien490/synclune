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

import { cacheProductTypes, getProductTypeInvalidationTags } from "../cache.utils";

beforeEach(() => {
	vi.clearAllMocks();
});

// ============================================================================
// cacheProductTypes
// ============================================================================

describe("cacheProductTypes", () => {
	it("sets reference cache life and LIST tag", () => {
		cacheProductTypes();

		expect(mockCacheLife).toHaveBeenCalledWith("reference");
		expect(mockCacheTag).toHaveBeenCalledWith("product-types-list");
	});
});

// ============================================================================
// getProductTypeInvalidationTags
// ============================================================================

describe("getProductTypeInvalidationTags", () => {
	it("returns LIST, ADMIN_BADGES, and NAVBAR_MENU tags", () => {
		const tags = getProductTypeInvalidationTags();

		expect(tags).toContain("product-types-list");
		expect(tags).toContain("admin-badges");
		expect(tags).toContain("navbar-menu");
		expect(tags).toHaveLength(3);
	});
});
