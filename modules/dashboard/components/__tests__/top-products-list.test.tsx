import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockUseIsMobile, mockTriggerHaptic } = vi.hoisted(() => ({
	mockUseIsMobile: vi.fn(),
	mockTriggerHaptic: vi.fn(),
}));

vi.mock("@/shared/hooks/use-mobile", () => ({
	useIsMobile: mockUseIsMobile,
}));

vi.mock("@/shared/hooks/use-haptic", () => ({
	triggerHaptic: mockTriggerHaptic,
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@/shared/utils/format-euro", () => ({
	formatEuro: (cents: number) => `${(cents / 100).toFixed(2)} €`,
}));

vi.mock("next/image", () => ({
	default: ({ src, alt }: { src: string; alt: string }) => (
		// eslint-disable-next-line @next/next/no-img-element
		<img src={src} alt={alt} data-testid="product-thumb" />
	),
}));

vi.mock("next/link", () => ({
	default: ({
		href,
		children,
		onClick,
		...props
	}: {
		href: string;
		children: React.ReactNode;
		onClick?: () => void;
		[k: string]: unknown;
	}) => (
		<a href={href} onClick={onClick} {...props}>
			{children}
		</a>
	),
}));

vi.mock("lucide-react", () => ({
	ArrowRight: () => <svg data-testid="icon-arrow" />,
	ChevronRight: () => <svg data-testid="icon-chevron" />,
	Package: () => <svg data-testid="icon-package" />,
}));

// Lightweight stubs for the shadcn primitives so we can assert on the structure.
vi.mock("@/shared/components/ui/card", () => ({
	Card: ({ children, ...p }: { children: React.ReactNode; [k: string]: unknown }) => (
		<div data-testid="card" {...p}>
			{children}
		</div>
	),
	CardHeader: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="card-header">{children}</div>
	),
	CardTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
	CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
	CardContent: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="card-content">{children}</div>
	),
	CardFooter: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="card-footer">{children}</div>
	),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		asChild,
		...p
	}: {
		children: React.ReactNode;
		asChild?: boolean;
		[k: string]: unknown;
	}) => (asChild ? <>{children}</> : <button {...p}>{children}</button>),
}));

vi.mock("@/shared/components/ui/item", () => ({
	Item: ({
		children,
		asChild,
		...p
	}: {
		children: React.ReactNode;
		asChild?: boolean;
		[k: string]: unknown;
	}) =>
		asChild ? (
			<>{children}</>
		) : (
			<div data-testid="item" {...p}>
				{children}
			</div>
		),
	ItemContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	ItemTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	ItemDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	ItemActions: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	ItemGroup: ({ children, ...p }: { children: React.ReactNode; [k: string]: unknown }) => (
		<div data-testid="item-group" {...p}>
			{children}
		</div>
	),
	ItemSeparator: () => <hr data-testid="item-separator" />,
}));

vi.mock("../../constants/chart-styles", () => ({
	CHART_STYLES: { card: "", title: "" },
}));

import { TopProductsList } from "../top-products-list";
import type { GetTopProductsReturn, TopProductItem } from "../../data/get-top-products";

// ============================================================================
// HELPERS
// ============================================================================

function makeProduct(overrides: Partial<TopProductItem> = {}): TopProductItem {
	return {
		productId: "prod-1",
		productSlug: "bracelet-or",
		title: "Bracelet Or",
		imageUrl: "https://example.com/img.jpg",
		revenue: 25000,
		unitsSold: 5,
		...overrides,
	};
}

function makeListData(products: TopProductItem[] = [makeProduct()]): GetTopProductsReturn {
	return { products };
}

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("TopProductsList", () => {
	describe("desktop layout", () => {
		beforeEach(() => {
			mockUseIsMobile.mockReturnValue(false);
		});

		it("renders title 'Top produits' and description", () => {
			render(<TopProductsList listData={makeListData()} />);

			expect(screen.getByText("Top produits")).toBeInTheDocument();
			expect(screen.getByText(/Top 5 par chiffre d'affaires/)).toBeInTheDocument();
		});

		it("appends periodLabel to the description when provided", () => {
			render(<TopProductsList listData={makeListData()} periodLabel="mois en cours" />);

			expect(screen.getByText("Top 5 par chiffre d'affaires — mois en cours")).toBeInTheDocument();
		});

		it("renders one row per product with rank, title, and revenue", () => {
			render(
				<TopProductsList
					listData={makeListData([
						makeProduct({ productId: "p1", title: "Bracelet Or", revenue: 30000 }),
						makeProduct({ productId: "p2", title: "Collier", revenue: 20000 }),
						makeProduct({ productId: "p3", title: "Bague", revenue: 10000 }),
					])}
				/>,
			);

			expect(screen.getByText("#1")).toBeInTheDocument();
			expect(screen.getByText("#2")).toBeInTheDocument();
			expect(screen.getByText("#3")).toBeInTheDocument();
			expect(screen.getByText("Bracelet Or")).toBeInTheDocument();
			expect(screen.getByText("Collier")).toBeInTheDocument();
			expect(screen.getByText("Bague")).toBeInTheDocument();
			expect(screen.getByText("300.00 €")).toBeInTheDocument();
		});

		it("renders empty state when no products", () => {
			render(<TopProductsList listData={makeListData([])} />);

			expect(screen.getByText("Aucune vente enregistrée sur la période")).toBeInTheDocument();
			// No "Voir tous les produits" footer
			expect(screen.queryByText("Voir tous les produits")).toBeNull();
		});

		it("renders 'Voir tous les produits' footer when products exist", () => {
			render(<TopProductsList listData={makeListData()} />);

			expect(screen.getByText("Voir tous les produits")).toBeInTheDocument();
		});

		it("links each product to /admin/catalogue/produits/[slug]/modifier when slug exists", () => {
			render(
				<TopProductsList
					listData={makeListData([makeProduct({ productSlug: "collier-argent" })])}
				/>,
			);

			const link = screen.getByRole("link", { name: /Rang 1, Bracelet Or/ });
			expect(link).toHaveAttribute("href", "/admin/catalogue/produits/collier-argent/modifier");
		});

		it("renders a non-link row when productSlug is null (deleted product)", () => {
			render(
				<TopProductsList
					listData={makeListData([
						makeProduct({ productId: null, productSlug: null, title: "Produit supprimé" }),
					])}
				/>,
			);

			const links = screen.queryAllByRole("link");
			// Only the footer "Voir tous les produits" link should remain
			expect(links.filter((l) => l.getAttribute("href")?.includes("/modifier"))).toHaveLength(0);
			expect(screen.getByText("Produit supprimé")).toBeInTheDocument();
		});

		it("uses fallback Package icon when imageUrl is null", () => {
			render(<TopProductsList listData={makeListData([makeProduct({ imageUrl: null })])} />);

			expect(screen.getByTestId("icon-package")).toBeInTheDocument();
			expect(screen.queryByTestId("product-thumb")).toBeNull();
		});

		it("uses Image when imageUrl is present", () => {
			render(<TopProductsList listData={makeListData()} />);

			expect(screen.getByTestId("product-thumb")).toBeInTheDocument();
			expect(screen.queryByTestId("icon-package")).toBeNull();
		});
	});

	describe("mobile layout", () => {
		beforeEach(() => {
			mockUseIsMobile.mockReturnValue(true);
		});

		it("renders mobile heading and description", () => {
			render(<TopProductsList listData={makeListData()} />);

			expect(screen.getByText("Top produits")).toBeInTheDocument();
			expect(screen.getByText(/Top 5 par chiffre d'affaires/)).toBeInTheDocument();
		});

		it("renders ItemSeparator between products", () => {
			render(
				<TopProductsList
					listData={makeListData([
						makeProduct({ productId: "p1" }),
						makeProduct({ productId: "p2" }),
						makeProduct({ productId: "p3" }),
					])}
				/>,
			);

			expect(screen.getAllByTestId("item-separator")).toHaveLength(2);
		});

		it("renders empty state with French text", () => {
			render(<TopProductsList listData={makeListData([])} />);

			expect(screen.getByText("Aucune vente enregistrée sur la période")).toBeInTheDocument();
		});
	});

	describe("accessibility", () => {
		beforeEach(() => mockUseIsMobile.mockReturnValue(false));

		it("provides comprehensive aria-label per row", () => {
			render(
				<TopProductsList
					listData={makeListData([
						makeProduct({ unitsSold: 5, revenue: 25000, title: "Bracelet Or" }),
					])}
				/>,
			);

			expect(
				screen.getByLabelText(/Rang 1.*Bracelet Or.*5 unités vendues.*250\.00 €/),
			).toBeInTheDocument();
		});

		it("uses singular 'unité' when only 1 sold", () => {
			render(<TopProductsList listData={makeListData([makeProduct({ unitsSold: 1 })])} />);

			expect(screen.getByLabelText(/1 unité vendue/)).toBeInTheDocument();
		});
	});
});
