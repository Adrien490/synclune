import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useScrollHideBottomBar } from "../use-scroll-hide-bottom-bar";

function flushRaf() {
	act(() => {
		vi.advanceTimersByTime(16);
	});
}

function scrollWindowTo(y: number) {
	Object.defineProperty(window, "scrollY", { configurable: true, value: y });
	window.dispatchEvent(new Event("scroll"));
}

beforeEach(() => {
	vi.useFakeTimers();

	let rafId = 0;
	vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
		rafId += 1;
		setTimeout(() => cb(performance.now()), 16);
		return rafId;
	});
	vi.stubGlobal("cancelAnimationFrame", (id: number) => clearTimeout(id));

	Object.defineProperty(window, "scrollY", { configurable: true, value: 0, writable: true });
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe("useScrollHideBottomBar", () => {
	it("returns false by default", () => {
		const { result } = renderHook(() => useScrollHideBottomBar());
		expect(result.current).toBe(false);
	});

	it("stays visible while within hideAtTopOffset", () => {
		const { result } = renderHook(() => useScrollHideBottomBar({ hideAtTopOffset: 100 }));

		act(() => scrollWindowTo(50));
		flushRaf();

		expect(result.current).toBe(false);
	});

	it("hides when scrolling down fast past the top offset", () => {
		const { result } = renderHook(() =>
			useScrollHideBottomBar({
				hideAtTopOffset: 50,
				threshold: 8,
				velocityThreshold: 0.3,
			}),
		);

		act(() => scrollWindowTo(80));
		flushRaf();

		expect(result.current).toBe(true);
	});

	it("does not hide below the velocity threshold (slow scroll)", () => {
		const { result } = renderHook(() =>
			useScrollHideBottomBar({
				hideAtTopOffset: 50,
				threshold: 8,
				velocityThreshold: 10,
			}),
		);

		act(() => scrollWindowTo(80));
		flushRaf();

		expect(result.current).toBe(false);
	});

	it("shows again on up-scroll", () => {
		const { result } = renderHook(() =>
			useScrollHideBottomBar({
				hideAtTopOffset: 50,
				threshold: 8,
				velocityThreshold: 0.3,
			}),
		);

		act(() => scrollWindowTo(300));
		flushRaf();
		expect(result.current).toBe(true);

		act(() => scrollWindowTo(200));
		flushRaf();
		expect(result.current).toBe(false);
	});

	it("ignores scroll delta below threshold", () => {
		const { result } = renderHook(() =>
			useScrollHideBottomBar({
				hideAtTopOffset: 10,
				threshold: 100,
				velocityThreshold: 0.1,
			}),
		);

		// dy = 40, threshold = 100 → delta below threshold, state unchanged
		act(() => scrollWindowTo(40));
		flushRaf();

		expect(result.current).toBe(false);
	});

	it("forces visible when scrolling back to the top", () => {
		const { result } = renderHook(() =>
			useScrollHideBottomBar({
				hideAtTopOffset: 64,
				threshold: 8,
				velocityThreshold: 0.3,
			}),
		);

		act(() => scrollWindowTo(500));
		flushRaf();
		expect(result.current).toBe(true);

		act(() => scrollWindowTo(20));
		flushRaf();
		expect(result.current).toBe(false);
	});

	it("removes scroll listener on unmount", () => {
		const removeSpy = vi.spyOn(window, "removeEventListener");
		const { unmount } = renderHook(() => useScrollHideBottomBar());

		unmount();

		expect(removeSpy).toHaveBeenCalledWith("scroll", expect.any(Function));
	});

	it("skips scroll tracking when prefers-reduced-motion is set (WCAG 2.3.3)", () => {
		vi.stubGlobal(
			"matchMedia",
			vi.fn(
				(query: string) =>
					({
						matches: query === "(prefers-reduced-motion: reduce)",
						media: query,
						addEventListener: vi.fn(),
						removeEventListener: vi.fn(),
						addListener: vi.fn(),
						removeListener: vi.fn(),
						dispatchEvent: vi.fn(),
						onchange: null,
					}) as unknown as MediaQueryList,
			),
		);

		const addSpy = vi.spyOn(window, "addEventListener");
		const { result } = renderHook(() => useScrollHideBottomBar());

		expect(result.current).toBe(false);
		expect(addSpy).not.toHaveBeenCalledWith("scroll", expect.any(Function), expect.anything());
	});
});
