import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Mock next/link
vi.mock("next/link", () => ({
	default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
		<a href={href} {...props}>{children}</a>
	),
}));

// Mock next/image
vi.mock("next/image", () => ({
	default: ({ src, alt, ...props }: { src: string; alt: string; [key: string]: unknown }) => (
		// eslint-disable-next-line @next/next/no-img-element
		<img src={src} alt={alt} {...props} />
	),
}));

// Mock NavigationMenuLink
vi.mock("@/shared/components/ui/navigation-menu", () => ({
	NavigationMenuLink: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock MegaMenuColumn
vi.mock("./mega-menu-column", () => ({
	MegaMenuColumn: ({ title, items }: { title: string; items: Array<{ href: string; label: string }> }) => (
		<div data-testid="mega-menu-column">
			<h3>{title}</h3>
			<ul>
				{items.map((item) => (
					<li key={item.href}>
						<a href={item.href}>{item.label}</a>
					</li>
				))}
			</ul>
		</div>
	),
}));

// Mock formatPrice
vi.mock("@/modules/products/utils/format-price", () => ({
	formatPrice: (price: number) => `${price} €`,
}));

import { MegaMenuCreations } from "./mega-menu-creations";

afterEach(cleanup);

const productTypes = [
	{ href: "/produits", label: "Toutes les créations", icon: "gem" as const },
	{ href: "/produits/bagues", label: "Bagues" },
	{ href: "/produits/colliers", label: "Colliers" },
];

const featuredProducts = [
	{
		slug: "bague-celeste",
		title: "Bague Céleste",
		priceInclTax: 9900,
		imageUrl: "/bague.jpg",
		blurDataUrl: null,
	},
	{
		slug: "collier-aurora",
		title: "Collier Aurora",
		priceInclTax: 15000,
		imageUrl: "/collier.jpg",
		blurDataUrl: "data:image/jpeg;base64,abc",
	},
];

describe("MegaMenuCreations", () => {
	it("returns null when no product types", () => {
		const { container } = render(<MegaMenuCreations />);
		expect(container.innerHTML).toBe("");
	});

	it("returns null when product types is empty", () => {
		const { container } = render(<MegaMenuCreations productTypes={[]} />);
		expect(container.innerHTML).toBe("");
	});

	it("renders product types via MegaMenuColumn", () => {
		render(<MegaMenuCreations productTypes={productTypes} />);

		expect(screen.getByTestId("mega-menu-column")).toBeDefined();
		expect(screen.getByText("Catégories")).toBeDefined();
		expect(screen.getByText("Bagues")).toBeDefined();
		expect(screen.getByText("Colliers")).toBeDefined();
	});

	it("renders featured products with correct ROUTES.SHOP.PRODUCT links", () => {
		render(
			<MegaMenuCreations
				productTypes={productTypes}
				featuredProducts={featuredProducts}
			/>
		);

		const bagueLink = screen.getByRole("link", { name: /Bague Céleste/ });
		expect(bagueLink.getAttribute("href")).toBe("/creations/bague-celeste");

		const collierLink = screen.getByRole("link", { name: /Collier Aurora/ });
		expect(collierLink.getAttribute("href")).toBe("/creations/collier-aurora");
	});

	it("renders featured product prices", () => {
		render(
			<MegaMenuCreations
				productTypes={productTypes}
				featuredProducts={featuredProducts}
			/>
		);

		expect(screen.getByText("99 €")).toBeDefined();
		expect(screen.getByText("150 €")).toBeDefined();
	});

	it("renders the Nouveautés section header", () => {
		render(
			<MegaMenuCreations
				productTypes={productTypes}
				featuredProducts={featuredProducts}
			/>
		);

		expect(screen.getByText("Nouveautés")).toBeDefined();
	});

	it("does not render featured section when no products", () => {
		render(<MegaMenuCreations productTypes={productTypes} />);

		expect(screen.queryByText("Nouveautés")).toBeNull();
	});
});
