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

import { cacheDefault } from "../cache";

// ============================================================================
// Tests: cacheDefault
// ============================================================================

describe("cacheDefault", () => {
	beforeEach(() => {
		mockCacheLife.mockClear();
		mockCacheTag.mockClear();
	});

	it("calls cacheLife with the dashboard profile", () => {
		cacheDefault();

		expect(mockCacheLife).toHaveBeenCalledOnce();
		expect(mockCacheLife).toHaveBeenCalledWith("dashboard");
	});

	it("does not call cacheTag when no tag is provided", () => {
		cacheDefault();

		expect(mockCacheTag).not.toHaveBeenCalled();
	});

	it("calls cacheTag with the given tag when a tag is provided", () => {
		cacheDefault("my-data-tag");

		expect(mockCacheTag).toHaveBeenCalledOnce();
		expect(mockCacheTag).toHaveBeenCalledWith("my-data-tag");
	});

	it("calls both cacheLife and cacheTag when a tag is provided", () => {
		cacheDefault("some-tag");

		expect(mockCacheLife).toHaveBeenCalledOnce();
		expect(mockCacheTag).toHaveBeenCalledOnce();
	});

	it("calls cacheLife before cacheTag", () => {
		const callOrder: string[] = [];
		mockCacheLife.mockImplementation(() => callOrder.push("cacheLife"));
		mockCacheTag.mockImplementation(() => callOrder.push("cacheTag"));

		cacheDefault("ordered-tag");

		expect(callOrder).toEqual(["cacheLife", "cacheTag"]);
	});

	it("does not call cacheTag when tag is an empty string (falsy)", () => {
		cacheDefault("");

		expect(mockCacheTag).not.toHaveBeenCalled();
	});

	it("returns void", () => {
		const result = cacheDefault("tag");

		expect(result).toBeUndefined();
	});
});
