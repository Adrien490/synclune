import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/font/google", () => {
	const fontMock = () => ({
		className: "mock-font",
		variable: "--mock-font",
		style: { fontFamily: "mock" },
	});
	return { Figtree: fontMock, Fraunces: fontMock, Caveat: fontMock };
});

import { NavbarWrapper } from "./navbar-wrapper";

describe("NavbarWrapper (scroll compact)", () => {
	afterEach(() => {
		cleanup();
		window.scrollY = 0;
	});

	function fireScroll(y: number) {
		act(() => {
			window.scrollY = y;
			window.dispatchEvent(new Event("scroll"));
		});
	}

	it("renders <header> with [data-home-navbar] marker for :has() selector", () => {
		const { container } = render(
			<NavbarWrapper>
				<nav>child</nav>
			</NavbarWrapper>,
		);
		const header = container.querySelector("header");
		expect(header).not.toBeNull();
		expect(header).toHaveAttribute("data-home-navbar");
	});

	it("starts with data-scrolled='false' when page is at the top", () => {
		const { container } = render(
			<NavbarWrapper>
				<nav />
			</NavbarWrapper>,
		);
		const header = container.querySelector("header");
		expect(header).toHaveAttribute("data-scrolled", "false");
	});

	it("flips to data-scrolled='true' once scrollY crosses the 20px threshold", () => {
		const { container } = render(
			<NavbarWrapper>
				<nav />
			</NavbarWrapper>,
		);
		const header = container.querySelector("header");
		fireScroll(21);
		expect(header).toHaveAttribute("data-scrolled", "true");
	});

	it("stays data-scrolled='false' at or below the threshold (20px exactly)", () => {
		const { container } = render(
			<NavbarWrapper>
				<nav />
			</NavbarWrapper>,
		);
		const header = container.querySelector("header");
		fireScroll(20);
		expect(header).toHaveAttribute("data-scrolled", "false");
	});

	it("toggles back to data-scrolled='false' when scrolling back to top", () => {
		const { container } = render(
			<NavbarWrapper>
				<nav />
			</NavbarWrapper>,
		);
		const header = container.querySelector("header");
		fireScroll(150);
		expect(header).toHaveAttribute("data-scrolled", "true");
		fireScroll(0);
		expect(header).toHaveAttribute("data-scrolled", "false");
	});

	it("applies glass-effect classes when scrolled (backdrop-blur + shadow)", () => {
		const { container } = render(
			<NavbarWrapper>
				<nav />
			</NavbarWrapper>,
		);
		const header = container.querySelector("header");
		fireScroll(40);
		const className = header?.className ?? "";
		expect(className).toContain("backdrop-blur-md");
		expect(className).toContain("shadow-lg");
		expect(className).toContain("bg-background/95");
	});

	it("applies transparent classes when not scrolled", () => {
		const { container } = render(
			<NavbarWrapper>
				<nav />
			</NavbarWrapper>,
		);
		const header = container.querySelector("header");
		const className = header?.className ?? "";
		expect(className).toContain("bg-transparent");
		expect(className).toContain("border-transparent");
	});

	it("publishes view-transition-name for Next 16 View Transitions API", () => {
		const { container } = render(
			<NavbarWrapper>
				<nav />
			</NavbarWrapper>,
		);
		const header = container.querySelector("header") as HTMLElement | null;
		expect(header?.style.viewTransitionName).toBe("shop-navbar");
	});
});
