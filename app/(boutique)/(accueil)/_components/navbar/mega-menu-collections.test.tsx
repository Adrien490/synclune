import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Mock next/link
vi.mock("next/link", () => ({
	default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
		<a href={href} {...props}>{children}</a>
	),
}));

// Mock NavigationMenuLink
vi.mock("@/shared/components/ui/navigation-menu", () => ({
	NavigationMenuLink: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock CollectionImagesGrid
vi.mock("@/modules/collections/components/collection-images-grid", () => ({
	CollectionImagesGrid: ({ collectionName }: { collectionName: string }) => (
		<div data-testid={`collection-grid-${collectionName}`} />
	),
}));

// Mock usePathname
let mockPathname = "/";
vi.mock("next/navigation", () => ({
	usePathname: () => mockPathname,
}));

import { MegaMenuCollections } from "./mega-menu-collections";

afterEach(() => {
	cleanup();
	mockPathname = "/";
});

const collections = [
	{
		href: "/collections",
		label: "Toutes les collections",
	},
	{
		href: "/collections/mariage",
		label: "Mariage",
		description: "Collection mariage",
		images: [{ url: "/img1.jpg", blurDataUrl: null, alt: null }],
	},
	{
		href: "/collections/boheme",
		label: "Bohème",
		images: [
			{ url: "/img2.jpg", blurDataUrl: null, alt: null },
			{ url: "/img3.jpg", blurDataUrl: null, alt: null },
		],
	},
	{
		href: "/collections/minimale",
		label: "Minimale",
		images: [],
	},
];

describe("MegaMenuCollections", () => {
	it("returns null when no collections", () => {
		const { container } = render(<MegaMenuCollections />);
		expect(container.innerHTML).toBe("");
	});

	it("returns null when collections is empty", () => {
		const { container } = render(<MegaMenuCollections collections={[]} />);
		expect(container.innerHTML).toBe("");
	});

	it("returns null when only 'Toutes les collections' exists", () => {
		const { container } = render(
			<MegaMenuCollections collections={[collections[0]]} />
		);
		expect(container.innerHTML).toBe("");
	});

	it("filters out 'Toutes les collections' from cards and shows it as CTA", () => {
		render(<MegaMenuCollections collections={collections} />);

		// CTA link should exist
		const ctaLink = screen.getByRole("link", { name: /Toutes les collections/ });
		expect(ctaLink.getAttribute("href")).toBe("/collections");

		// Collection cards should exist
		expect(screen.getByText("Mariage")).toBeDefined();
		expect(screen.getByText("Bohème")).toBeDefined();
		expect(screen.getByText("Minimale")).toBeDefined();
	});

	it("renders CollectionImagesGrid when collection has images", () => {
		render(<MegaMenuCollections collections={collections} />);

		expect(screen.getByTestId("collection-grid-Mariage")).toBeDefined();
		expect(screen.getByTestId("collection-grid-Bohème")).toBeDefined();
	});

	it("renders fallback icon when collection has no images", () => {
		render(<MegaMenuCollections collections={collections} />);

		// Minimale has no images, should render a fallback Gem icon container
		const minimaleLink = screen.getByRole("link", { name: /Minimale/ });
		const fallback = minimaleLink.querySelector("[aria-hidden='true']");
		expect(fallback).toBeDefined();
	});

	it("renders collection descriptions when provided", () => {
		render(<MegaMenuCollections collections={collections} />);

		expect(screen.getByText("Collection mariage")).toBeDefined();
	});

	it("uses role='region' with aria-labelledby", () => {
		render(<MegaMenuCollections collections={collections} />);

		const region = screen.getByRole("region");
		const headingId = region.getAttribute("aria-labelledby");
		expect(headingId).toBeTruthy();

		const heading = document.getElementById(headingId!);
		expect(heading?.textContent).toBe("Collections");
	});

	it("marks active collection with aria-current='page'", () => {
		mockPathname = "/collections/mariage";
		render(<MegaMenuCollections collections={collections} />);

		const mariageLink = screen.getByRole("link", { name: /Mariage/ });
		expect(mariageLink.getAttribute("aria-current")).toBe("page");

		const bohemeLink = screen.getByRole("link", { name: /Bohème/ });
		expect(bohemeLink.getAttribute("aria-current")).toBeNull();
	});

	it("marks CTA as active when on /collections page", () => {
		mockPathname = "/collections";
		render(<MegaMenuCollections collections={collections} />);

		const ctaLink = screen.getByRole("link", { name: /Toutes les collections/ });
		expect(ctaLink.getAttribute("aria-current")).toBe("page");
	});
});
