import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("motion/react", () => ({
	useInView: vi.fn(() => true),
}));

const { useParticleVisibility } = await import("../use-particle-visibility");

beforeEach(() => {
	Object.defineProperty(document, "visibilityState", {
		value: "visible",
		writable: true,
		configurable: true,
	});
});

afterEach(() => {
	vi.clearAllMocks();
});

describe("useParticleVisibility", () => {
	it("returns a containerRef and initial isInView=true (viewport mocked)", () => {
		const { result } = renderHook(() => useParticleVisibility({ pauseWhenHidden: true }));
		expect(result.current.containerRef).toBeDefined();
		expect(result.current.isInView).toBe(true);
	});

	it("does not attach visibilitychange listener when pauseWhenHidden=false", () => {
		const addSpy = vi.spyOn(document, "addEventListener");
		renderHook(() => useParticleVisibility({ pauseWhenHidden: false }));
		const calls = addSpy.mock.calls.filter(([evt]) => evt === "visibilitychange");
		expect(calls).toHaveLength(0);
		addSpy.mockRestore();
	});

	it("attaches visibilitychange listener when pauseWhenHidden=true", () => {
		const addSpy = vi.spyOn(document, "addEventListener");
		renderHook(() => useParticleVisibility({ pauseWhenHidden: true }));
		const calls = addSpy.mock.calls.filter(([evt]) => evt === "visibilitychange");
		expect(calls.length).toBeGreaterThan(0);
		addSpy.mockRestore();
	});

	it("toggles isInView when document visibility changes (pauseWhenHidden=true)", () => {
		const { result, rerender } = renderHook(() => useParticleVisibility({ pauseWhenHidden: true }));
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
		const { result } = renderHook(() => useParticleVisibility({ pauseWhenHidden: false }));

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
