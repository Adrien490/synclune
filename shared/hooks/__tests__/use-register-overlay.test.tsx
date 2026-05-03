import { renderHook } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";

import { useOverlayStackStore } from "@/shared/stores/use-overlay-stack-store";

import { useRegisterOverlay } from "../use-register-overlay";

describe("useRegisterOverlay", () => {
	beforeEach(() => {
		useOverlayStackStore.setState({ count: 0 });
	});

	it("increments overlay count on mount", () => {
		renderHook(() => useRegisterOverlay());
		expect(useOverlayStackStore.getState().count).toBe(1);
	});

	it("decrements overlay count on unmount", () => {
		const { unmount } = renderHook(() => useRegisterOverlay());
		expect(useOverlayStackStore.getState().count).toBe(1);

		unmount();

		expect(useOverlayStackStore.getState().count).toBe(0);
	});

	it("supports stacked overlays (multiple mounts)", () => {
		const a = renderHook(() => useRegisterOverlay());
		const b = renderHook(() => useRegisterOverlay());
		const c = renderHook(() => useRegisterOverlay());

		expect(useOverlayStackStore.getState().count).toBe(3);

		b.unmount();
		expect(useOverlayStackStore.getState().count).toBe(2);

		a.unmount();
		c.unmount();
		expect(useOverlayStackStore.getState().count).toBe(0);
	});
});
