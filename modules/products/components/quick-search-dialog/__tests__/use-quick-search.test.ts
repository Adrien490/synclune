import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { QuickSearchResult } from "@/modules/products/data/quick-search-products";

// ─── Hoisted mocks ───────────────────────────────────────────────────────────

const { mockQuickSearch } = vi.hoisted(() => ({
	mockQuickSearch: vi.fn(),
}));

// ─── Module mocks ────────────────────────────────────────────────────────────

vi.mock("@/modules/products/actions/quick-search", () => ({
	quickSearch: mockQuickSearch,
}));

// ─── Import after mocks ──────────────────────────────────────────────────────

import { isSearchError, useQuickSearch } from "../use-quick-search";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const mockResetActiveIndex = vi.fn();
const mockSetValue = vi.fn();

function createSearchInputRef() {
	return { current: { setValue: mockSetValue } };
}

function makeResult(
	overrides: { totalCount?: number; suggestion?: string | null } = {},
): QuickSearchResult {
	return {
		kind: "success",
		products: [
			{
				id: "1",
				slug: "test",
				title: "Test Product",
				skus: [
					{
						priceInclTax: 1000,
						compareAtPrice: null,
						inventory: 5,
						isDefault: true,
						color: null,
						images: [],
					},
				],
			},
		],
		suggestion: overrides.suggestion ?? null,
		totalCount: overrides.totalCount ?? 1,
	};
}

function setup() {
	const searchInputRef = createSearchInputRef();
	const { result } = renderHook(() =>
		useQuickSearch({
			searchInputRef,
			resetActiveIndex: mockResetActiveIndex,
		}),
	);
	return { result, searchInputRef };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("useQuickSearch", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("has correct initial state", () => {
		const { result } = setup();

		expect(result.current.inputValue).toBe("");
		expect(result.current.searchResults).toBeNull();
		expect(result.current.isSearchMode).toBe(false);
		expect(result.current.searchQuery).toBe("");
	});

	it("handleInputValueChange updates inputValue and calls resetActiveIndex", () => {
		const { result } = setup();

		act(() => {
			result.current.handleInputValueChange("ab");
		});

		expect(result.current.inputValue).toBe("ab");
		expect(mockResetActiveIndex).toHaveBeenCalledOnce();
	});

	it("isSearchMode is true when trimmed input >= 3 chars, false otherwise", () => {
		const { result } = setup();

		act(() => {
			result.current.handleInputValueChange("ab");
		});
		expect(result.current.isSearchMode).toBe(false);

		act(() => {
			result.current.handleInputValueChange("abc");
		});
		expect(result.current.isSearchMode).toBe(true);

		act(() => {
			result.current.handleInputValueChange("  ab  ");
		});
		expect(result.current.isSearchMode).toBe(false);

		act(() => {
			result.current.handleInputValueChange("  abc  ");
		});
		expect(result.current.isSearchMode).toBe(true);
	});

	it("handleLiveSearch with short query sets results to null and query to empty", () => {
		const { result } = setup();

		act(() => {
			result.current.handleLiveSearch("a");
		});

		expect(result.current.searchResults).toBeNull();
		expect(result.current.searchQuery).toBe("");
		expect(mockQuickSearch).not.toHaveBeenCalled();
	});

	it("handleLiveSearch with 2-char query does not trigger search (MIN_SEARCH_LENGTH=3)", () => {
		const { result } = setup();

		act(() => {
			result.current.handleLiveSearch("ab");
		});

		expect(result.current.searchResults).toBeNull();
		expect(result.current.searchQuery).toBe("");
		expect(mockQuickSearch).not.toHaveBeenCalled();
	});

	it("handleLiveSearch with valid query calls quickSearch and stores results", async () => {
		const searchResult = makeResult();
		mockQuickSearch.mockResolvedValue(searchResult);

		const { result } = setup();

		await act(async () => {
			result.current.handleLiveSearch("bagues");
		});

		expect(mockQuickSearch).toHaveBeenCalledWith("bagues");
		expect(result.current.searchResults).toEqual(searchResult);
		expect(result.current.searchQuery).toBe("bagues");
	});

	it("handleLiveSearch discards stale results", async () => {
		let resolveFirst: (v: QuickSearchResult) => void;
		const firstPromise = new Promise<QuickSearchResult>((r) => {
			resolveFirst = r;
		});

		const secondResult = makeResult({ totalCount: 2 });

		mockQuickSearch.mockImplementationOnce(() => firstPromise).mockResolvedValueOnce(secondResult);

		const { result } = setup();

		// Fire first search
		act(() => {
			result.current.handleLiveSearch("aaa");
		});

		// Fire second search before first resolves
		await act(async () => {
			result.current.handleLiveSearch("bbb");
		});

		// Resolve first search — should be discarded
		await act(async () => {
			resolveFirst!(makeResult({ totalCount: 99 }));
		});

		// Only second result should be stored
		expect(result.current.searchResults).toEqual(secondResult);
	});

	it("handleLiveSearch sets { type: 'error' } when action throws", async () => {
		mockQuickSearch.mockRejectedValue(new Error("Network error"));

		const { result } = setup();

		await act(async () => {
			result.current.handleLiveSearch("test");
		});

		expect(isSearchError(result.current.searchResults)).toBe(true);
	});

	it("handleLiveSearch discards stale errors", async () => {
		let rejectFirst: (e: Error) => void;
		const firstPromise = new Promise<QuickSearchResult>((_, rej) => {
			rejectFirst = rej;
		});

		const secondResult = makeResult();

		mockQuickSearch.mockImplementationOnce(() => firstPromise).mockResolvedValueOnce(secondResult);

		const { result } = setup();

		// Fire first search
		act(() => {
			result.current.handleLiveSearch("aaa");
		});

		// Fire second search before first rejects
		await act(async () => {
			result.current.handleLiveSearch("bbb");
		});

		// Reject first search — error should be discarded
		await act(async () => {
			rejectFirst!(new Error("stale error"));
		});

		expect(isSearchError(result.current.searchResults)).toBe(false);
		expect(result.current.searchResults).toEqual(secondResult);
	});

	it("handleSearchFromSuggestion sets input value via ref and triggers live search", async () => {
		const searchResult = makeResult();
		mockQuickSearch.mockResolvedValue(searchResult);

		const { result } = setup();

		await act(async () => {
			result.current.handleSearchFromSuggestion("collier");
		});

		expect(mockSetValue).toHaveBeenCalledWith("collier");
		expect(result.current.inputValue).toBe("collier");
		expect(mockQuickSearch).toHaveBeenCalledWith("collier");
	});

	it("reset() clears all state and calls resetActiveIndex", () => {
		const { result } = setup();

		// Set some state first
		act(() => {
			result.current.handleInputValueChange("test");
		});

		mockResetActiveIndex.mockClear();

		act(() => {
			result.current.reset();
		});

		expect(result.current.inputValue).toBe("");
		expect(result.current.searchResults).toBeNull();
		expect(result.current.searchQuery).toBe("");
		expect(mockResetActiveIndex).toHaveBeenCalledOnce();
	});
});

// ─── isSearchError ───────────────────────────────────────────────────────────

describe("isSearchError", () => {
	it("returns true for { type: 'error' }", () => {
		expect(isSearchError({ type: "error" })).toBe(true);
	});

	it("returns false for null", () => {
		expect(isSearchError(null)).toBe(false);
	});

	it("returns false for a QuickSearchResult", () => {
		expect(isSearchError(makeResult())).toBe(false);
	});

	it('returns false for string "error"', () => {
		expect(isSearchError("error")).toBe(false);
	});
});
