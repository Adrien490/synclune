import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockProductsSelectionToolbar,
	mockCursorPagination,
	mockTableSelectionCell,
	mockProductRowActions,
} = vi.hoisted(() => ({
	mockProductsSelectionToolbar: vi.fn(),
	mockCursorPagination: vi.fn(),
	mockTableSelectionCell: vi.fn(),
	mockProductRowActions: vi.fn(),
}));

vi.mock("@/app/generated/prisma/client", () => ({
	ProductStatus: {
		PUBLIC: "PUBLIC",
		DRAFT: "DRAFT",
		ARCHIVED: "ARCHIVED",
	},
	PrismaClient: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: {},
	notDeleted: {},
	softDelete: {},
}));

vi.mock("@/modules/auth/lib/auth", () => ({
	auth: {},
}));

vi.mock("@/modules/auth/lib/get-current-session", () => ({
	getSession: vi.fn(),
}));

vi.mock("stripe", () => ({
	default: vi.fn(),
}));

vi.mock("next/image", () => ({
	default: (props: Record<string, unknown>) => {
		const { fill, blurDataURL, ...rest } = props;
		return (
			<img
				alt=""
				data-fill={fill ? "true" : undefined}
				data-blur={blurDataURL ? "true" : undefined}
				{...rest}
			/>
		);
	},
}));

vi.mock("next/link", () => ({
	default: ({ children, ...props }: { children: React.ReactNode; href: string }) => (
		<a {...props}>{children}</a>
	),
}));

vi.mock("../products-selection-toolbar", () => ({
	ProductsSelectionToolbar: (props: Record<string, unknown>) => {
		mockProductsSelectionToolbar(props);
		return <div data-testid="selection-toolbar" />;
	},
}));

vi.mock("../product-row-actions", () => ({
	ProductRowActions: (props: Record<string, unknown>) => {
		mockProductRowActions(props);
		return <div data-testid="row-actions" />;
	},
}));

vi.mock("@/shared/components/cursor-pagination", () => ({
	CursorPagination: (props: Record<string, unknown>) => {
		mockCursorPagination(props);
		return <div data-testid="cursor-pagination" />;
	},
}));

vi.mock("@/shared/components/table-selection-cell", () => ({
	TableSelectionCell: (props: Record<string, unknown>) => {
		mockTableSelectionCell(props);
		return <div data-testid={`selection-cell-${props.type}`} />;
	},
}));

vi.mock("@/shared/components/table-scroll-container", () => ({
	TableScrollContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/shared/components/data-table/table-empty-state", () => ({
	TableEmptyState: (props: Record<string, unknown>) => (
		<div data-testid="empty-state" data-title={props.title} />
	),
}));

vi.mock("@/shared/components/ui/card", () => ({
	Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
	CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/shared/components/ui/badge", () => ({
	Badge: ({ children, variant, ...rest }: { children: React.ReactNode; variant: string }) => (
		<span data-testid={`badge-${variant}`} {...rest}>
			{children}
		</span>
	),
}));

vi.mock("@/shared/components/ui/table", () => ({
	Table: ({ children, ...rest }: { children: React.ReactNode }) => (
		<table {...rest}>{children}</table>
	),
	TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
	TableCell: ({ children, ...rest }: { children: React.ReactNode }) => (
		<td {...rest}>{children}</td>
	),
	TableHead: ({ children, ...rest }: { children: React.ReactNode }) => (
		<th {...rest}>{children}</th>
	),
	TableHeader: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
	TableRow: ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>,
}));

// ============================================================================
// Imports (after mocks)
// ============================================================================

import { ProductsDataTable } from "../products-data-table";

// ============================================================================
// Fixtures
// ============================================================================

function createProduct(overrides: Record<string, unknown> = {}) {
	return {
		id: "prod-1",
		title: "Bague Lune",
		slug: "bague-lune",
		status: "PUBLIC" as const,
		skus: [
			{
				id: "sku-1",
				isDefault: true,
				isActive: true,
				priceInclTax: 4900,
				compareAtPrice: null,
				inventory: 10,
				images: [
					{
						id: "img-1",
						url: "https://example.com/img1.jpg",
						altText: "Bague Lune",
						isPrimary: true,
						mediaType: "IMAGE",
						blurDataUrl: null,
					},
				],
			},
		],
		_count: { skus: 1 },
		...overrides,
	};
}

function createPagination(overrides: Record<string, unknown> = {}) {
	return {
		hasNextPage: false,
		hasPreviousPage: false,
		nextCursor: null,
		prevCursor: null,
		...overrides,
	};
}

function createProductsPromise(
	products: ReturnType<typeof createProduct>[] = [createProduct()],
	paginationOverrides: Record<string, unknown> = {},
) {
	return Promise.resolve({
		products,
		pagination: createPagination(paginationOverrides),
		totalCount: products.length,
	});
}

// ============================================================================
// Tests
// ============================================================================

afterEach(cleanup);

describe("ProductsDataTable", () => {
	// --------------------------------------------------------------------------
	// Empty state
	// --------------------------------------------------------------------------

	describe("empty state", () => {
		it("renders empty state when no products", async () => {
			const Component = await ProductsDataTable({
				productsPromise: createProductsPromise([]),
				perPage: 10,
			});
			render(Component);

			expect(screen.getByTestId("empty-state")).toBeInTheDocument();
			expect(screen.getByTestId("empty-state")).toHaveAttribute("data-title", "Aucun bijou trouvé");
		});

		it("does not render the table when empty", async () => {
			const Component = await ProductsDataTable({
				productsPromise: createProductsPromise([]),
				perPage: 10,
			});
			render(Component);

			expect(screen.queryByRole("table")).not.toBeInTheDocument();
		});
	});

	// --------------------------------------------------------------------------
	// Table rendering
	// --------------------------------------------------------------------------

	describe("table rendering", () => {
		it("renders a table with aria-label", async () => {
			const Component = await ProductsDataTable({
				productsPromise: createProductsPromise(),
				perPage: 10,
			});
			render(Component);

			expect(screen.getByRole("table")).toHaveAttribute("aria-label", "Liste des bijoux");
		});

		it("renders product title as a link to edit page", async () => {
			const Component = await ProductsDataTable({
				productsPromise: createProductsPromise(),
				perPage: 10,
			});
			render(Component);

			const link = screen.getByRole("link", { name: "Modifier Bague Lune" });
			expect(link).toHaveAttribute("href", "/admin/catalogue/produits/bague-lune/modifier");
		});

		it("renders product image when available", async () => {
			const Component = await ProductsDataTable({
				productsPromise: createProductsPromise(),
				perPage: 10,
			});
			render(Component);

			const img = screen.getByRole("img", { name: "Bague Lune" });
			expect(img).toHaveAttribute("src", "https://example.com/img1.jpg");
		});

		it("renders fallback icon when no image", async () => {
			const product = createProduct({
				skus: [
					{
						id: "sku-1",
						isDefault: true,
						isActive: true,
						priceInclTax: 4900,
						compareAtPrice: null,
						inventory: 10,
						images: [],
					},
				],
			});
			const Component = await ProductsDataTable({
				productsPromise: createProductsPromise([product]),
				perPage: 10,
			});
			render(Component);

			expect(screen.queryByRole("img")).not.toBeInTheDocument();
			expect(screen.getByLabelText("Aucune image disponible")).toBeInTheDocument();
		});

		it("renders multiple products", async () => {
			const products = [
				createProduct({ id: "prod-1", title: "Bague Lune", slug: "bague-lune" }),
				createProduct({ id: "prod-2", title: "Collier Étoile", slug: "collier-etoile" }),
			];
			const Component = await ProductsDataTable({
				productsPromise: createProductsPromise(products),
				perPage: 10,
			});
			render(Component);

			expect(screen.getByText("Bague Lune")).toBeInTheDocument();
			expect(screen.getByText("Collier Étoile")).toBeInTheDocument();
		});
	});

	// --------------------------------------------------------------------------
	// Status badges
	// --------------------------------------------------------------------------

	describe("status badges", () => {
		it("renders PUBLIC status as default badge", async () => {
			const Component = await ProductsDataTable({
				productsPromise: createProductsPromise([createProduct({ status: "PUBLIC" })]),
				perPage: 10,
			});
			render(Component);

			expect(screen.getByTestId("badge-default")).toHaveTextContent("Public");
		});

		it("renders DRAFT status as secondary badge", async () => {
			const Component = await ProductsDataTable({
				productsPromise: createProductsPromise([createProduct({ status: "DRAFT" })]),
				perPage: 10,
			});
			render(Component);

			expect(screen.getByTestId("badge-secondary")).toHaveTextContent("Brouillon");
		});

		it("renders ARCHIVED status as outline badge", async () => {
			const Component = await ProductsDataTable({
				productsPromise: createProductsPromise([createProduct({ status: "ARCHIVED" })]),
				perPage: 10,
			});
			render(Component);

			expect(screen.getByTestId("badge-outline")).toHaveTextContent("Archivé");
		});
	});

	// --------------------------------------------------------------------------
	// Stock badges
	// --------------------------------------------------------------------------

	describe("stock badges", () => {
		it("renders destructive badge for zero stock", async () => {
			const product = createProduct({
				skus: [
					{
						id: "sku-1",
						isDefault: true,
						isActive: true,
						priceInclTax: 4900,
						compareAtPrice: null,
						inventory: 0,
						images: [],
					},
				],
			});
			const Component = await ProductsDataTable({
				productsPromise: createProductsPromise([product]),
				perPage: 10,
			});
			render(Component);

			const stockBadge = screen.getByTestId("badge-destructive");
			expect(stockBadge).toHaveTextContent("0");
			expect(stockBadge).toHaveAttribute("aria-label", "Stock épuisé");
		});

		it("renders warning badge for low stock (<=3)", async () => {
			const product = createProduct({
				skus: [
					{
						id: "sku-1",
						isDefault: true,
						isActive: true,
						priceInclTax: 4900,
						compareAtPrice: null,
						inventory: 2,
						images: [],
					},
				],
			});
			const Component = await ProductsDataTable({
				productsPromise: createProductsPromise([product]),
				perPage: 10,
			});
			render(Component);

			const stockBadge = screen.getByTestId("badge-warning");
			expect(stockBadge).toHaveTextContent("2");
			expect(stockBadge).toHaveAttribute("aria-label", "Stock faible : 2 en stock");
		});

		it("renders success badge for normal stock", async () => {
			const Component = await ProductsDataTable({
				productsPromise: createProductsPromise(),
				perPage: 10,
			});
			render(Component);

			const stockBadge = screen.getByTestId("badge-success");
			expect(stockBadge).toHaveTextContent("10");
			expect(stockBadge).toHaveAttribute("aria-label", "10 en stock");
		});

		it("sums inventory across multiple SKUs", async () => {
			const product = createProduct({
				skus: [
					{
						id: "sku-1",
						isDefault: true,
						isActive: true,
						priceInclTax: 4900,
						compareAtPrice: null,
						inventory: 5,
						images: [],
					},
					{
						id: "sku-2",
						isDefault: false,
						isActive: true,
						priceInclTax: 5900,
						compareAtPrice: null,
						inventory: 8,
						images: [],
					},
				],
				_count: { skus: 2 },
			});
			const Component = await ProductsDataTable({
				productsPromise: createProductsPromise([product]),
				perPage: 10,
			});
			render(Component);

			expect(screen.getByTestId("badge-success")).toHaveTextContent("13");
		});
	});

	// --------------------------------------------------------------------------
	// Price display
	// --------------------------------------------------------------------------

	describe("price display", () => {
		it("renders single price for single SKU", async () => {
			const Component = await ProductsDataTable({
				productsPromise: createProductsPromise(),
				perPage: 10,
			});
			render(Component);

			// Price 4900 cents = 49,00 EUR
			const priceCell = screen.getByLabelText(/^Prix/);
			expect(priceCell).toBeInTheDocument();
		});

		it("renders price range for multiple SKUs with different prices", async () => {
			const product = createProduct({
				skus: [
					{
						id: "sku-1",
						isDefault: true,
						isActive: true,
						priceInclTax: 2900,
						compareAtPrice: null,
						inventory: 5,
						images: [],
					},
					{
						id: "sku-2",
						isDefault: false,
						isActive: true,
						priceInclTax: 5900,
						compareAtPrice: null,
						inventory: 5,
						images: [],
					},
				],
				_count: { skus: 2 },
			});
			const Component = await ProductsDataTable({
				productsPromise: createProductsPromise([product]),
				perPage: 10,
			});
			render(Component);

			const priceCell = screen.getByLabelText(/de.*à/);
			expect(priceCell).toBeInTheDocument();
		});
	});

	// --------------------------------------------------------------------------
	// Variants column
	// --------------------------------------------------------------------------

	describe("variants column", () => {
		it("renders variant count as link to manage page", async () => {
			const product = createProduct({ _count: { skus: 3 } });
			const Component = await ProductsDataTable({
				productsPromise: createProductsPromise([product]),
				perPage: 10,
			});
			render(Component);

			const variantLink = screen.getByRole("link", { name: /3 variantes.*gerer/i });
			expect(variantLink).toHaveAttribute("href", "/admin/catalogue/produits/bague-lune/variantes");
		});

		it("renders dash for zero variants", async () => {
			const product = createProduct({ _count: { skus: 0 } });
			const Component = await ProductsDataTable({
				productsPromise: createProductsPromise([product]),
				perPage: 10,
			});
			render(Component);

			expect(screen.getByLabelText("Aucune variante")).toHaveTextContent("—");
		});
	});

	// --------------------------------------------------------------------------
	// Selection
	// --------------------------------------------------------------------------

	describe("selection", () => {
		it("renders header selection cell", async () => {
			const Component = await ProductsDataTable({
				productsPromise: createProductsPromise(),
				perPage: 10,
			});
			render(Component);

			expect(mockTableSelectionCell).toHaveBeenCalledWith(
				expect.objectContaining({ type: "header", itemIds: ["prod-1"] }),
			);
		});

		it("renders row selection cell for each product", async () => {
			const Component = await ProductsDataTable({
				productsPromise: createProductsPromise(),
				perPage: 10,
			});
			render(Component);

			expect(mockTableSelectionCell).toHaveBeenCalledWith(
				expect.objectContaining({
					type: "row",
					itemId: "prod-1",
					ariaLabel: "Sélectionner Bague Lune",
				}),
			);
		});

		it("renders selection toolbar", async () => {
			const Component = await ProductsDataTable({
				productsPromise: createProductsPromise(),
				perPage: 10,
			});
			render(Component);

			expect(screen.getByTestId("selection-toolbar")).toBeInTheDocument();
		});
	});

	// --------------------------------------------------------------------------
	// Pagination
	// --------------------------------------------------------------------------

	describe("pagination", () => {
		it("passes pagination props to CursorPagination", async () => {
			const Component = await ProductsDataTable({
				productsPromise: createProductsPromise([createProduct()], {
					hasNextPage: true,
					nextCursor: "cursor-abc",
				}),
				perPage: 20,
			});
			render(Component);

			expect(mockCursorPagination).toHaveBeenCalledWith(
				expect.objectContaining({
					perPage: 20,
					hasNextPage: true,
					hasPreviousPage: false,
					currentPageSize: 1,
					nextCursor: "cursor-abc",
				}),
			);
		});
	});

	// --------------------------------------------------------------------------
	// Row actions
	// --------------------------------------------------------------------------

	describe("row actions", () => {
		it("passes product data to ProductRowActions", async () => {
			const Component = await ProductsDataTable({
				productsPromise: createProductsPromise(),
				perPage: 10,
			});
			render(Component);

			expect(mockProductRowActions).toHaveBeenCalledWith(
				expect.objectContaining({
					productId: "prod-1",
					productSlug: "bague-lune",
					productTitle: "Bague Lune",
					productStatus: "PUBLIC",
				}),
			);
		});
	});

	// --------------------------------------------------------------------------
	// Primary image selection
	// --------------------------------------------------------------------------

	describe("image selection", () => {
		it("selects primary image over non-primary", async () => {
			const product = createProduct({
				skus: [
					{
						id: "sku-1",
						isDefault: true,
						isActive: true,
						priceInclTax: 4900,
						compareAtPrice: null,
						inventory: 10,
						images: [
							{
								id: "img-2",
								url: "https://example.com/secondary.jpg",
								altText: "Secondary",
								isPrimary: false,
								mediaType: "IMAGE",
								blurDataUrl: null,
							},
							{
								id: "img-1",
								url: "https://example.com/primary.jpg",
								altText: "Primary",
								isPrimary: true,
								mediaType: "IMAGE",
								blurDataUrl: null,
							},
						],
					},
				],
			});
			const Component = await ProductsDataTable({
				productsPromise: createProductsPromise([product]),
				perPage: 10,
			});
			render(Component);

			const img = screen.getByRole("img", { name: "Primary" });
			expect(img).toHaveAttribute("src", "https://example.com/primary.jpg");
		});

		it("falls back to first image when no primary", async () => {
			const product = createProduct({
				skus: [
					{
						id: "sku-1",
						isDefault: true,
						isActive: true,
						priceInclTax: 4900,
						compareAtPrice: null,
						inventory: 10,
						images: [
							{
								id: "img-1",
								url: "https://example.com/first.jpg",
								altText: "First",
								isPrimary: false,
								mediaType: "IMAGE",
								blurDataUrl: null,
							},
							{
								id: "img-2",
								url: "https://example.com/second.jpg",
								altText: "Second",
								isPrimary: false,
								mediaType: "IMAGE",
								blurDataUrl: null,
							},
						],
					},
				],
			});
			const Component = await ProductsDataTable({
				productsPromise: createProductsPromise([product]),
				perPage: 10,
			});
			render(Component);

			const img = screen.getByRole("img", { name: "First" });
			expect(img).toHaveAttribute("src", "https://example.com/first.jpg");
		});
	});
});
