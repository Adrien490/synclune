import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { pushRecentColor, useRecentColors } from "../use-recent-colors";

const STORAGE_KEY = "synclune:recent-colors";

// jsdom-like in-memory localStorage shim (the default test env localStorage may
// be a broken Node experimental shim — see use-recent-colors safeLocalStorage).
function installLocalStorage() {
	const store = new Map<string, string>();
	const ls: Storage = {
		get length() {
			return store.size;
		},
		clear: () => store.clear(),
		getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
		key: (i: number) => Array.from(store.keys())[i] ?? null,
		removeItem: (k: string) => store.delete(k),
		setItem: (k: string, v: string) => {
			store.set(k, String(v));
		},
	};
	Object.defineProperty(window, "localStorage", { value: ls, configurable: true });
	return store;
}

describe("use-recent-colors", () => {
	beforeEach(() => {
		installLocalStorage();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("pushRecentColor normalizes and stores a valid hex", () => {
		pushRecentColor("#d4af37");
		const raw = window.localStorage.getItem(STORAGE_KEY);
		expect(JSON.parse(raw!)).toEqual(["#D4AF37"]);
	});

	it("ignores invalid hex values", () => {
		pushRecentColor("not-a-hex");
		expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
	});

	it("deduplicates and moves the most recent to the front", () => {
		pushRecentColor("#111111");
		pushRecentColor("#222222");
		pushRecentColor("#111111");
		expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY)!)).toEqual(["#111111", "#222222"]);
	});

	it("caps the list at 6 entries", () => {
		["#111111", "#222222", "#333333", "#444444", "#555555", "#666666", "#777777"].forEach(
			pushRecentColor,
		);
		const list = JSON.parse(window.localStorage.getItem(STORAGE_KEY)!) as string[];
		expect(list).toHaveLength(6);
		expect(list[0]).toBe("#777777");
		expect(list).not.toContain("#111111");
	});

	it("does not throw when localStorage is unavailable (returns empty)", () => {
		Object.defineProperty(window, "localStorage", {
			value: undefined,
			configurable: true,
		});
		expect(() => pushRecentColor("#FFFFFF")).not.toThrow();
	});
});

// Sanity: the hook exports are wired (smoke import; rendering is covered via
// ColorFormFields tests which mount the component using this hook).
describe("use-recent-colors exports", () => {
	it("exposes useRecentColors and pushRecentColor", () => {
		expect(typeof useRecentColors).toBe("function");
		expect(typeof pushRecentColor).toBe("function");
	});
});
