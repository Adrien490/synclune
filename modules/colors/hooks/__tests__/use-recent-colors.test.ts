import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";

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

import { useRecentColors } from "../use-recent-colors";
import { STORAGE_KEYS } from "@/shared/constants/storage-keys";

describe("useRecentColors", () => {
	beforeEach(() => {
		localStorageMock.clear();
	});

	it("returns empty list on first mount when storage is empty", () => {
		const { result } = renderHook(() => useRecentColors());
		expect(result.current.colors).toEqual([]);
	});

	it("hydrates from localStorage on mount", () => {
		localStorageMock.setItem(STORAGE_KEYS.RECENT_COLORS, JSON.stringify(["#FF0000", "#00FF00"]));
		const { result } = renderHook(() => useRecentColors());
		expect(result.current.colors).toEqual(["#FF0000", "#00FF00"]);
	});

	it("adds a color to the top (LRU)", () => {
		const { result } = renderHook(() => useRecentColors());

		act(() => result.current.add("#112233"));
		expect(result.current.colors[0]).toBe("#112233");

		act(() => result.current.add("#445566"));
		expect(result.current.colors).toEqual(["#445566", "#112233"]);
	});

	it("normalizes hex when adding (#abc → #AABBCC)", () => {
		const { result } = renderHook(() => useRecentColors());
		act(() => result.current.add("#abc"));
		expect(result.current.colors[0]).toBe("#AABBCC");
	});

	it("dedupes case-insensitively and moves existing color to top", () => {
		const { result } = renderHook(() => useRecentColors());
		act(() => result.current.add("#FF0000"));
		act(() => result.current.add("#00FF00"));
		act(() => result.current.add("#ff0000"));
		expect(result.current.colors).toEqual(["#FF0000", "#00FF00"]);
	});

	it("caps list at 8 entries (LRU eviction)", () => {
		const { result } = renderHook(() => useRecentColors());
		const hexes = [
			"#111111",
			"#222222",
			"#333333",
			"#444444",
			"#555555",
			"#666666",
			"#777777",
			"#888888",
			"#999999",
		];
		act(() => {
			for (const hex of hexes) result.current.add(hex);
		});
		expect(result.current.colors).toHaveLength(8);
		expect(result.current.colors[0]).toBe("#999999");
		expect(result.current.colors).not.toContain("#111111");
	});

	it("persists to localStorage on add", () => {
		const { result } = renderHook(() => useRecentColors());
		act(() => result.current.add("#ABCDEF"));
		const stored = JSON.parse(localStorageMock.getItem(STORAGE_KEYS.RECENT_COLORS) ?? "[]");
		expect(stored).toEqual(["#ABCDEF"]);
	});

	it("clears colors and persists empty", () => {
		const { result } = renderHook(() => useRecentColors());
		act(() => result.current.add("#ABCDEF"));
		act(() => result.current.clear());
		expect(result.current.colors).toEqual([]);
		expect(localStorageMock.getItem(STORAGE_KEYS.RECENT_COLORS)).toBe("[]");
	});

	it("ignores invalid hex silently", () => {
		const { result } = renderHook(() => useRecentColors());
		act(() => result.current.add("not-a-hex"));
		expect(result.current.colors).toEqual([]);
	});

	it("survives corrupted localStorage JSON", () => {
		localStorageMock.setItem(STORAGE_KEYS.RECENT_COLORS, "{invalid json");
		const { result } = renderHook(() => useRecentColors());
		expect(result.current.colors).toEqual([]);
	});

	it("survives non-array JSON stored value", () => {
		localStorageMock.setItem(STORAGE_KEYS.RECENT_COLORS, JSON.stringify({ foo: "bar" }));
		const { result } = renderHook(() => useRecentColors());
		expect(result.current.colors).toEqual([]);
	});

	it("survives quota exceeded on write", () => {
		const setItemSpy = vi.spyOn(localStorageMock, "setItem").mockImplementation(() => {
			throw new Error("QuotaExceeded");
		});
		const { result } = renderHook(() => useRecentColors());
		expect(() => {
			act(() => result.current.add("#ABCDEF"));
		}).not.toThrow();
		expect(result.current.colors).toEqual(["#ABCDEF"]);
		setItemSpy.mockRestore();
	});
});
