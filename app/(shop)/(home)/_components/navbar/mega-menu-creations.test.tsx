import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Mock next/link
vi.mock("next/link", () => ({
	default: ({
		href,
		children,
		...props
	}: {
		href: string;
		children: React.ReactNode;
		[key: string]: unknown;
	}) => (
		<a href={href} {...props}>
			{children}
		</a>
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
	MegaMenuColumn: ({
		title,
		subtitle,
		items,
	}: {
		title: string;
		subtitle?: string;
		items: Array<{ href: string; label: string }>;
	}) => (
		<div data-testid="mega-menu-column">
			<h3>{title}</h3>
			{subtitle && <p data-testid="column-subtitle">{subtitle}</p>}
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

// Mock formatEuro
vi.mock("@/shared/utils/format-euro", () => ({
	formatEuro: (cents: number) => `${cents / 100} €`,
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

		expect(screen.getByTestId("mega-menu-column")).toBeInTheDocument();
		expect(screen.getByText("Catégories")).toBeInTheDocument();
		expect(screen.getByText("Bagues")).toBeInTheDocument();
		expect(screen.getByText("Colliers")).toBeInTheDocument();
	});

	it("renders featured products with correct ROUTES.SHOP.PRODUCT links", () => {
		render(<MegaMenuCreations productTypes={productTypes} featuredProducts={featuredProducts} />);

		const bagueLink = screen.getByRole("link", { name: /Bague Céleste/ });
		expect(bagueLink.getAttribute("href")).toBe("/creations/bague-celeste");

		const collierLink = screen.getByRole("link", { name: /Collier Aurora/ });
		expect(collierLink.getAttribute("href")).toBe("/creations/collier-aurora");
	});

	it("renders featured product prices", () => {
		render(<MegaMenuCreations productTypes={productTypes} featuredProducts={featuredProducts} />);

		expect(screen.getByText("99 €")).toBeInTheDocument();
		expect(screen.getByText("150 €")).toBeInTheDocument();
	});

	it("renders the Nouveautés section header with font-display + atelier subtitle", () => {
		render(<MegaMenuCreations productTypes={productTypes} featuredProducts={featuredProducts} />);

		const heading = screen.getByRole("heading", { level: 3, name: "Nouveautés" });
		expect(heading).toBeInTheDocument();
		expect(heading.className).toMatch(/font-display/);
		expect(screen.getByText("Pièces récentes de l'atelier")).toBeInTheDocument();
	});

	it("passes 'Bijoux par type' subtitle to the Catégories column", () => {
		render(<MegaMenuCreations productTypes={productTypes} featuredProducts={featuredProducts} />);

		expect(screen.getByTestId("column-subtitle")).toHaveTextContent("Bijoux par type");
	});

	it("does not render featured section when no products", () => {
		render(<MegaMenuCreations productTypes={productTypes} />);

		expect(screen.queryByText("Nouveautés")).toBeNull();
	});

	it("renders 'Nouveau' badge when product.isNew is true", () => {
		const productsWithNew = [
			{ ...featuredProducts[0]!, isNew: true },
			{ ...featuredProducts[1]!, isNew: false },
		];
		render(<MegaMenuCreations productTypes={productTypes} featuredProducts={productsWithNew} />);

		const badges = screen.getAllByText("Nouveau");
		expect(badges).toHaveLength(1);
	});

	it("does not render 'Nouveau' badge when isNew is undefined", () => {
		render(<MegaMenuCreations productTypes={productTypes} featuredProducts={featuredProducts} />);

		expect(screen.queryByText("Nouveau")).toBeNull();
	});

	it("wraps content in a region landmark with aria-labelledby", () => {
		render(<MegaMenuCreations productTypes={productTypes} />);

		const regions = screen.getAllByRole("region");
		// MegaMenuCreations region (the outer wrapper) — first region
		const outerRegion = regions[0];
		expect(outerRegion).toBeDefined();
		const headingId = outerRegion!.getAttribute("aria-labelledby");
		expect(headingId).toBeTruthy();
		const heading = document.getElementById(headingId!);
		expect(heading?.textContent).toBe("Créations");
	});

	describe("spotlight fallback (F1 balance)", () => {
		const spotlightCollection = {
			href: "/collections/mariage",
			label: "Mariage",
			description: "Pièces délicates pour le grand jour",
			images: [{ url: "/mariage.jpg", blurDataUrl: null, alt: "Mariage" }],
		};

		it("renders the spotlight collection when no featured products", () => {
			render(
				<MegaMenuCreations productTypes={productTypes} spotlightCollection={spotlightCollection} />,
			);

			expect(screen.getByText("À découvrir")).toBeInTheDocument();
			expect(screen.getByText("Mariage")).toBeInTheDocument();
			expect(screen.getByText("Découvrir la collection")).toBeInTheDocument();
			expect(screen.queryByText("Nouveautés")).toBeNull();
		});

		it("prefers featured products over the spotlight fallback", () => {
			render(
				<MegaMenuCreations
					productTypes={productTypes}
					featuredProducts={featuredProducts}
					spotlightCollection={spotlightCollection}
				/>,
			);

			expect(screen.getByText("Nouveautés")).toBeInTheDocument();
			expect(screen.queryByText("À découvrir")).toBeNull();
		});

		it("does not render a spotlight when the collection has no images", () => {
			render(
				<MegaMenuCreations
					productTypes={productTypes}
					spotlightCollection={{ href: "/collections/x", label: "X", images: [] }}
				/>,
			);

			expect(screen.queryByText("À découvrir")).toBeNull();
		});
	});
});
