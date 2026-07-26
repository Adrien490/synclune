import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/font/google", () => {
	const fontMock = () => ({
		className: "mock-font",
		variable: "--mock-font",
		style: { fontFamily: "mock" },
	});
	return { Figtree: fontMock, Fraunces: fontMock, Sacramento: fontMock };
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

	it("renders the glass-effect layer with backdrop/shadow/bg classes (visibility via opacity)", () => {
		const { container } = render(
			<NavbarWrapper>
				<nav />
			</NavbarWrapper>,
		);
		fireScroll(40);
		// Glass effect lives on an absolute layer inside <header> — only its opacity
		// transitions when data-scrolled flips. Group-hover/data variant applies via :group.
		const layer = container.querySelector("header > div[aria-hidden]");
		expect(layer).not.toBeNull();
		const layerClassName = layer?.className ?? "";
		expect(layerClassName).toContain("backdrop-blur-md");
		// Ombre tokenisée (--shadow-header, globals.css) — remplace shadow-lg shadow-black/8
		expect(layerClassName).toContain("shadow-header");
		expect(layerClassName).toContain("bg-background/95");
		expect(layerClassName).toContain("group-data-[scrolled=true]:opacity-100");
		expect(layerClassName).toContain("opacity-0");
	});

	it("positions the header via transform translateY (composable, replaces top: var)", () => {
		const { container } = render(
			<NavbarWrapper>
				<nav />
			</NavbarWrapper>,
		);
		const header = container.querySelector("header") as HTMLElement | null;
		expect(header?.style.transform).toContain("translateY(var(--announcement-bar-height");
		expect(header?.className).toContain("top-0");
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
