import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { GetTopProductsReturn, TopProductItem } from "../../types/dashboard.types";

// ============================================================================
// MOCKS
// ============================================================================

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("next/link", () => ({
	default: ({
		href,
		children,
		className,
	}: {
		href: string;
		children: React.ReactNode;
		className?: string;
	}) => (
		<a href={href} className={className}>
			{children}
		</a>
	),
}));

vi.mock("next/image", () => ({
	default: ({
		src,
		alt,
		width,
		height,
		className,
	}: {
		src: string;
		alt: string;
		width: number;
		height: number;
		className?: string;
	}) => (
		// eslint-disable-next-line @next/next/no-img-element
		<img src={src} alt={alt} width={width} height={height} className={className} />
	),
}));

vi.mock("lucide-react", () => ({
	ArrowRight: (props: any) => (
		<span data-testid="icon-arrow-right" aria-hidden={props["aria-hidden"]} />
	),
	ChevronRight: (props: any) => (
		<span data-testid="icon-chevron-right" aria-hidden={props["aria-hidden"]} />
	),

	ShoppingBag: (props: any) => (
		<span data-testid="icon-shopping-bag" aria-hidden={props["aria-hidden"]} />
	),
}));

vi.mock("@/shared/components/ui/item", () => ({
	Item: () => null,
	ItemGroup: () => null,
	ItemContent: () => null,
	ItemTitle: () => null,
	ItemMedia: () => null,
	ItemActions: () => null,
	ItemSeparator: () => null,
	ItemDescription: () => null,
	ItemFooter: () => null,
}));

// Force desktop rendering path (mobile section relies on Items mocked as null anyway)
vi.mock("@/shared/hooks/use-mobile", () => ({
	useIsMobile: () => false,
}));

vi.mock("@/shared/components/ui/badge", () => ({
	Badge: ({
		children,
		variant,
		className,
	}: {
		children: React.ReactNode;
		variant?: string;
		className?: string;
	}) => (
		<span data-testid="badge" data-variant={variant} className={className}>
			{children}
		</span>
	),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		asChild,
		...props
	}: {
		children: React.ReactNode;
		asChild?: boolean;
		[key: string]: unknown;
	}) => (asChild ? <>{children}</> : <button {...props}>{children}</button>),
}));

vi.mock("@/shared/components/ui/card", () => ({
	Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<div data-testid="card" className={className}>
			{children}
		</div>
	),
	CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
	CardFooter: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<div data-testid="card-footer" className={className}>
			{children}
		</div>
	),
	CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	CardTitle: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<h3 className={className}>{children}</h3>
	),
}));

vi.mock("@/shared/utils/format-euro", () => ({
	formatEuro: (cents: number, _options?: { compact?: boolean }) => {
		return `${(cents / 100).toFixed(0)} €`;
	},
}));

vi.mock("../../constants/chart-styles", () => ({
	CHART_STYLES: {
		card: "mock-card-class",
		title: "mock-title-class",
	},
}));

import { TopProductsList } from "../top-products-list";

afterEach(cleanup);

// ============================================================================
// HELPERS
// ============================================================================

function makeProduct(overrides: Partial<TopProductItem> = {}): TopProductItem {
	return {
		productId: "product-1",
		title: "Bague en or",
		imageUrl: "https://example.com/image.jpg",
		unitsSold: 5,
		revenue: 25000,
		...overrides,
	};
}

function makeData(products: TopProductItem[]): GetTopProductsReturn {
	return { products };
}

// ============================================================================
// TESTS
// ============================================================================

describe("TopProductsList", () => {
	// -------------------------------------------------------------------------
	// Empty state
	// -------------------------------------------------------------------------

	it("renders empty state when no products", () => {
		render(<TopProductsList data={makeData([])} />);

		expect(screen.getByText("Aucune vente ce mois")).toBeInTheDocument();
	});

	it("renders ShoppingBag icon in empty state", () => {
		render(<TopProductsList data={makeData([])} />);

		expect(screen.getByTestId("icon-shopping-bag")).toBeInTheDocument();
	});

	it("does not render footer link in empty state", () => {
		render(<TopProductsList data={makeData([])} />);

		expect(screen.queryByText("Voir tous les produits")).toBeNull();
	});

	// -------------------------------------------------------------------------
	// Rendering with products
	// -------------------------------------------------------------------------

	it("renders the card title", () => {
		render(<TopProductsList data={makeData([makeProduct()])} />);

		expect(screen.getByText("Top produits")).toBeInTheDocument();
	});

	it("renders the card description", () => {
		render(<TopProductsList data={makeData([makeProduct()])} />);

		expect(screen.getByText("Meilleures ventes du mois en cours")).toBeInTheDocument();
	});

	it("renders product title", () => {
		render(<TopProductsList data={makeData([makeProduct({ title: "Collier argent" })])} />);

		expect(screen.getByText("Collier argent")).toBeInTheDocument();
	});

	it("renders rank starting at 1", () => {
		render(<TopProductsList data={makeData([makeProduct()])} />);

		expect(screen.getByText("1")).toBeInTheDocument();
	});

	it("renders ranks for multiple products", () => {
		const products = [
			makeProduct({ productId: "p1", title: "Produit A" }),
			makeProduct({ productId: "p2", title: "Produit B" }),
			makeProduct({ productId: "p3", title: "Produit C" }),
		];

		render(<TopProductsList data={makeData(products)} />);

		expect(screen.getByText("1")).toBeInTheDocument();
		expect(screen.getByText("2")).toBeInTheDocument();
		expect(screen.getByText("3")).toBeInTheDocument();
	});

	it("renders 5 products with sequential ranks", () => {
		const products = Array.from({ length: 5 }, (_, i) =>
			makeProduct({ productId: `p${i}`, title: `Produit ${i + 1}` }),
		);

		render(<TopProductsList data={makeData(products)} />);

		for (let i = 1; i <= 5; i++) {
			expect(screen.getByText(`${i}`)).toBeInTheDocument();
			expect(screen.getByText(`Produit ${i}`)).toBeInTheDocument();
		}
	});

	// -------------------------------------------------------------------------
	// Thumbnail and image fallback
	// -------------------------------------------------------------------------

	it("renders product image when imageUrl is provided", () => {
		render(
			<TopProductsList
				data={makeData([makeProduct({ imageUrl: "https://example.com/img.jpg" })])}
			/>,
		);

		// alt="" means role=presentation, query by tag instead
		const img = document.querySelector("img");
		expect(img).toHaveAttribute("src", "https://example.com/img.jpg");
	});

	it("renders ShoppingBag icon fallback when imageUrl is null", () => {
		render(<TopProductsList data={makeData([makeProduct({ imageUrl: null })])} />);

		expect(screen.getByTestId("icon-shopping-bag")).toBeInTheDocument();
		expect(document.querySelector("img")).toBeNull();
	});

	// -------------------------------------------------------------------------
	// Pluralization
	// -------------------------------------------------------------------------

	it("renders singular 'vendu' for 1 unit sold", () => {
		render(<TopProductsList data={makeData([makeProduct({ unitsSold: 1 })])} />);

		expect(screen.getByText("1 vendu")).toBeInTheDocument();
	});

	it("renders plural 'vendus' for multiple units sold", () => {
		render(<TopProductsList data={makeData([makeProduct({ unitsSold: 12 })])} />);

		expect(screen.getByText("12 vendus")).toBeInTheDocument();
	});

	// -------------------------------------------------------------------------
	// Revenue badge
	// -------------------------------------------------------------------------

	it("renders revenue badge using formatEuro", () => {
		render(<TopProductsList data={makeData([makeProduct({ revenue: 15000 })])} />);

		const badge = screen.getByTestId("badge");
		expect(badge).toHaveTextContent("150 €");
	});

	it("renders secondary variant on revenue badge", () => {
		render(<TopProductsList data={makeData([makeProduct()])} />);

		const badge = screen.getByTestId("badge");
		expect(badge).toHaveAttribute("data-variant", "secondary");
	});

	// -------------------------------------------------------------------------
	// Footer link
	// -------------------------------------------------------------------------

	it("renders 'Voir tous les produits' link when products exist", () => {
		render(<TopProductsList data={makeData([makeProduct()])} />);

		const link = screen.getByText("Voir tous les produits");
		expect(link).toBeInTheDocument();
		expect(link.closest("a")).toHaveAttribute("href", "/admin/catalogue/produits");
	});

	it("renders arrow right icon in footer link", () => {
		render(<TopProductsList data={makeData([makeProduct()])} />);

		expect(screen.getByTestId("icon-arrow-right")).toBeInTheDocument();
	});
});
