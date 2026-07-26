import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const useInViewMock = vi.fn((..._args: unknown[]) => true);

vi.mock("motion/react", () => ({
	useInView: (...args: unknown[]) => useInViewMock(...args),
}));

const { useParticleVisibility } = await import("../use-particle-visibility");

afterEach(() => {
	vi.clearAllMocks();
});

describe("useParticleVisibility", () => {
	it("returns a containerRef and isInView from useInView", () => {
		const { result } = renderHook(() => useParticleVisibility());
		expect(result.current.containerRef).toBeDefined();
		expect(result.current.isInView).toBe(true);
	});

	it("reflects useInView=false (container out of viewport)", () => {
		useInViewMock.mockReturnValueOnce(false);
		const { result } = renderHook(() => useParticleVisibility());
		expect(result.current.isInView).toBe(false);
	});

	it("does not shrink the viewport with a margin (no pop-out while partially visible)", () => {
		renderHook(() => useParticleVisibility());
		const options = useInViewMock.mock.calls[0]?.[1] as { margin?: string } | undefined;
		expect(options?.margin).toBeUndefined();
	});

	it("does not attach a visibilitychange listener (rAF is already throttled in hidden tabs)", () => {
		const addSpy = vi.spyOn(document, "addEventListener");
		renderHook(() => useParticleVisibility());
		const calls = addSpy.mock.calls.filter(([evt]) => evt === "visibilitychange");
		expect(calls).toHaveLength(0);
		addSpy.mockRestore();
	});
});
