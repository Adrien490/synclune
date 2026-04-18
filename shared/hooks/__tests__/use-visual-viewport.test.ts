import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// visualViewport mock
// ---------------------------------------------------------------------------

function createVisualViewportMock(height: number, offsetTop = 0) {
	const listeners = new Map<string, Set<() => void>>();
	const vv = {
		height,
		offsetTop,
		addEventListener: vi.fn((event: string, cb: () => void) => {
			if (!listeners.has(event)) listeners.set(event, new Set());
			listeners.get(event)!.add(cb);
		}),
		removeEventListener: vi.fn((event: string, cb: () => void) => {
			listeners.get(event)?.delete(cb);
		}),
		_fire: (event: string) => {
			for (const cb of listeners.get(event) ?? []) cb();
		},
		_set: (next: { height?: number; offsetTop?: number }) => {
			if (typeof next.height === "number") vv.height = next.height;
			if (typeof next.offsetTop === "number") vv.offsetTop = next.offsetTop;
		},
	};
	return vv;
}

let vv: ReturnType<typeof createVisualViewportMock>;

beforeEach(() => {
	vi.resetModules();
	vv = createVisualViewportMock(800, 0);
	Object.defineProperty(window, "visualViewport", {
		configurable: true,
		value: vv,
	});
	Object.defineProperty(window, "innerHeight", {
		configurable: true,
		value: 800,
	});
	document.documentElement.removeAttribute("data-keyboard");
	document.documentElement.style.removeProperty("--vvh");
	document.documentElement.style.removeProperty("--vvh-offset");
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("useVisualViewport", () => {
	it("returns default state when visualViewport is unavailable (SSR-like)", async () => {
		Object.defineProperty(window, "visualViewport", { configurable: true, value: undefined });
		const { useVisualViewport } = await import("../use-visual-viewport");
		const { result } = renderHook(() => useVisualViewport());
		expect(result.current).toEqual({ height: 0, offsetTop: 0, keyboardOpen: false });
	});

	it("exposes current visualViewport height and applies --vvh CSS variable", async () => {
		const { useVisualViewport } = await import("../use-visual-viewport");
		const { result } = renderHook(() => useVisualViewport());
		expect(result.current.height).toBe(800);
		expect(result.current.keyboardOpen).toBe(false);
		expect(document.documentElement.style.getPropertyValue("--vvh")).toBe("800px");
	});

	it("detects keyboard open when viewport shrinks by more than 100px", async () => {
		const { useVisualViewport } = await import("../use-visual-viewport");
		const { result } = renderHook(() => useVisualViewport());
		expect(result.current.keyboardOpen).toBe(false);

		act(() => {
			vv._set({ height: 500 });
			vv._fire("resize");
		});

		expect(result.current.keyboardOpen).toBe(true);
		expect(document.documentElement.getAttribute("data-keyboard")).toBe("open");
	});

	it("clears data-keyboard when the viewport returns to full height", async () => {
		const { useVisualViewport } = await import("../use-visual-viewport");
		const { result } = renderHook(() => useVisualViewport());

		act(() => {
			vv._set({ height: 500 });
			vv._fire("resize");
		});
		expect(document.documentElement.getAttribute("data-keyboard")).toBe("open");

		act(() => {
			vv._set({ height: 800 });
			vv._fire("resize");
		});

		expect(result.current.keyboardOpen).toBe(false);
		expect(document.documentElement.hasAttribute("data-keyboard")).toBe(false);
	});

	it("ignores minor height variations (<100px, e.g. URL bar collapse)", async () => {
		const { useVisualViewport } = await import("../use-visual-viewport");
		const { result } = renderHook(() => useVisualViewport());

		act(() => {
			vv._set({ height: 750 });
			vv._fire("resize");
		});

		expect(result.current.keyboardOpen).toBe(false);
		expect(document.documentElement.hasAttribute("data-keyboard")).toBe(false);
	});
});
