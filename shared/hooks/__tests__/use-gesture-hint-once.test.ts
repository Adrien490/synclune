import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks for the composed hooks — toggled per test.
// ---------------------------------------------------------------------------

const { state } = vi.hoisted(() => ({
	state: { mounted: true, touch: true, reducedMotion: false },
}));

vi.mock("../use-mounted", () => ({ useMounted: () => state.mounted }));
vi.mock("../use-touch-device", () => ({ useIsTouchDevice: () => state.touch }));
vi.mock("motion/react", () => ({ useReducedMotion: () => state.reducedMotion }));

// ---------------------------------------------------------------------------
// localStorage mock
// ---------------------------------------------------------------------------

function createLocalStorageMock() {
	const store = new Map<string, string>();
	return {
		getItem: vi.fn((k: string) => store.get(k) ?? null),
		setItem: vi.fn((k: string, v: string) => void store.set(k, v)),
		removeItem: vi.fn((k: string) => void store.delete(k)),
		clear: vi.fn(() => store.clear()),
		_store: store,
	};
}

let ls: ReturnType<typeof createLocalStorageMock>;

beforeEach(() => {
	state.mounted = true;
	state.touch = true;
	state.reducedMotion = false;
	ls = createLocalStorageMock();
	vi.stubGlobal("localStorage", ls);
	// jsdom: window.localStorage is read via the global too.
	Object.defineProperty(window, "localStorage", { value: ls, configurable: true });
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.clearAllMocks();
});

import { useGestureHintOnce } from "../use-gesture-hint-once";

describe("useGestureHintOnce", () => {
	it("returns true once and persists the flag on first eligible mount", () => {
		const { result } = renderHook(() => useGestureHintOnce("admin-orders"));

		expect(result.current).toBe(true);
		expect(ls.setItem).toHaveBeenCalledWith("synclune:gesture-hint:admin-orders", "1");
	});

	it("returns false when the flag is already set", () => {
		ls._store.set("synclune:gesture-hint:admin-orders", "1");

		const { result } = renderHook(() => useGestureHintOnce("admin-orders"));

		expect(result.current).toBe(false);
		expect(ls.setItem).not.toHaveBeenCalled();
	});

	it("returns false on non-touch devices", () => {
		state.touch = false;

		const { result } = renderHook(() => useGestureHintOnce("admin-orders"));

		expect(result.current).toBe(false);
		expect(ls.setItem).not.toHaveBeenCalled();
	});

	it("returns false under prefers-reduced-motion", () => {
		state.reducedMotion = true;

		const { result } = renderHook(() => useGestureHintOnce("admin-orders"));

		expect(result.current).toBe(false);
		expect(ls.setItem).not.toHaveBeenCalled();
	});

	it("returns false before mount (SSR/hydration)", () => {
		state.mounted = false;

		const { result } = renderHook(() => useGestureHintOnce("admin-orders"));

		expect(result.current).toBe(false);
		expect(ls.setItem).not.toHaveBeenCalled();
	});

	it("returns false and skips localStorage when disabled", () => {
		const { result } = renderHook(() => useGestureHintOnce("admin-orders", { enabled: false }));

		expect(result.current).toBe(false);
		expect(ls.getItem).not.toHaveBeenCalled();
		expect(ls.setItem).not.toHaveBeenCalled();
	});

	it("namespaces the flag per hintKey", () => {
		renderHook(() => useGestureHintOnce("admin-products"));

		expect(ls.setItem).toHaveBeenCalledWith("synclune:gesture-hint:admin-products", "1");
	});

	it("does not re-fire after the decision is resolved (rerender)", () => {
		const { result, rerender } = renderHook(() => useGestureHintOnce("admin-orders"));

		expect(result.current).toBe(true);
		expect(ls.setItem).toHaveBeenCalledTimes(1);

		rerender();

		// Still true (consumer plays its animation on the false→true edge), no extra write.
		expect(result.current).toBe(true);
		expect(ls.setItem).toHaveBeenCalledTimes(1);
	});
});
