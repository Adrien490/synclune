import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
	usePathname: vi.fn(() => "/produits"),
}));

import { ScrollRestoration } from "../scroll-restoration";

describe("ScrollRestoration", () => {
	let addEventListenerSpy: ReturnType<typeof vi.spyOn>;
	let removeEventListenerSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		addEventListenerSpy = vi.spyOn(window, "addEventListener");
		removeEventListenerSpy = vi.spyOn(window, "removeEventListener");
		sessionStorage.clear();
	});

	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
	});

	it("renders null (no visual output)", () => {
		const { container } = render(<ScrollRestoration />);
		expect(container.innerHTML).toBe("");
	});

	it("registers beforeunload listener on mount", () => {
		render(<ScrollRestoration />);
		expect(addEventListenerSpy).toHaveBeenCalledWith("beforeunload", expect.any(Function));
	});

	it("removes beforeunload listener on unmount", () => {
		const { unmount } = render(<ScrollRestoration />);
		unmount();
		expect(removeEventListenerSpy).toHaveBeenCalledWith("beforeunload", expect.any(Function));
	});

	it("saves scroll position to sessionStorage on unmount", () => {
		Object.defineProperty(window, "scrollY", { value: 500, writable: true });
		const { unmount } = render(<ScrollRestoration />);
		unmount();
		expect(sessionStorage.getItem("synclune-scroll-/produits")).toBe("500");
	});
});
