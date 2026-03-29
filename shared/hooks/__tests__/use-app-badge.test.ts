import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, cleanup } from "@testing-library/react";
import { useAppBadge } from "../use-app-badge";

describe("useAppBadge", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		// @ts-expect-error -- cleanup test stubs
		delete navigator.setAppBadge;
		// @ts-expect-error -- cleanup test stubs
		delete navigator.clearAppBadge;
		cleanup();
	});

	it("calls setAppBadge when count > 0 on a supported browser", () => {
		const setAppBadge = vi.fn().mockResolvedValue(undefined);
		Object.defineProperty(navigator, "setAppBadge", {
			value: setAppBadge,
			configurable: true,
		});
		Object.defineProperty(navigator, "clearAppBadge", {
			value: vi.fn().mockResolvedValue(undefined),
			configurable: true,
		});

		renderHook(() => useAppBadge(3));

		expect(setAppBadge).toHaveBeenCalledWith(3);
	});

	it("calls clearAppBadge when count is 0", () => {
		const clearAppBadge = vi.fn().mockResolvedValue(undefined);
		Object.defineProperty(navigator, "setAppBadge", {
			value: vi.fn().mockResolvedValue(undefined),
			configurable: true,
		});
		Object.defineProperty(navigator, "clearAppBadge", {
			value: clearAppBadge,
			configurable: true,
		});

		renderHook(() => useAppBadge(0));

		expect(clearAppBadge).toHaveBeenCalled();
	});

	it("does nothing when Badging API is not supported", () => {
		// navigator.setAppBadge is not defined (default after cleanup)
		expect(() => {
			renderHook(() => useAppBadge(5));
		}).not.toThrow();
	});

	it("silently catches API rejection", () => {
		const setAppBadge = vi.fn().mockRejectedValue(new Error("NotAllowed"));
		Object.defineProperty(navigator, "setAppBadge", {
			value: setAppBadge,
			configurable: true,
		});

		expect(() => {
			renderHook(() => useAppBadge(1));
		}).not.toThrow();
	});

	it("updates badge when count changes", () => {
		const setAppBadge = vi.fn().mockResolvedValue(undefined);
		const clearAppBadge = vi.fn().mockResolvedValue(undefined);
		Object.defineProperty(navigator, "setAppBadge", {
			value: setAppBadge,
			configurable: true,
		});
		Object.defineProperty(navigator, "clearAppBadge", {
			value: clearAppBadge,
			configurable: true,
		});

		const { rerender } = renderHook(({ count }) => useAppBadge(count), {
			initialProps: { count: 2 },
		});

		expect(setAppBadge).toHaveBeenCalledWith(2);

		rerender({ count: 0 });

		expect(clearAppBadge).toHaveBeenCalled();
	});
});
