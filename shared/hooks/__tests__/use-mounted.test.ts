import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { useMounted } from "../use-mounted";

describe("useMounted", () => {
	afterEach(() => {
		cleanup();
	});

	it("returns true on the client after mount", () => {
		const { result } = renderHook(() => useMounted());
		expect(result.current).toBe(true);
	});

	it("returns a boolean", () => {
		const { result } = renderHook(() => useMounted());
		expect(typeof result.current).toBe("boolean");
	});

	it("remains true across re-renders", () => {
		const { result, rerender } = renderHook(() => useMounted());
		expect(result.current).toBe(true);

		rerender();
		expect(result.current).toBe(true);
	});

	it("returns the same value (true) on consecutive re-renders without unmount", () => {
		const { result, rerender } = renderHook(() => useMounted());
		for (let i = 0; i < 5; i++) {
			rerender();
			expect(result.current).toBe(true);
		}
	});

	it("returns true again after unmount and remount", () => {
		const { result, unmount } = renderHook(() => useMounted());
		expect(result.current).toBe(true);

		unmount();

		const { result: result2 } = renderHook(() => useMounted());
		expect(result2.current).toBe(true);
	});

	it("can be used by multiple components simultaneously", () => {
		const { result: r1 } = renderHook(() => useMounted());
		const { result: r2 } = renderHook(() => useMounted());

		expect(r1.current).toBe(true);
		expect(r2.current).toBe(true);
	});
});
