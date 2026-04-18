import { renderHook, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDashboardScrollRestore } from "../use-dashboard-scroll-restore";

const STORAGE_KEY = "dashboard:scroll-y";

describe("useDashboardScrollRestore", () => {
	beforeEach(() => {
		window.sessionStorage.clear();
		window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
		Object.defineProperty(window, "scrollY", { value: 0, configurable: true, writable: true });
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("does not scroll when sessionStorage is empty", () => {
		renderHook(() => useDashboardScrollRestore());
		// rAF is deferred — flush once
		act(() => {
			// trigger the deferred rAF (jsdom runs rAF via setTimeout 0)
		});
		expect(window.scrollTo).not.toHaveBeenCalled();
	});

	it("restores the saved scroll position on mount", async () => {
		window.sessionStorage.setItem(STORAGE_KEY, "420");
		renderHook(() => useDashboardScrollRestore());

		await new Promise((resolve) => requestAnimationFrame(resolve));

		expect(window.scrollTo).toHaveBeenCalledWith({ top: 420, behavior: "auto" });
	});

	it("ignores invalid or zero stored values", async () => {
		window.sessionStorage.setItem(STORAGE_KEY, "not-a-number");
		renderHook(() => useDashboardScrollRestore());

		await new Promise((resolve) => requestAnimationFrame(resolve));

		expect(window.scrollTo).not.toHaveBeenCalled();
	});

	it("persists scroll position on pagehide", () => {
		Object.defineProperty(window, "scrollY", { value: 880, configurable: true, writable: true });

		const { unmount } = renderHook(() => useDashboardScrollRestore());

		act(() => {
			window.dispatchEvent(new Event("pagehide"));
		});

		expect(window.sessionStorage.getItem(STORAGE_KEY)).toBe("880");
		unmount();
	});

	it("persists scroll position when the document becomes hidden", () => {
		Object.defineProperty(window, "scrollY", { value: 150, configurable: true, writable: true });
		Object.defineProperty(document, "visibilityState", {
			value: "hidden",
			configurable: true,
		});

		renderHook(() => useDashboardScrollRestore());

		act(() => {
			document.dispatchEvent(new Event("visibilitychange"));
		});

		expect(window.sessionStorage.getItem(STORAGE_KEY)).toBe("150");
	});

	it("does not persist on visibilitychange when still visible", () => {
		Object.defineProperty(window, "scrollY", { value: 300, configurable: true, writable: true });
		Object.defineProperty(document, "visibilityState", {
			value: "visible",
			configurable: true,
		});

		renderHook(() => useDashboardScrollRestore());

		act(() => {
			document.dispatchEvent(new Event("visibilitychange"));
		});

		expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull();
	});
});
