import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockCacheLife, mockCacheTag } = vi.hoisted(() => ({
	mockCacheLife: vi.fn(),
	mockCacheTag: vi.fn(),
}));

vi.mock("next/cache", () => ({
	cacheLife: mockCacheLife,
	cacheTag: mockCacheTag,
}));

import { cacheColors, cacheColorDetail, getColorInvalidationTags } from "../cache.utils";

// ============================================================================
// TESTS
// ============================================================================

describe("cacheColors", () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it("sets reference cache profile", () => {
		cacheColors();
		expect(mockCacheLife).toHaveBeenCalledWith("reference");
	});

	it("sets colors list cache tag", () => {
		cacheColors();
		expect(mockCacheTag).toHaveBeenCalledWith("colors-list");
	});
});

describe("cacheColorDetail", () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it("sets reference cache profile", () => {
		cacheColorDetail("rose-gold");
		expect(mockCacheLife).toHaveBeenCalledWith("reference");
	});

	it("sets both detail and list cache tags", () => {
		cacheColorDetail("rose-gold");
		expect(mockCacheTag).toHaveBeenCalledWith("color-rose-gold", "colors-list");
	});
});

describe("getColorInvalidationTags", () => {
	it("returns list and admin badges tags when no slug provided", () => {
		const tags = getColorInvalidationTags();
		expect(tags).toEqual(["colors-list", "admin-badges"]);
	});

	it("includes detail tag when slug is provided", () => {
		const tags = getColorInvalidationTags("or");
		expect(tags).toEqual(["colors-list", "admin-badges", "color-or"]);
	});

	it("generates correct detail tag format for hyphenated slugs", () => {
		const tags = getColorInvalidationTags("rose-gold");
		expect(tags).toContain("color-rose-gold");
	});

	it("does not include detail tag for empty string slug", () => {
		const tags = getColorInvalidationTags("");
		expect(tags).toEqual(["colors-list", "admin-badges"]);
	});
});
