import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockProductVariantsSelectionToolbar,
	mockCursorPagination,
	mockTableSelectionCell,
	mockProductSkuRowActions,
} = vi.hoisted(() => ({
	mockProductVariantsSelectionToolbar: vi.fn(),
	mockCursorPagination: vi.fn(),
	mockTableSelectionCell: vi.fn(),
	mockProductSkuRowActions: vi.fn(),
}));

vi.mock("@/app/generated/prisma/client", () => ({
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
			// eslint-disable-next-line @next/next/no-img-element
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

vi.mock("../skus-selection-toolbar", () => ({
	ProductVariantsSelectionToolbar: (props: Record<string, unknown>) => {
		mockProductVariantsSelectionToolbar(props);
		return <div data-testid="selection-toolbar" />;
	},
}));

vi.mock("../sku-row-actions", () => ({
	ProductSkuRowActions: (props: Record<string, unknown>) => {
		mockProductSkuRowActions(props);
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

vi.mock("@/shared/components/ui/tooltip", () => ({
	Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	TooltipTrigger: ({ children }: { children: React.ReactNode; asChild?: boolean }) => (
		<>{children}</>
	),
	TooltipContent: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="tooltip-content">{children}</div>
	),
}));

vi.mock("@/modules/media/utils/media-utils", () => ({
	getVideoMimeType: vi.fn().mockReturnValue("video/mp4"),
}));

// ============================================================================
// Imports (after mocks)
// ============================================================================

import { ProductVariantsDataTable } from "../skus-data-table";
import type { GetProductSkusReturn } from "@/modules/skus/types/skus.types";

// ============================================================================
// Fixtures
// ============================================================================

function createSku(overrides: Record<string, unknown> = {}) {
	return {
		id: "sku-1",
		sku: "REF-001",
		isActive: true,
		isDefault: true,
		priceInclTax: 4900,
		compareAtPrice: null,
		inventory: 10,
		color: null,
		material: null,
		size: null,
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

function createSkusPromise(
	skus: ReturnType<typeof createSku>[] = [createSku()],
	paginationOverrides: Record<string, unknown> = {},
) {
	return Promise.resolve({
		productSkus: skus,
		pagination: createPagination(paginationOverrides),
	} as unknown as GetProductSkusReturn);
}

// ============================================================================
// Tests
// ============================================================================

afterEach(cleanup);

describe("ProductVariantsDataTable", () => {
	// --------------------------------------------------------------------------
	// Empty state
	// --------------------------------------------------------------------------

	describe("empty state", () => {
		it("renders empty state when no SKUs", async () => {
			const Component = await ProductVariantsDataTable({
				skusPromise: createSkusPromise([]),
				productSlug: "bague-lune",
				perPage: 10,
			});
			render(Component);

			expect(screen.getByTestId("empty-state")).toBeInTheDocument();
			expect(screen.getByTestId("empty-state")).toHaveAttribute("data-title", "Aucune variante");
		});

		it("does not render the table when empty", async () => {
			const Component = await ProductVariantsDataTable({
				skusPromise: createSkusPromise([]),
				productSlug: "bague-lune",
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
			const Component = await ProductVariantsDataTable({
				skusPromise: createSkusPromise(),
				productSlug: "bague-lune",
				perPage: 10,
			});
			render(Component);

			expect(screen.getByRole("table")).toHaveAttribute(
				"aria-label",
				"Liste des variantes du produit",
			);
		});

		it("renders SKU reference in a row", async () => {
			const Component = await ProductVariantsDataTable({
				skusPromise: createSkusPromise(),
				productSlug: "bague-lune",
				perPage: 10,
			});
			render(Component);

			expect(screen.getByText("REF-001")).toBeInTheDocument();
		});

		it("renders SKU image when available", async () => {
			const Component = await ProductVariantsDataTable({
				skusPromise: createSkusPromise(),
				productSlug: "bague-lune",
				perPage: 10,
			});
			render(Component);

			const img = screen.getByRole("img", { name: "Bague Lune" });
			expect(img).toHaveAttribute("src", "https://example.com/img1.jpg");
		});

		it("renders fallback icon when no images", async () => {
			const sku = createSku({ images: [] });
			const Component = await ProductVariantsDataTable({
				skusPromise: createSkusPromise([sku]),
				productSlug: "bague-lune",
				perPage: 10,
			});
			render(Component);

			expect(screen.queryByRole("img")).not.toBeInTheDocument();
		});

		it("renders multiple SKU rows", async () => {
			const skus = [
				createSku({ id: "sku-1", sku: "REF-001" }),
				createSku({ id: "sku-2", sku: "REF-002", isDefault: false }),
			];
			const Component = await ProductVariantsDataTable({
				skusPromise: createSkusPromise(skus),
				productSlug: "bague-lune",
				perPage: 10,
			});
			render(Component);

			expect(screen.getByText("REF-001")).toBeInTheDocument();
			expect(screen.getByText("REF-002")).toBeInTheDocument();
		});

		it("renders color name when color is set", async () => {
			const sku = createSku({
				color: { id: "col-1", name: "Or", hex: "#FFD700", slug: "or" },
			});
			const Component = await ProductVariantsDataTable({
				skusPromise: createSkusPromise([sku]),
				productSlug: "bague-lune",
				perPage: 10,
			});
			render(Component);

			// Color name appears in both the visible span and the tooltip content
			const matches = screen.getAllByText("Or");
			expect(matches.length).toBeGreaterThanOrEqual(1);
		});

		it("renders material name when material is set", async () => {
			const sku = createSku({
				material: { id: "mat-1", name: "Argent", slug: "argent" },
			});
			const Component = await ProductVariantsDataTable({
				skusPromise: createSkusPromise([sku]),
				productSlug: "bague-lune",
				perPage: 10,
			});
			render(Component);

			expect(screen.getByText("Argent")).toBeInTheDocument();
		});

		it("renders size when size is set", async () => {
			const sku = createSku({ size: "52" });
			const Component = await ProductVariantsDataTable({
				skusPromise: createSkusPromise([sku]),
				productSlug: "bague-lune",
				perPage: 10,
			});
			render(Component);

			expect(screen.getByText("52")).toBeInTheDocument();
		});

		it("renders formatted price", async () => {
			const Component = await ProductVariantsDataTable({
				skusPromise: createSkusPromise(),
				productSlug: "bague-lune",
				perPage: 10,
			});
			render(Component);

			// 4900 cents = 49.00 €
			expect(screen.getByText("49.00 €")).toBeInTheDocument();
		});
	});

	// --------------------------------------------------------------------------
	// Default badge
	// --------------------------------------------------------------------------

	describe("default badge", () => {
		it("renders 'Par défaut' badge for default SKU", async () => {
			const Component = await ProductVariantsDataTable({
				skusPromise: createSkusPromise([createSku({ isDefault: true })]),
				productSlug: "bague-lune",
				perPage: 10,
			});
			render(Component);

			const badges = screen.getAllByTestId("badge-secondary");
			const defaultBadge = badges.find((b) => b.textContent === "Par défaut");
			expect(defaultBadge).toBeInTheDocument();
		});

		it("does not render 'Par défaut' badge for non-default SKU", async () => {
			const Component = await ProductVariantsDataTable({
				skusPromise: createSkusPromise([createSku({ isDefault: false })]),
				productSlug: "bague-lune",
				perPage: 10,
			});
			render(Component);

			const allText = screen.queryByText("Par défaut");
			expect(allText).not.toBeInTheDocument();
		});
	});

	// --------------------------------------------------------------------------
	// Stock badges
	// --------------------------------------------------------------------------

	describe("stock badges", () => {
		it("renders destructive badge for zero stock", async () => {
			const sku = createSku({ inventory: 0 });
			const Component = await ProductVariantsDataTable({
				skusPromise: createSkusPromise([sku]),
				productSlug: "bague-lune",
				perPage: 10,
			});
			render(Component);

			const stockBadge = screen.getByTestId("badge-destructive");
			expect(stockBadge).toHaveTextContent("0");
			expect(stockBadge).toHaveAttribute("aria-label", "Stock épuisé");
		});

		it("renders warning badge for low stock (<=3)", async () => {
			const sku = createSku({ inventory: 2 });
			const Component = await ProductVariantsDataTable({
				skusPromise: createSkusPromise([sku]),
				productSlug: "bague-lune",
				perPage: 10,
			});
			render(Component);

			const stockBadge = screen.getByTestId("badge-warning");
			expect(stockBadge).toHaveTextContent("2");
			expect(stockBadge).toHaveAttribute("aria-label", "Stock faible : 2 disponible(s)");
		});

		it("renders success badge for normal stock", async () => {
			const Component = await ProductVariantsDataTable({
				skusPromise: createSkusPromise(),
				productSlug: "bague-lune",
				perPage: 10,
			});
			render(Component);

			const stockBadge = screen.getByTestId("badge-success");
			expect(stockBadge).toHaveTextContent("10");
			expect(stockBadge).toHaveAttribute("aria-label", "10 en stock");
		});

		it("renders warning badge at exact LOW threshold (3)", async () => {
			const sku = createSku({ inventory: 3 });
			const Component = await ProductVariantsDataTable({
				skusPromise: createSkusPromise([sku]),
				productSlug: "bague-lune",
				perPage: 10,
			});
			render(Component);

			expect(screen.getByTestId("badge-warning")).toHaveTextContent("3");
		});

		it("renders success badge just above LOW threshold (4)", async () => {
			const sku = createSku({ inventory: 4 });
			const Component = await ProductVariantsDataTable({
				skusPromise: createSkusPromise([sku]),
				productSlug: "bague-lune",
				perPage: 10,
			});
			render(Component);

			expect(screen.getByTestId("badge-success")).toHaveTextContent("4");
		});
	});

	// --------------------------------------------------------------------------
	// Image selection
	// --------------------------------------------------------------------------

	describe("image selection", () => {
		it("selects primary image over non-primary", async () => {
			const sku = createSku({
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
			});
			const Component = await ProductVariantsDataTable({
				skusPromise: createSkusPromise([sku]),
				productSlug: "bague-lune",
				perPage: 10,
			});
			render(Component);

			const img = screen.getByRole("img", { name: "Primary" });
			expect(img).toHaveAttribute("src", "https://example.com/primary.jpg");
		});

		it("falls back to first image when no primary", async () => {
			const sku = createSku({
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
			});
			const Component = await ProductVariantsDataTable({
				skusPromise: createSkusPromise([sku]),
				productSlug: "bague-lune",
				perPage: 10,
			});
			render(Component);

			const img = screen.getByRole("img", { name: "First" });
			expect(img).toHaveAttribute("src", "https://example.com/first.jpg");
		});

		it("renders video element for VIDEO media type", async () => {
			const sku = createSku({
				images: [
					{
						id: "vid-1",
						url: "https://example.com/video.mp4",
						altText: "Vidéo variante",
						isPrimary: true,
						mediaType: "VIDEO",
						blurDataUrl: null,
					},
				],
			});
			const Component = await ProductVariantsDataTable({
				skusPromise: createSkusPromise([sku]),
				productSlug: "bague-lune",
				perPage: 10,
			});
			render(Component);

			expect(screen.getByLabelText("Vidéo variante")).toBeInTheDocument();
		});
	});

	// --------------------------------------------------------------------------
	// Selection
	// --------------------------------------------------------------------------

	describe("selection", () => {
		it("renders header selection cell with all SKU ids", async () => {
			const Component = await ProductVariantsDataTable({
				skusPromise: createSkusPromise(),
				productSlug: "bague-lune",
				perPage: 10,
			});
			render(Component);

			expect(mockTableSelectionCell).toHaveBeenCalledWith(
				expect.objectContaining({ type: "header", itemIds: ["sku-1"] }),
			);
		});

		it("renders row selection cell for each SKU", async () => {
			const Component = await ProductVariantsDataTable({
				skusPromise: createSkusPromise(),
				productSlug: "bague-lune",
				perPage: 10,
			});
			render(Component);

			expect(mockTableSelectionCell).toHaveBeenCalledWith(
				expect.objectContaining({ type: "row", itemId: "sku-1" }),
			);
		});

		it("renders selection toolbar", async () => {
			const Component = await ProductVariantsDataTable({
				skusPromise: createSkusPromise(),
				productSlug: "bague-lune",
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
			const Component = await ProductVariantsDataTable({
				skusPromise: createSkusPromise([createSku()], {
					hasNextPage: true,
					nextCursor: "cursor-abc",
				}),
				productSlug: "bague-lune",
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

		it("renders cursor pagination component", async () => {
			const Component = await ProductVariantsDataTable({
				skusPromise: createSkusPromise(),
				productSlug: "bague-lune",
				perPage: 10,
			});
			render(Component);

			expect(screen.getByTestId("cursor-pagination")).toBeInTheDocument();
		});
	});

	// --------------------------------------------------------------------------
	// Row actions
	// --------------------------------------------------------------------------

	describe("row actions", () => {
		it("renders row actions for each SKU", async () => {
			const Component = await ProductVariantsDataTable({
				skusPromise: createSkusPromise(),
				productSlug: "bague-lune",
				perPage: 10,
			});
			render(Component);

			expect(screen.getAllByTestId("row-actions")).toHaveLength(1);
		});

		it("passes correct props to ProductSkuRowActions", async () => {
			const Component = await ProductVariantsDataTable({
				skusPromise: createSkusPromise(),
				productSlug: "bague-lune",
				perPage: 10,
			});
			render(Component);

			expect(mockProductSkuRowActions).toHaveBeenCalledWith(
				expect.objectContaining({
					skuId: "sku-1",
					skuName: "REF-001",
					productSlug: "bague-lune",
					isDefault: true,
					isActive: true,
					inventory: 10,
					priceInclTax: 4900,
					compareAtPrice: null,
				}),
			);
		});

		it("renders row actions for each SKU when multiple SKUs", async () => {
			const skus = [
				createSku({ id: "sku-1", sku: "REF-001" }),
				createSku({ id: "sku-2", sku: "REF-002", isDefault: false }),
			];
			const Component = await ProductVariantsDataTable({
				skusPromise: createSkusPromise(skus),
				productSlug: "bague-lune",
				perPage: 10,
			});
			render(Component);

			expect(screen.getAllByTestId("row-actions")).toHaveLength(2);
		});
	});
});
