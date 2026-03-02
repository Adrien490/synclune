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
});
