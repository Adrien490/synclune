import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("next/dynamic", () => ({
	default: (_loader: () => Promise<{ default: React.ComponentType }>) => {
		return function DynamicComponent(props: Record<string, unknown>) {
			return <div data-testid="product-filter-sheet" {...props} />;
		};
	},
}));

vi.mock("@/modules/products/components/filter-badges", () => ({
	ProductFilterBadges: ({
		colors,
		materials,
		productTypes,
	}: {
		colors: unknown[];
		materials: unknown[];
		productTypes: unknown[];
		activeProductType?: unknown;
	}) => (
		<div
			data-testid="product-filter-badges"
			data-colors={colors.length}
			data-materials={materials.length}
			data-product-types={productTypes.length}
		/>
	),
}));

vi.mock("@/modules/products/components/product-filter-trigger", () => ({
	ProductFilterTrigger: () => <button data-testid="product-filter-trigger">Filtres</button>,
}));

vi.mock("@/modules/products/components/product-list", () => ({
	ProductList: ({
		searchTerm,
		perPage,
		preferOnSale,
	}: {
		productsPromise: Promise<unknown>;
		perPage: number;
		searchTerm?: string;
		wishlistProductIdsPromise?: Promise<Set<string>>;
		preferOnSale?: boolean;
	}) => (
		<div
			data-testid="product-list"
			data-search-term={searchTerm}
			data-per-page={perPage}
			data-prefer-on-sale={preferOnSale}
		/>
	),
}));

vi.mock("@/modules/products/components/product-list-skeleton", () => ({
	ProductListSkeleton: () => <div data-testid="product-list-skeleton" />,
}));

vi.mock("@/modules/products/components/product-sort-bar", () => ({
	ProductSortBar: ({ sortOptions }: { sortOptions: { value: string; label: string }[] }) => (
		<div data-testid="product-sort-bar" data-options={sortOptions.length} />
	),
}));

vi.mock("@/shared/components/toolbar", () => ({
	Toolbar: ({
		children,
		search,
	}: {
		children: React.ReactNode;
		search?: React.ReactNode;
		className?: string;
	}) => (
		<div data-testid="toolbar">
			{search}
			{children}
		</div>
	),
}));

vi.mock("@/shared/components/page-header", () => ({
	PageHeader: ({
		title,
		description,
		breadcrumbs,
	}: {
		title: string;
		description?: string;
		breadcrumbs?: { label: string; href: string }[];
		className?: string;
		actions?: React.ReactNode;
	}) => (
		<header data-testid="page-header">
			<h1>{title}</h1>
			{description && <p data-testid="page-description">{description}</p>}
			{breadcrumbs && (
				<nav aria-label="breadcrumbs">
					{breadcrumbs.map((b) => (
						<a key={b.href} href={b.href}>
							{b.label}
						</a>
					))}
				</nav>
			)}
		</header>
	),
}));

vi.mock("@/shared/components/select-filter", () => ({
	SelectFilter: ({
		label,
	}: {
		label: string;
		filterKey: string;
		options: unknown[];
		placeholder: string;
		noPrefix?: boolean;
	}) => <div data-testid="select-filter">{label}</div>,
}));

vi.mock("@/modules/products/components/clear-search-button", () => ({
	ClearSearchButton: () => <button data-testid="clear-search-button">Effacer</button>,
}));

vi.mock("@/shared/components/search-input", () => ({
	SearchInput: ({
		placeholder,
		paramName,
	}: {
		placeholder: string;
		paramName: string;
		mode?: string;
		size?: string;
		className?: string;
	}) => <input data-testid="search-input" placeholder={placeholder} data-param={paramName} />,
}));

vi.mock("@/shared/utils/safe-json-ld", () => ({
	safeJsonLd: (data: object) => JSON.stringify(data),
}));

vi.mock("@/shared/components/scroll-restoration", () => ({
	ScrollRestoration: () => null,
}));

vi.mock("@/modules/products/constants/product.constants", () => ({
	PRODUCTS_SORT_OPTIONS: {
		PRICE_ASC: "price-ascending",
		PRICE_DESC: "price-descending",
		NEWEST: "created-descending",
	},
	PRODUCTS_SORT_LABELS: {
		"price-ascending": "Prix croissant",
		"price-descending": "Prix décroissant",
		"created-descending": "Plus récents",
	},
}));

// ============================================================================
// COMPONENT IMPORT (after mocks)
// ============================================================================

import { ProductCatalog, type ProductCatalogProps } from "../product-catalog";

// ============================================================================
// FIXTURES
// ============================================================================

function makeProps(overrides: Partial<ProductCatalogProps> = {}): ProductCatalogProps {
	return {
		productsPromise: Promise.resolve({
			products: [],
			pagination: {
				nextCursor: null,
				prevCursor: null,
				hasNextPage: false,
				hasPreviousPage: false,
			},
			totalCount: 0,
			suggestion: undefined,
		}),
		perPage: 24,
		productTypes: [],
		colors: [],
		materials: [],
		maxPriceInEuros: 500,
		activeFiltersCount: 0,
		jsonLd: { "@type": "ItemList" },
		breadcrumbs: [
			{ label: "Accueil", href: "/" },
			{ label: "Créations", href: "/produits" },
		],
		...overrides,
	};
}

// ============================================================================
// TESTS
// ============================================================================

afterEach(() => {
	cleanup();
	vi.resetAllMocks();
});

describe("ProductCatalog", () => {
	describe("page title", () => {
		// Le titre est rendu deux fois : mobile (`<h1 sm:hidden>` compact) et desktop
		// (PageHeader `hidden sm:block`). En DOM jsdom, les deux sont présents (CSS ignoré),
		// d'où `getAllByRole` au lieu de `getByRole`.
		it('shows "Les créations" by default', () => {
			render(<ProductCatalog {...makeProps()} />);
			const headings = screen.getAllByRole("heading", { name: "Les créations" });
			expect(headings.length).toBeGreaterThanOrEqual(1);
		});

		it("shows search term title when searchTerm is provided", () => {
			render(<ProductCatalog {...makeProps({ searchTerm: "bague" })} />);
			const headings = screen.getAllByRole("heading", { name: 'Recherche "bague"' });
			expect(headings.length).toBeGreaterThanOrEqual(1);
		});

		it("shows product type label when activeProductType is provided", () => {
			render(
				<ProductCatalog
					{...makeProps({
						activeProductType: { slug: "bague", label: "Bagues", description: null },
					})}
				/>,
			);
			const headings = screen.getAllByRole("heading", { name: "Bagues" });
			expect(headings.length).toBeGreaterThanOrEqual(1);
		});

		it("prioritises searchTerm title over activeProductType label", () => {
			render(
				<ProductCatalog
					{...makeProps({
						searchTerm: "argent",
						activeProductType: { slug: "bague", label: "Bagues", description: null },
					})}
				/>,
			);
			const headings = screen.getAllByRole("heading", { name: 'Recherche "argent"' });
			expect(headings.length).toBeGreaterThanOrEqual(1);
		});

		it("exposes a mobile-only H1 (WCAG 2.4.6) via data-testid", () => {
			render(<ProductCatalog {...makeProps()} />);
			const mobileTitle = screen.getByTestId("catalog-mobile-title");
			expect(mobileTitle.tagName).toBe("H1");
			expect(mobileTitle.className).toContain("sm:hidden");
		});
	});

	describe("page description", () => {
		it("shows default description when no searchTerm and no activeProductType", () => {
			render(<ProductCatalog {...makeProps()} />);
			expect(screen.getByTestId("page-description")).toBeInTheDocument();
			expect(screen.getByTestId("page-description").textContent).toContain("créations colorées");
		});

		it("shows product type description when activeProductType has one", () => {
			render(
				<ProductCatalog
					{...makeProps({
						activeProductType: {
							slug: "bague",
							label: "Bagues",
							description: "Toutes mes bagues artisanales.",
						},
					})}
				/>,
			);
			expect(screen.getByTestId("page-description").textContent).toContain(
				"Toutes mes bagues artisanales.",
			);
		});

		it("hides description when searchTerm is provided", () => {
			render(<ProductCatalog {...makeProps({ searchTerm: "argent" })} />);
			expect(screen.queryByTestId("page-description")).not.toBeInTheDocument();
		});
	});

	describe("breadcrumbs", () => {
		it("renders the breadcrumbs passed as props", () => {
			render(
				<ProductCatalog
					{...makeProps({
						breadcrumbs: [
							{ label: "Accueil", href: "/" },
							{ label: "Bagues", href: "/produits?type=bague" },
						],
					})}
				/>,
			);
			expect(screen.getByRole("link", { name: "Accueil" })).toBeInTheDocument();
			expect(screen.getByRole("link", { name: "Bagues" })).toBeInTheDocument();
		});
	});

	describe("filter badges", () => {
		it("does not render filter badges when no active filters and no activeProductType", () => {
			render(<ProductCatalog {...makeProps({ activeFiltersCount: 0 })} />);
			expect(screen.queryByTestId("product-filter-badges")).not.toBeInTheDocument();
		});

		it("renders filter badges when activeFiltersCount > 0", () => {
			render(<ProductCatalog {...makeProps({ activeFiltersCount: 2 })} />);
			expect(screen.getByTestId("product-filter-badges")).toBeInTheDocument();
		});

		it("renders filter badges when activeProductType is set even with 0 active filters", () => {
			render(
				<ProductCatalog
					{...makeProps({
						activeFiltersCount: 0,
						activeProductType: { slug: "bague", label: "Bagues", description: null },
					})}
				/>,
			);
			expect(screen.getByTestId("product-filter-badges")).toBeInTheDocument();
		});
	});

	describe("search placeholder", () => {
		it("uses generic jewelry placeholder by default", () => {
			render(<ProductCatalog {...makeProps()} />);
			const input = screen.getByTestId("search-input");
			expect(input).toHaveAttribute("placeholder", "Rechercher des bijoux…");
		});

		it("uses product type specific placeholder when activeProductType is set", () => {
			render(
				<ProductCatalog
					{...makeProps({
						activeProductType: { slug: "bague", label: "Bagues", description: null },
					})}
				/>,
			);
			const input = screen.getByTestId("search-input");
			expect(input).toHaveAttribute("placeholder", "Rechercher des bagues…");
		});
	});

	describe("layout", () => {
		it("renders the catalog section with correct aria-label", () => {
			render(<ProductCatalog {...makeProps()} />);
			expect(screen.getByRole("region", { name: "Catalogue des créations" })).toBeInTheDocument();
		});

		it("renders the ProductList component", () => {
			render(<ProductCatalog {...makeProps()} />);
			expect(screen.getByTestId("product-list")).toBeInTheDocument();
		});

		it("passes perPage to ProductList", () => {
			render(<ProductCatalog {...makeProps({ perPage: 48 })} />);
			expect(screen.getByTestId("product-list")).toHaveAttribute("data-per-page", "48");
		});

		it("passes searchTerm to ProductList", () => {
			render(<ProductCatalog {...makeProps({ searchTerm: "collier" })} />);
			expect(screen.getByTestId("product-list")).toHaveAttribute("data-search-term", "collier");
		});

		it("passes preferOnSale to ProductList", () => {
			render(<ProductCatalog {...makeProps({ preferOnSale: true })} />);
			expect(screen.getByTestId("product-list")).toHaveAttribute("data-prefer-on-sale", "true");
		});

		it("renders the sort bar", () => {
			render(<ProductCatalog {...makeProps()} />);
			expect(screen.getByTestId("product-sort-bar")).toBeInTheDocument();
		});

		it("renders 3 sort options in the sort bar", () => {
			render(<ProductCatalog {...makeProps()} />);
			expect(screen.getByTestId("product-sort-bar")).toHaveAttribute("data-options", "3");
		});
	});

	describe("JSON-LD", () => {
		it("renders the JSON-LD script tag", () => {
			const { container } = render(
				<ProductCatalog
					{...makeProps({ jsonLd: { "@type": "CollectionPage", name: "Bijoux" } })}
				/>,
			);
			const scripts = container.querySelectorAll('script[type="application/ld+json"]');
			expect(scripts.length).toBeGreaterThanOrEqual(1);
		});
	});
});
