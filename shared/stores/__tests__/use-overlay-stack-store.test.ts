import { renderHook } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";

import { useOverlayStackStore, useHasOverlay } from "../use-overlay-stack-store";

describe("useOverlayStackStore", () => {
	beforeEach(() => {
		useOverlayStackStore.setState({ count: 0 });
	});

	describe("initial state", () => {
		it("starts with count = 0", () => {
			expect(useOverlayStackStore.getState().count).toBe(0);
		});
	});

	describe("push", () => {
		it("increments count by 1", () => {
			useOverlayStackStore.getState().push();
			expect(useOverlayStackStore.getState().count).toBe(1);
		});

		it("supports multiple pushes (nested overlays)", () => {
			const { push } = useOverlayStackStore.getState();
			push();
			push();
			push();
			expect(useOverlayStackStore.getState().count).toBe(3);
		});
	});

	describe("pop", () => {
		it("decrements count by 1", () => {
			useOverlayStackStore.setState({ count: 3 });
			useOverlayStackStore.getState().pop();
			expect(useOverlayStackStore.getState().count).toBe(2);
		});

		it("clamps at 0 when count is already 0", () => {
			useOverlayStackStore.getState().pop();
			expect(useOverlayStackStore.getState().count).toBe(0);
		});

		it("clamps at 0 across multiple pops", () => {
			useOverlayStackStore.setState({ count: 1 });
			const { pop } = useOverlayStackStore.getState();
			pop();
			pop();
			pop();
			expect(useOverlayStackStore.getState().count).toBe(0);
		});
	});

	describe("push/pop cycle", () => {
		it("returns to 0 after symmetric push/pop", () => {
			const { push, pop } = useOverlayStackStore.getState();
			push();
			push();
			pop();
			pop();
			expect(useOverlayStackStore.getState().count).toBe(0);
		});
	});
});

describe("useHasOverlay selector", () => {
	beforeEach(() => {
		useOverlayStackStore.setState({ count: 0 });
	});

	it("returns false when count is 0", () => {
		const { result } = renderHook(() => useHasOverlay());
		expect(result.current).toBe(false);
	});

	it("returns true when count > 0", () => {
		useOverlayStackStore.setState({ count: 1 });
		const { result } = renderHook(() => useHasOverlay());
		expect(result.current).toBe(true);
	});

	it("returns true when count is high", () => {
		useOverlayStackStore.setState({ count: 5 });
		const { result } = renderHook(() => useHasOverlay());
		expect(result.current).toBe(true);
	});
});
