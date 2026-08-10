import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderPropMock, type RenderPropMockProps } from "@/test/mocks/render-prop";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockOpenAlertDialog, mockFormatEuro } = vi.hoisted(() => ({
	mockOpenAlertDialog: vi.fn(),
	mockFormatEuro: vi.fn((amount: number) => `${(amount / 100).toFixed(2)} €`),
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/app/generated/prisma/enums", () => ({
	PublicationStatus: {
		PUBLIC: "PUBLIC",
		DRAFT: "DRAFT",
		ARCHIVED: "ARCHIVED",
	},
}));

vi.mock("@/shared/providers/overlay-store-provider", () => ({
	useAlertDialog: () => ({
		open: mockOpenAlertDialog,
	}),
}));

vi.mock("@/shared/utils/format-euro", () => ({
	formatEuro: mockFormatEuro,
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@/shared/components/ui/badge", () => ({
	Badge: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
		<span data-testid="badge" data-variant={variant}>
			{children}
		</span>
	),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		onClick,
		"aria-label": ariaLabel,
		variant: _variant,
		size: _size,
		className: _className,
	}: {
		children: React.ReactNode;
		onClick?: () => void;
		"aria-label"?: string;
		variant?: string;
		size?: string;
		className?: string;
	}) => (
		<button onClick={onClick} aria-label={ariaLabel}>
			{children}
		</button>
	),
}));

vi.mock("@/shared/components/ui/card", () => ({
	Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
	CardContent: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="card-content">{children}</div>
	),
}));

vi.mock("@/shared/components/ui/table", () => ({
	Table: ({ children }: { children: React.ReactNode }) => (
		<table data-testid="table">{children}</table>
	),
	TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
	TableCell: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<td className={className}>{children}</td>
	),
	TableHead: ({ children, className }: { children?: React.ReactNode; className?: string }) => (
		<th className={className}>{children}</th>
	),
	TableHeader: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
	TableRow: ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>,
}));

vi.mock("@/shared/components/ui/tooltip", () => ({
	Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	TooltipContent: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="tooltip-content">{children}</div>
	),
	TooltipTrigger: (props: RenderPropMockProps) => renderPropMock("div", props),
}));

vi.mock("@/shared/components/data-table/table-empty-state", () => ({
	TableEmptyState: ({
		title,
		description,
	}: {
		icon?: unknown;
		title: string;
		description?: string;
		action?: { label: string; href: string };
	}) => (
		<div data-testid="table-empty-state">
			<span>{title}</span>
			{description && <span>{description}</span>}
		</div>
	),
}));

vi.mock("next/image", () => ({
	default: ({
		src,
		alt,
		fill: _fill,
		className: _className,
		sizes: _sizes,
	}: {
		src: string;
		alt: string;
		fill?: boolean;
		className?: string;
		sizes?: string;
		// eslint-disable-next-line @next/next/no-img-element
	}) => <img data-testid="product-image" src={src} alt={alt} />,
}));

vi.mock("next/link", () => ({
	default: ({
		children,
		href,
		className,
	}: {
		children: React.ReactNode;
		href: string;
		className?: string;
	}) => (
		<a href={href} className={className}>
			{children}
		</a>
	),
}));

vi.mock("@phosphor-icons/react/ssr", () => ({
	PackageIcon: ({ className }: { className?: string }) => (
		<svg data-testid="icon-package" className={className} />
	),
	StarIcon: ({ className }: { className?: string }) => (
		<svg data-testid="icon-star" className={className} />
	),
}));

// Mock the dialog ID constant from a sibling file
vi.mock("@/modules/collections/components/admin/set-featured-product-alert-dialog", () => ({
	SET_FEATURED_PRODUCT_DIALOG_ID: "set-featured-product",
}));

import { CollectionProductsList } from "../collection-products-list";
import type { GetCollectionReturn } from "../../../types/collection.types";

afterEach(cleanup);

// ============================================================================
// HELPERS & FIXTURES
// ============================================================================

type ProductEntry = GetCollectionReturn["products"][number];

/**
 * Builds a minimal product entry matching the GetCollectionReturn["products"] shape
 * derived from GET_COLLECTION_SELECT.
 *
 * Depuis l'audit schéma V5 (lot A3), `isFeatured`/`isDefault`/`isPrimary` ont cédé
 * la place à `position` : la liste arrive PRÉ-TRIÉE et la vedette est le rang 0
 * du tableau — c'est l'INDEX qui fait foi dans le composant, pas la valeur.
 */
function makeProductEntry(overrides: Partial<ProductEntry> = {}): ProductEntry {
	return {
		position: 0,
		product: {
			id: "prod-1",
			slug: "bague-soleil",
			title: "Bague Soleil",
			description: "Une belle bague",
			status: "PUBLIC" as const,
			createdAt: new Date("2024-01-01"),
			updatedAt: new Date("2024-01-01"),
			type: null,
			skus: [
				{
					id: "sku-1",
					position: 0,
					priceInclTax: 4500,
					images: [
						{
							id: "img-1",
							url: "https://example.com/image.jpg",
							altText: "Bague Soleil",
							blurDataUrl: null,
							mediaType: "IMAGE" as const,
						},
					],
				},
			],
		},
		...overrides,
	};
}

function makeProductEntryNoImage(overrides: Partial<ProductEntry> = {}): ProductEntry {
	return makeProductEntry({
		...overrides,
		product: {
			...makeProductEntry().product,
			...(overrides.product ?? {}),
			skus: [
				{
					id: "sku-1",
					position: 0,
					priceInclTax: 4500,
					images: [],
				},
			],
		},
	});
}

function makeProductEntryNoPrice(overrides: Partial<ProductEntry> = {}): ProductEntry {
	return makeProductEntry({
		...overrides,
		product: {
			...makeProductEntry().product,
			...(overrides.product ?? {}),
			skus: [
				{
					id: "sku-1",
					position: 0,
					priceInclTax: undefined as unknown as number,
					images: [],
				},
			],
		},
	});
}

// ============================================================================
// TESTS
// ============================================================================

describe("CollectionProductsList", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ─── Empty state ──────────────────────────────────────────────────────────

	it("renders the empty state when products array is empty", () => {
		render(<CollectionProductsList collectionId="col-1" collectionSlug="bagues" products={[]} />);

		expect(screen.getByTestId("table-empty-state")).toBeInTheDocument();
		expect(screen.getByText("Aucun produit dans cette collection")).toBeInTheDocument();
	});

	it("does not render the products table when products array is empty", () => {
		render(<CollectionProductsList collectionId="col-1" collectionSlug="bagues" products={[]} />);

		expect(screen.queryByTestId("table")).not.toBeInTheDocument();
	});

	// ─── Products table ───────────────────────────────────────────────────────

	it("renders the products table when products are provided", () => {
		render(
			<CollectionProductsList
				collectionId="col-1"
				collectionSlug="bagues"
				products={[makeProductEntry()]}
			/>,
		);

		expect(screen.getByTestId("table")).toBeInTheDocument();
		expect(screen.queryByTestId("table-empty-state")).not.toBeInTheDocument();
	});

	it("renders a row for each product", () => {
		const products = [
			makeProductEntry({
				product: {
					...makeProductEntry().product,
					id: "prod-1",
					title: "Bague Soleil",
					slug: "bague-soleil",
				},
			}),
			makeProductEntry({
				product: {
					...makeProductEntry().product,
					id: "prod-2",
					title: "Collier Lune",
					slug: "collier-lune",
				},
			}),
		];

		render(
			<CollectionProductsList collectionId="col-1" collectionSlug="bagues" products={products} />,
		);

		expect(screen.getByText("Bague Soleil")).toBeInTheDocument();
		expect(screen.getByText("Collier Lune")).toBeInTheDocument();
	});

	// ─── Product title link ───────────────────────────────────────────────────

	it("renders product title as a link to the admin product detail page", () => {
		render(
			<CollectionProductsList
				collectionId="col-1"
				collectionSlug="bagues"
				products={[makeProductEntry()]}
			/>,
		);

		const link = screen.getByRole("link", { name: "Bague Soleil" });
		expect(link).toBeInTheDocument();
		expect(link).toHaveAttribute("href", "/admin/catalogue/produits/bague-soleil");
	});

	// ─── Status badge ─────────────────────────────────────────────────────────

	it("shows 'Public' badge for PUBLIC status", () => {
		render(
			<CollectionProductsList
				collectionId="col-1"
				collectionSlug="bagues"
				products={[makeProductEntry()]}
			/>,
		);

		const badge = screen.getByTestId("badge");
		expect(badge).toHaveTextContent("Public");
		expect(badge).toHaveAttribute("data-variant", "default");
	});

	it("shows 'Brouillon' badge for DRAFT status", () => {
		render(
			<CollectionProductsList
				collectionId="col-1"
				collectionSlug="bagues"
				products={[
					makeProductEntry({
						product: { ...makeProductEntry().product, status: "DRAFT" as const },
					}),
				]}
			/>,
		);

		const badge = screen.getByTestId("badge");
		expect(badge).toHaveTextContent("Brouillon");
		expect(badge).toHaveAttribute("data-variant", "secondary");
	});

	it("shows 'Archive' badge for ARCHIVED status", () => {
		render(
			<CollectionProductsList
				collectionId="col-1"
				collectionSlug="bagues"
				products={[
					makeProductEntry({
						product: { ...makeProductEntry().product, status: "ARCHIVED" as const },
					}),
				]}
			/>,
		);

		const badge = screen.getByTestId("badge");
		expect(badge).toHaveTextContent("Archive");
		expect(badge).toHaveAttribute("data-variant", "outline");
	});

	// ─── Featured star (rang 0) et action « Definir comme vedette » ──────────────

	it("shows a static featured star on the first row instead of a button", () => {
		render(
			<CollectionProductsList
				collectionId="col-1"
				collectionSlug="bagues"
				products={[makeProductEntry()]}
			/>,
		);

		// La vedette est le rang 0 de la liste pre-triee : pas d'action sur elle,
		// le flux « retirer la vedette » est parti avec `isFeatured`.
		expect(screen.queryByRole("button", { name: "Definir comme vedette" })).not.toBeInTheDocument();
		expect(screen.getByText("Produit vedette de la collection")).toBeInTheDocument();
	});

	it("renders the 'Definir comme vedette' button only on non-featured rows", () => {
		const products = [
			makeProductEntry({
				position: 0,
				product: { ...makeProductEntry().product, id: "prod-1", title: "Bague Soleil" },
			}),
			makeProductEntry({
				position: 1,
				product: { ...makeProductEntry().product, id: "prod-2", title: "Collier Lune" },
			}),
		];

		render(
			<CollectionProductsList collectionId="col-1" collectionSlug="bagues" products={products} />,
		);

		// Une seule action : le rang 0 porte le badge, seul le second rang est actionnable
		expect(screen.getAllByRole("button", { name: "Definir comme vedette" })).toHaveLength(1);
	});

	it("calls openAlertDialog with correct payload when star button is clicked", async () => {
		const user = userEvent.setup();
		const products = [
			makeProductEntry({
				position: 0,
				product: { ...makeProductEntry().product, id: "prod-1", title: "Bague Soleil" },
			}),
			makeProductEntry({
				position: 1,
				product: {
					...makeProductEntry().product,
					id: "prod-2",
					title: "Collier Lune",
					slug: "collier-lune",
				},
			}),
		];

		render(
			<CollectionProductsList collectionId="col-1" collectionSlug="bagues" products={products} />,
		);

		await user.click(screen.getByRole("button", { name: "Definir comme vedette" }));

		expect(mockOpenAlertDialog).toHaveBeenCalledTimes(1);
		// Plus de `isFeatured` dans le payload : on ne peut que REMPLACER la vedette
		expect(mockOpenAlertDialog).toHaveBeenCalledWith({
			collectionId: "col-1",
			collectionSlug: "bagues",
			productId: "prod-2",
			productTitle: "Collier Lune",
		});
	});

	// ─── Price display ────────────────────────────────────────────────────────

	it("shows formatted price when SKU has priceInclTax", () => {
		mockFormatEuro.mockReturnValue("45,00 €");
		render(
			<CollectionProductsList
				collectionId="col-1"
				collectionSlug="bagues"
				products={[makeProductEntry()]}
			/>,
		);

		expect(mockFormatEuro).toHaveBeenCalledWith(4500);
		expect(screen.getByText("45,00 €")).toBeInTheDocument();
	});

	it("shows '-' when SKU has no price", () => {
		render(
			<CollectionProductsList
				collectionId="col-1"
				collectionSlug="bagues"
				products={[makeProductEntryNoPrice()]}
			/>,
		);

		expect(screen.getByText("-")).toBeInTheDocument();
		expect(mockFormatEuro).not.toHaveBeenCalled();
	});

	it("shows '-' when product has no SKUs", () => {
		render(
			<CollectionProductsList
				collectionId="col-1"
				collectionSlug="bagues"
				products={[
					makeProductEntry({
						product: { ...makeProductEntry().product, skus: [] },
					}),
				]}
			/>,
		);

		expect(screen.getByText("-")).toBeInTheDocument();
	});

	// ─── Image display ────────────────────────────────────────────────────────

	it("renders product image when primary image is available", () => {
		render(
			<CollectionProductsList
				collectionId="col-1"
				collectionSlug="bagues"
				products={[makeProductEntry()]}
			/>,
		);

		const img = screen.getByTestId("product-image");
		expect(img).toBeInTheDocument();
		expect(img).toHaveAttribute("src", "https://example.com/image.jpg");
		expect(img).toHaveAttribute("alt", "Bague Soleil");
	});

	it("renders placeholder Package icon when no image is available", () => {
		render(
			<CollectionProductsList
				collectionId="col-1"
				collectionSlug="bagues"
				products={[makeProductEntryNoImage()]}
			/>,
		);

		expect(screen.queryByTestId("product-image")).not.toBeInTheDocument();
		// The placeholder container contains a Package icon
		expect(screen.getAllByTestId("icon-package").length).toBeGreaterThan(0);
	});

	it("uses altText of image when available", () => {
		render(
			<CollectionProductsList
				collectionId="col-1"
				collectionSlug="bagues"
				products={[
					makeProductEntry({
						product: {
							...makeProductEntry().product,
							skus: [
								{
									id: "sku-1",
									position: 0,
									priceInclTax: 4500,
									images: [
										{
											id: "img-1",
											url: "https://example.com/image.jpg",
											altText: "Custom alt text",
											blurDataUrl: null,
											mediaType: "IMAGE" as const,
										},
									],
								},
							],
						},
					}),
				]}
			/>,
		);

		const img = screen.getByTestId("product-image");
		expect(img).toHaveAttribute("alt", "Custom alt text");
	});

	it("falls back to product title as alt text when image altText is null", () => {
		render(
			<CollectionProductsList
				collectionId="col-1"
				collectionSlug="bagues"
				products={[
					makeProductEntry({
						product: {
							...makeProductEntry().product,
							skus: [
								{
									id: "sku-1",
									position: 0,
									priceInclTax: 4500,
									images: [
										{
											id: "img-1",
											url: "https://example.com/image.jpg",
											altText: null,
											blurDataUrl: null,
											mediaType: "IMAGE" as const,
										},
									],
								},
							],
						},
					}),
				]}
			/>,
		);

		const img = screen.getByTestId("product-image");
		expect(img).toHaveAttribute("alt", "Bague Soleil");
	});

	// ─── Product type label ───────────────────────────────────────────────────

	it("renders product type label when type is set", () => {
		render(
			<CollectionProductsList
				collectionId="col-1"
				collectionSlug="bagues"
				products={[
					makeProductEntry({
						product: {
							...makeProductEntry().product,
							type: {
								id: "type-1",
								slug: "bague",
								label: "Bague",
								isActive: true,
							},
						},
					}),
				]}
			/>,
		);

		expect(screen.getByText("Bague")).toBeInTheDocument();
	});

	it("does not render a type label when type is null", () => {
		render(
			<CollectionProductsList
				collectionId="col-1"
				collectionSlug="bagues"
				products={[makeProductEntry()]}
			/>,
		);

		// No extra type span besides the product title link
		expect(screen.queryByText("null")).not.toBeInTheDocument();
	});

	// Les tests « warning vedette non-PUBLIC » sont partis avec le bloc UI :
	// le select admin ne remonte que des produits PUBLIC et l'action serveur
	// refuse tout produit non publié — le cas est devenu impossible.
});
