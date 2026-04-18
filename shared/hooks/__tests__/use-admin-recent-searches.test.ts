import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act, cleanup, waitFor } from "@testing-library/react";

const localStorageMock = (() => {
	let store: Record<string, string> = {};
	return {
		getItem: (key: string) => store[key] ?? null,
		setItem: (key: string, value: string) => {
			store[key] = value;
		},
		removeItem: (key: string) => {
			delete store[key];
		},
		clear: () => {
			store = {};
		},
		get length() {
			return Object.keys(store).length;
		},
		key: (index: number) => Object.keys(store)[index] ?? null,
	};
})();

vi.stubGlobal("localStorage", localStorageMock);

import { useAdminRecentSearches } from "../use-admin-recent-searches";

const STORAGE_KEY = "synclune:admin-recent-searches:products";

describe("useAdminRecentSearches", () => {
	beforeEach(() => {
		localStorageMock.clear();
	});

	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
	});

	it("starts empty when no storage entry exists", () => {
		const { result } = renderHook(() => useAdminRecentSearches("products"));
		expect(result.current.searches).toEqual([]);
	});

	it("hydrates from localStorage after mount", async () => {
		localStorageMock.setItem(STORAGE_KEY, JSON.stringify(["bague", "collier"]));
		const { result } = renderHook(() => useAdminRecentSearches("products"));

		await waitFor(() => {
			expect(result.current.searches).toEqual(["bague", "collier"]);
		});
	});

	it("adds a term and persists it (trim + lowercase)", async () => {
		const { result } = renderHook(() => useAdminRecentSearches("products"));

		act(() => result.current.add("  Bague  "));

		await waitFor(() => {
			expect(result.current.searches).toEqual(["bague"]);
		});
		expect(JSON.parse(localStorageMock.getItem(STORAGE_KEY)!)).toEqual(["bague"]);
	});

	it("dedupes existing terms (case-insensitive) and moves them to the top", async () => {
		const { result } = renderHook(() => useAdminRecentSearches("products"));

		act(() => result.current.add("bague"));
		act(() => result.current.add("collier"));
		act(() => result.current.add("BAGUE"));

		await waitFor(() => {
			expect(result.current.searches).toEqual(["bague", "collier"]);
		});
	});

	it("caps storage at 5 entries (evicts oldest)", async () => {
		const { result } = renderHook(() => useAdminRecentSearches("products"));

		act(() => {
			["a", "b", "c", "d", "e", "f"].forEach((t) => result.current.add(t));
		});

		await waitFor(() => {
			expect(result.current.searches).toHaveLength(5);
		});
		expect(result.current.searches[0]).toBe("f");
		expect(result.current.searches).not.toContain("a");
	});

	it("remove filters out a term", async () => {
		const { result } = renderHook(() => useAdminRecentSearches("products"));

		act(() => result.current.add("bague"));
		act(() => result.current.add("collier"));
		act(() => result.current.remove("bague"));

		await waitFor(() => {
			expect(result.current.searches).toEqual(["collier"]);
		});
	});

	it("clear empties the list and storage", async () => {
		const { result } = renderHook(() => useAdminRecentSearches("products"));

		act(() => result.current.add("bague"));
		act(() => result.current.clear());

		await waitFor(() => {
			expect(result.current.searches).toEqual([]);
		});
		expect(JSON.parse(localStorageMock.getItem(STORAGE_KEY)!)).toEqual([]);
	});

	it("restore rehydrates a snapshot (undo toast)", async () => {
		const { result } = renderHook(() => useAdminRecentSearches("products"));

		act(() => result.current.restore(["bague", "collier"]));

		await waitFor(() => {
			expect(result.current.searches).toEqual(["bague", "collier"]);
		});
	});

	it("ignores corrupt storage JSON gracefully", () => {
		localStorageMock.setItem(STORAGE_KEY, "{not-json");
		const { result } = renderHook(() => useAdminRecentSearches("products"));
		expect(result.current.searches).toEqual([]);
	});

	it("ignores storage arrays containing invalid entries", () => {
		localStorageMock.setItem(STORAGE_KEY, JSON.stringify([42, null, ""]));
		const { result } = renderHook(() => useAdminRecentSearches("products"));
		expect(result.current.searches).toEqual([]);
	});

	it("isolates scopes (products vs orders)", async () => {
		const { result: products } = renderHook(() => useAdminRecentSearches("products"));
		const { result: orders } = renderHook(() => useAdminRecentSearches("orders"));

		act(() => products.current.add("bague"));

		await waitFor(() => {
			expect(products.current.searches).toEqual(["bague"]);
		});
		expect(orders.current.searches).toEqual([]);
	});

	it("no-ops silently on QuotaExceededError", async () => {
		const setItemSpy = vi.spyOn(localStorageMock, "setItem").mockImplementation(() => {
			throw new DOMException("Quota", "QuotaExceededError");
		});
		const { result } = renderHook(() => useAdminRecentSearches("products"));

		expect(() => act(() => result.current.add("bague"))).not.toThrow();

		// In-memory state still updates
		await waitFor(() => {
			expect(result.current.searches).toEqual(["bague"]);
		});
		expect(setItemSpy).toHaveBeenCalled();
	});

	it("rejects invalid terms passed to add()", async () => {
		const { result } = renderHook(() => useAdminRecentSearches("products"));

		act(() => result.current.add(""));
		act(() => result.current.add("   "));

		await waitFor(() => {
			expect(result.current.searches).toEqual([]);
		});
	});
});
