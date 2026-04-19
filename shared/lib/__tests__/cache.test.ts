import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockCacheLife, mockCacheTag } = vi.hoisted(() => ({
	mockCacheLife: vi.fn(),
	mockCacheTag: vi.fn(),
}));

vi.mock("next/cache", () => ({
	cacheLife: mockCacheLife,
	cacheTag: mockCacheTag,
	updateTag: vi.fn(),
}));

import { cacheDashboard } from "../cache";

// ============================================================================
// Tests: cacheDashboard
// ============================================================================

describe("cacheDashboard", () => {
	beforeEach(() => {
		mockCacheLife.mockClear();
		mockCacheTag.mockClear();
	});

	it("calls cacheLife with the dashboard profile", () => {
		cacheDashboard();

		expect(mockCacheLife).toHaveBeenCalledOnce();
		expect(mockCacheLife).toHaveBeenCalledWith("user");
	});

	it("does not call cacheTag when no tag is provided", () => {
		cacheDashboard();

		expect(mockCacheTag).not.toHaveBeenCalled();
	});

	it("calls cacheTag with the given tag when a tag is provided", () => {
		cacheDashboard("my-data-tag");

		expect(mockCacheTag).toHaveBeenCalledOnce();
		expect(mockCacheTag).toHaveBeenCalledWith("my-data-tag");
	});

	it("calls both cacheLife and cacheTag when a tag is provided", () => {
		cacheDashboard("some-tag");

		expect(mockCacheLife).toHaveBeenCalledOnce();
		expect(mockCacheTag).toHaveBeenCalledOnce();
	});

	it("calls cacheLife before cacheTag", () => {
		const callOrder: string[] = [];
		mockCacheLife.mockImplementation(() => callOrder.push("cacheLife"));
		mockCacheTag.mockImplementation(() => callOrder.push("cacheTag"));

		cacheDashboard("ordered-tag");

		expect(callOrder).toEqual(["cacheLife", "cacheTag"]);
	});

	it("does not call cacheTag when tag is an empty string (falsy)", () => {
		cacheDashboard("");

		expect(mockCacheTag).not.toHaveBeenCalled();
	});

	it("returns void", () => {
		const result = cacheDashboard("tag");

		expect(result).toBeUndefined();
	});
});
