import { renderHook } from "@testing-library/react";
import { useRef } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("motion/react", () => ({
	useScroll: vi.fn(() => ({
		scrollYProgress: { get: () => 0.5, set: vi.fn() },
	})),
	useTransform: vi.fn(() => ({ get: () => 0, set: vi.fn() })),
}));

const { useScroll, useTransform } = await import("motion/react");
const { useScrollFade } = await import("../use-scroll-fade");

describe("useScrollFade", () => {
	it("subscribes to scroll progress on the provided ref with start/end offsets", () => {
		vi.mocked(useScroll).mockClear();
		renderHook(() => {
			const ref = useRef<HTMLDivElement>(null);
			return useScrollFade(ref);
		});
		expect(useScroll).toHaveBeenCalledTimes(1);
		const args = vi.mocked(useScroll).mock.calls[0]![0]!;
		expect(args.offset).toEqual(["start end", "end start"]);
		expect(args.target).toBeDefined();
	});

	it("maps progress to opacity using [0, 0.15, 0.85, 1] → [0, 1, 1, 0]", () => {
		vi.mocked(useTransform).mockClear();
		renderHook(() => {
			const ref = useRef<HTMLDivElement>(null);
			return useScrollFade(ref);
		});
		const transformCalls = vi.mocked(useTransform).mock.calls;
		const arrayMappingCall = (transformCalls as unknown[][]).find((args) => Array.isArray(args[1]));
		expect(arrayMappingCall).toBeDefined();
		expect(arrayMappingCall![1]).toEqual([0, 0.15, 0.85, 1]);
		expect(arrayMappingCall![2]).toEqual([0, 1, 1, 0]);
	});

	it("returns both scrollYProgress and scrollOpacity MotionValues", () => {
		const { result } = renderHook(() => {
			const ref = useRef<HTMLDivElement>(null);
			return useScrollFade(ref);
		});
		expect(result.current).toHaveProperty("scrollYProgress");
		expect(result.current).toHaveProperty("scrollOpacity");
	});
});
