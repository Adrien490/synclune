import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// LOCAL STORAGE MOCK (jsdom default lacks .clear() in this env)
// ============================================================================

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

const KEY = "test:recent-colors";

describe("useRecentColors", () => {
	beforeEach(() => {
		localStorageMock.clear();
	});

	afterEach(() => {
		cleanup();
		localStorageMock.clear();
	});

	it("returns empty array when storage is empty", () => {
		const { result } = renderHook(() => useRecentColors(KEY));
		expect(result.current.recents).toEqual([]);
	});

	it("hydrates existing entries from localStorage", () => {
		localStorageMock.setItem(KEY, JSON.stringify(["#ff0000", "#00ff00"]));
		const { result } = renderHook(() => useRecentColors(KEY));
		expect(result.current.recents).toEqual(["#FF0000", "#00FF00"]);
	});

	it("normalizes hex values to uppercase", () => {
		const { result } = renderHook(() => useRecentColors(KEY));
		act(() => result.current.push("#abcdef"));
		expect(result.current.recents).toEqual(["#ABCDEF"]);
	});

	it("inserts the most recent entry at the head (LIFO)", () => {
		const { result } = renderHook(() => useRecentColors(KEY));
		act(() => result.current.push("#FF0000"));
		act(() => result.current.push("#00FF00"));
		act(() => result.current.push("#0000FF"));
		expect(result.current.recents).toEqual(["#0000FF", "#00FF00", "#FF0000"]);
	});

	it("dedupes case-insensitively (existing color moves to head)", () => {
		const { result } = renderHook(() => useRecentColors(KEY));
		act(() => result.current.push("#FF0000"));
		act(() => result.current.push("#00FF00"));
		act(() => result.current.push("#ff0000"));
		expect(result.current.recents).toEqual(["#FF0000", "#00FF00"]);
	});

	it("caps the list at 5 entries", () => {
		const { result } = renderHook(() => useRecentColors(KEY));
		act(() => result.current.push("#111111"));
		act(() => result.current.push("#222222"));
		act(() => result.current.push("#333333"));
		act(() => result.current.push("#444444"));
		act(() => result.current.push("#555555"));
		act(() => result.current.push("#666666"));
		expect(result.current.recents).toEqual(["#666666", "#555555", "#444444", "#333333", "#222222"]);
	});

	it("persists pushed colors to localStorage", () => {
		const { result } = renderHook(() => useRecentColors(KEY));
		act(() => result.current.push("#ABCDEF"));
		const stored = JSON.parse(localStorageMock.getItem(KEY) ?? "[]") as unknown;
		expect(stored).toEqual(["#ABCDEF"]);
	});

	it("ignores invalid hex codes silently", () => {
		const { result } = renderHook(() => useRecentColors(KEY));
		act(() => result.current.push("not-a-color"));
		act(() => result.current.push("#xyz"));
		act(() => result.current.push("#FFF")); // 3-char form rejected; only #RRGGBB accepted
		expect(result.current.recents).toEqual([]);
	});

	it("ignores corrupted localStorage payloads", () => {
		localStorageMock.setItem(KEY, "not json");
		const { result } = renderHook(() => useRecentColors(KEY));
		expect(result.current.recents).toEqual([]);
	});

	it("filters out non-string entries during hydrate", () => {
		localStorageMock.setItem(KEY, JSON.stringify([123, "#FF0000", null, "#abc", "#00FF00"]));
		const { result } = renderHook(() => useRecentColors(KEY));
		expect(result.current.recents).toEqual(["#FF0000", "#00FF00"]);
	});

	it("returns empty array and no-op push when key is undefined", () => {
		const { result } = renderHook(() => useRecentColors(undefined));
		act(() => result.current.push("#FF0000"));
		expect(result.current.recents).toEqual([]);
		expect(localStorageMock.length).toBe(0);
	});

	it("syncs across tabs via the storage event", () => {
		const { result } = renderHook(() => useRecentColors(KEY));
		expect(result.current.recents).toEqual([]);

		act(() => {
			localStorageMock.setItem(KEY, JSON.stringify(["#AAAAAA"]));
			window.dispatchEvent(
				new StorageEvent("storage", {
					key: KEY,
					newValue: JSON.stringify(["#AAAAAA"]),
				}),
			);
		});

		expect(result.current.recents).toEqual(["#AAAAAA"]);
	});

	it("ignores storage events for other keys", () => {
		const { result } = renderHook(() => useRecentColors(KEY));
		act(() => {
			localStorageMock.setItem("other-key", '["#FF0000"]');
			window.dispatchEvent(
				new StorageEvent("storage", {
					key: "other-key",
					newValue: '["#FF0000"]',
				}),
			);
		});
		expect(result.current.recents).toEqual([]);
	});
});
