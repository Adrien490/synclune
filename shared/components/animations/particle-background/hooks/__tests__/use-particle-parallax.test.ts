import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock ResizeObserver (not available in jsdom)
class MockResizeObserver {
	observe() {}
	unobserve() {}
	disconnect() {}
}
vi.stubGlobal("ResizeObserver", MockResizeObserver);

vi.mock("motion/react", () => ({
	useInView: vi.fn(() => true),
	useMotionValue: vi.fn((initial: number) => {
		const mv = {
			value: initial,
			get() {
				return mv.value;
			},
			set: vi.fn((v: number) => {
				mv.value = v;
			}),
		};
		return mv;
	}),
}));

vi.mock("@/shared/hooks/use-touch-device", () => ({
	useIsTouchDevice: vi.fn(() => false),
}));

const { useIsTouchDevice } = await import("@/shared/hooks/use-touch-device");
const { useParticleParallax } = await import("../use-particle-parallax");

beforeEach(() => {
	vi.mocked(useIsTouchDevice).mockReturnValue(false);
	Object.defineProperty(document, "visibilityState", {
		value: "visible",
		writable: true,
		configurable: true,
	});
});

afterEach(() => {
	vi.clearAllMocks();
});

describe("useParticleParallax", () => {
	it("returns mouseX/mouseY on desktop and undefined on touch", () => {
		const desktop = renderHook(() =>
			useParticleParallax({ pauseWhenHidden: true, interactive: false }),
		);
		expect(desktop.result.current.mouseX).toBeDefined();
		expect(desktop.result.current.mouseY).toBeDefined();

		vi.mocked(useIsTouchDevice).mockReturnValue(true);
		const touch = renderHook(() =>
			useParticleParallax({ pauseWhenHidden: true, interactive: false }),
		);
		expect(touch.result.current.mouseX).toBeUndefined();
		expect(touch.result.current.mouseY).toBeUndefined();
	});

	it("omits cursorX/cursorY when interactive is false", () => {
		const { result } = renderHook(() =>
			useParticleParallax({ pauseWhenHidden: true, interactive: false }),
		);
		expect(result.current.cursorX).toBeUndefined();
		expect(result.current.cursorY).toBeUndefined();
	});

	it("exposes cursorX/cursorY when interactive is true on desktop", () => {
		const { result } = renderHook(() =>
			useParticleParallax({ pauseWhenHidden: true, interactive: true }),
		);
		expect(result.current.cursorX).toBeDefined();
		expect(result.current.cursorY).toBeDefined();
	});

	it("returns a containerRef and initial isInView=true (viewport mocked)", () => {
		const { result } = renderHook(() =>
			useParticleParallax({ pauseWhenHidden: true, interactive: false }),
		);
		expect(result.current.containerRef).toBeDefined();
		expect(result.current.isInView).toBe(true);
	});

	it("does not attach visibilitychange listener when pauseWhenHidden=false", () => {
		const addSpy = vi.spyOn(document, "addEventListener");
		renderHook(() => useParticleParallax({ pauseWhenHidden: false, interactive: false }));
		const calls = addSpy.mock.calls.filter(([evt]) => evt === "visibilitychange");
		expect(calls).toHaveLength(0);
		addSpy.mockRestore();
	});

	it("attaches visibilitychange listener when pauseWhenHidden=true", () => {
		const addSpy = vi.spyOn(document, "addEventListener");
		renderHook(() => useParticleParallax({ pauseWhenHidden: true, interactive: false }));
		const calls = addSpy.mock.calls.filter(([evt]) => evt === "visibilitychange");
		expect(calls.length).toBeGreaterThan(0);
		addSpy.mockRestore();
	});

	it("toggles isInView when document visibility changes (pauseWhenHidden=true)", () => {
		const { result, rerender } = renderHook(() =>
			useParticleParallax({ pauseWhenHidden: true, interactive: false }),
		);
		expect(result.current.isInView).toBe(true);

		act(() => {
			Object.defineProperty(document, "visibilityState", {
				value: "hidden",
				writable: true,
				configurable: true,
			});
			document.dispatchEvent(new Event("visibilitychange"));
		});
		rerender();
		expect(result.current.isInView).toBe(false);
	});

	it("keeps isInView=true on tab hidden when pauseWhenHidden=false", () => {
		const { result } = renderHook(() =>
			useParticleParallax({ pauseWhenHidden: false, interactive: false }),
		);

		act(() => {
			Object.defineProperty(document, "visibilityState", {
				value: "hidden",
				writable: true,
				configurable: true,
			});
			document.dispatchEvent(new Event("visibilitychange"));
		});
		expect(result.current.isInView).toBe(true);
	});
});
