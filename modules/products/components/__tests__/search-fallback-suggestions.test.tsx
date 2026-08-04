import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderPropMock, type RenderPropMockProps } from "@/test/mocks/render-prop";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const { mockGetProducts, mockGetProductTypes, mockGetWishlistProductIds } = vi.hoisted(() => ({
	mockGetProducts: vi.fn(),
	mockGetProductTypes: vi.fn(),
	mockGetWishlistProductIds: vi.fn(),
}));

vi.mock("@/modules/products/data/get-products", () => ({
	getProducts: mockGetProducts,
}));

vi.mock("@/modules/product-types/data/get-product-types", () => ({
	getProductTypes: mockGetProductTypes,
}));

vi.mock("@/modules/wishlist/data/get-wishlist-product-ids", () => ({
	getWishlistProductIds: mockGetWishlistProductIds,
}));

vi.mock("@/modules/products/components/product-card", () => ({
	ProductCard: ({
		product,
		index,
		isInWishlist,
		sectionId,
	}: {
		product: { id: string; title: string };
		index: number;
		isInWishlist: boolean;
		sectionId: string;
	}) => (
		<div
			data-testid={`product-card-${product.id}`}
			data-index={index}
			data-in-wishlist={isInWishlist}
			data-section-id={sectionId}
		>
			{product.title}
		</div>
	),
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

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({ variant, size, ...props }: RenderPropMockProps) =>
		renderPropMock("button", { "data-variant": variant, "data-size": size, ...props }),
}));

/**
 * `SearchCorrectionSuggestion` (client) lit `useSearchParams()` pour conserver
 * les filtres actifs — sans ce mock, il n'y a pas de router en jsdom.
 * `mockSearchParams` est réassignable pour tester la préservation des filtres.
 */
const { mockSearchParams } = vi.hoisted(() => ({
	mockSearchParams: { current: new URLSearchParams() },
}));

vi.mock("next/navigation", () => ({
	useSearchParams: () => mockSearchParams.current,
}));

vi.mock("@/shared/components/ui/empty", () => ({
	Empty: ({ children }: { children: React.ReactNode }) => <div data-testid="empty">{children}</div>,
	EmptyHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	EmptyMedia: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
		<div data-testid="empty-media" data-variant={variant}>
			{children}
		</div>
	),
	EmptyTitle: ({ children }: { children: React.ReactNode }) => (
		<h3 data-testid="empty-title">{children}</h3>
	),
	EmptyDescription: ({ children }: { children: React.ReactNode }) => (
		<p data-testid="empty-description">{children}</p>
	),
	EmptyActions: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="empty-actions">{children}</div>
	),
}));

vi.mock("@/modules/products/components/reset-search-filters-action", () => ({
	ResetSearchFiltersAction: () => (
		<button data-testid="reset-search-filters">Réinitialiser les filtres</button>
	),
}));

vi.mock("lucide-react", () => ({
	SearchX: () => <svg data-testid="icon-search-x" />,
}));

vi.mock("@/shared/components/ui/skeleton", () => ({
	Skeleton: ({ className }: { className?: string }) => (
		<div data-testid="skeleton" className={className} />
	),
}));

// ---------------------------------------------------------------------------
// Import under test (after mocks)
// ---------------------------------------------------------------------------

import { SearchFallbackSuggestions } from "../search-fallback-suggestions";

afterEach(cleanup);

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function createProduct(overrides: Record<string, unknown> = {}) {
	return {
		id: "prod-1",
		slug: "bague-lune-argent",
		title: "Bague Lune Argent",
		status: "PUBLIC",
		skus: [],
		collections: [],
		createdAt: new Date("2025-01-01"),
		...overrides,
	};
}

function createProductType(overrides: Record<string, unknown> = {}) {
	return {
		id: "type-1",
		slug: "bagues",
		label: "Bagues",
		isActive: true,
		...overrides,
	};
}

function createPagination() {
	return {
		nextCursor: null,
		prevCursor: null,
		hasNextPage: false,
		hasPreviousPage: false,
	};
}

function makeProductsReturn(products: ReturnType<typeof createProduct>[] = []) {
	return {
		products,
		pagination: createPagination(),
		totalCount: products.length,
	};
}

function makeProductTypesReturn(productTypes: ReturnType<typeof createProductType>[] = []) {
	return {
		productTypes,
		pagination: createPagination(),
		totalCount: productTypes.length,
	};
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SearchFallbackSuggestions", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockGetWishlistProductIds.mockResolvedValue(new Set<string>());
	});

	describe("empty state message", () => {
		it("shows generic message when no searchTerm provided", async () => {
			mockGetProducts.mockResolvedValue(makeProductsReturn());
			mockGetProductTypes.mockResolvedValue(makeProductTypesReturn());

			render(await SearchFallbackSuggestions({}));

			expect(screen.getByTestId("empty-title")).toHaveTextContent(
				"Aucun produit ne correspond à vos critères",
			);
		});

		it("shows searchTerm-specific message when searchTerm is provided", async () => {
			mockGetProducts.mockResolvedValue(makeProductsReturn());
			mockGetProductTypes.mockResolvedValue(makeProductTypesReturn());

			render(await SearchFallbackSuggestions({ searchTerm: "collier rose" }));

			expect(screen.getByTestId("empty-title")).toHaveTextContent(
				'Aucun résultat pour "collier rose"',
			);
		});

		it("renders the SearchX icon inside EmptyMedia", async () => {
			mockGetProducts.mockResolvedValue(makeProductsReturn());
			mockGetProductTypes.mockResolvedValue(makeProductTypesReturn());

			render(await SearchFallbackSuggestions({}));

			expect(screen.getByTestId("icon-search-x")).toBeInTheDocument();
		});

		it("shows modify filters description when no suggestion provided", async () => {
			mockGetProducts.mockResolvedValue(makeProductsReturn());
			mockGetProductTypes.mockResolvedValue(makeProductTypesReturn());

			render(await SearchFallbackSuggestions({}));

			expect(screen.getByTestId("empty-description")).toHaveTextContent(
				"Essayez de modifier vos filtres.",
			);
		});
	});

	describe("spell suggestion", () => {
		it("shows suggestion link when suggestion is provided", async () => {
			mockGetProducts.mockResolvedValue(makeProductsReturn());
			mockGetProductTypes.mockResolvedValue(makeProductTypesReturn());

			render(
				await SearchFallbackSuggestions({
					searchTerm: "bageu",
					suggestion: "bague",
				}),
			);

			expect(screen.getByTestId("empty-description")).toHaveTextContent("Tu voulais dire");

			const link = screen.getByRole("link", { name: "bague" });
			expect(link).toHaveAttribute("href", "/produits?search=bague");
		});

		it("encodes the suggestion in the link href", async () => {
			mockGetProducts.mockResolvedValue(makeProductsReturn());
			mockGetProductTypes.mockResolvedValue(makeProductTypesReturn());

			render(
				await SearchFallbackSuggestions({
					suggestion: "collier argent",
				}),
			);

			const link = screen.getByRole("link", { name: "collier argent" });
			expect(link).toHaveAttribute("href", "/produits?search=collier+argent");
		});

		/**
		 * @regression suggestion-preserves-filters
		 *
		 * Le `SuggestionLink` local reconstruisait `/produits?search=…` de zéro :
		 * un client ayant filtré par couleur puis accepté la correction perdait
		 * silencieusement son filtre. Le composant partagé clone les `searchParams`
		 * courants et ne réinitialise que la pagination.
		 */
		it("conserve les filtres actifs et réinitialise la pagination", async () => {
			mockSearchParams.current = new URLSearchParams(
				"filter_color=or&sortBy=price-ascending&cursor=abc&direction=forward",
			);
			mockGetProducts.mockResolvedValue(makeProductsReturn());
			mockGetProductTypes.mockResolvedValue(makeProductTypesReturn());

			render(await SearchFallbackSuggestions({ searchTerm: "bageu", suggestion: "bague" }));

			const href = screen.getByRole("link", { name: "bague" }).getAttribute("href") ?? "";
			const params = new URLSearchParams(href.split("?")[1]);

			expect(params.get("filter_color")).toBe("or");
			expect(params.get("sortBy")).toBe("price-ascending");
			expect(params.get("search")).toBe("bague");
			expect(params.get("cursor")).toBeNull();
			expect(params.get("direction")).toBeNull();

			mockSearchParams.current = new URLSearchParams();
		});
	});

	describe("latest products section", () => {
		it("renders the 'Nos dernières créations' heading when products exist", async () => {
			mockGetProducts.mockResolvedValue(makeProductsReturn([createProduct()]));
			mockGetProductTypes.mockResolvedValue(makeProductTypesReturn());

			render(await SearchFallbackSuggestions({}));

			expect(screen.getByRole("heading", { name: "Nos dernières créations" })).toBeInTheDocument();
		});

		it("does not render the products section when no latest products", async () => {
			mockGetProducts.mockResolvedValue(makeProductsReturn([]));
			mockGetProductTypes.mockResolvedValue(makeProductTypesReturn());

			render(await SearchFallbackSuggestions({}));

			expect(
				screen.queryByRole("heading", { name: "Nos dernières créations" }),
			).not.toBeInTheDocument();
		});

		it("renders a ProductCard for each latest product", async () => {
			const products = [
				createProduct({ id: "prod-1", title: "Bague Lune" }),
				createProduct({ id: "prod-2", title: "Collier Soleil" }),
			];
			mockGetProducts.mockResolvedValue(makeProductsReturn(products));
			mockGetProductTypes.mockResolvedValue(makeProductTypesReturn());

			render(await SearchFallbackSuggestions({}));

			expect(screen.getByTestId("product-card-prod-1")).toBeInTheDocument();
			expect(screen.getByTestId("product-card-prod-2")).toBeInTheDocument();
		});

		it("passes sectionId='search-fallback' to each ProductCard", async () => {
			mockGetProducts.mockResolvedValue(makeProductsReturn([createProduct({ id: "prod-1" })]));
			mockGetProductTypes.mockResolvedValue(makeProductTypesReturn());

			render(await SearchFallbackSuggestions({}));

			expect(screen.getByTestId("product-card-prod-1")).toHaveAttribute(
				"data-section-id",
				"search-fallback",
			);
		});

		it("passes correct index to each ProductCard", async () => {
			const products = [createProduct({ id: "prod-1" }), createProduct({ id: "prod-2" })];
			mockGetProducts.mockResolvedValue(makeProductsReturn(products));
			mockGetProductTypes.mockResolvedValue(makeProductTypesReturn());

			render(await SearchFallbackSuggestions({}));

			expect(screen.getByTestId("product-card-prod-1")).toHaveAttribute("data-index", "0");
			expect(screen.getByTestId("product-card-prod-2")).toHaveAttribute("data-index", "1");
		});
	});

	describe("categories section", () => {
		it("renders the 'Explorer par catégorie' heading when product types exist", async () => {
			mockGetProducts.mockResolvedValue(makeProductsReturn());
			mockGetProductTypes.mockResolvedValue(makeProductTypesReturn([createProductType()]));

			render(await SearchFallbackSuggestions({}));

			expect(screen.getByRole("heading", { name: "Explorer par catégorie" })).toBeInTheDocument();
		});

		it("does not render the categories section when no product types", async () => {
			mockGetProducts.mockResolvedValue(makeProductsReturn());
			mockGetProductTypes.mockResolvedValue(makeProductTypesReturn([]));

			render(await SearchFallbackSuggestions({}));

			expect(
				screen.queryByRole("heading", { name: "Explorer par catégorie" }),
			).not.toBeInTheDocument();
		});

		it("renders a link button for each product type", async () => {
			const types = [
				createProductType({ id: "t1", slug: "bagues", label: "Bagues" }),
				createProductType({ id: "t2", slug: "colliers", label: "Colliers" }),
				createProductType({ id: "t3", slug: "bracelets", label: "Bracelets" }),
			];
			mockGetProducts.mockResolvedValue(makeProductsReturn());
			mockGetProductTypes.mockResolvedValue(makeProductTypesReturn(types));

			render(await SearchFallbackSuggestions({}));

			const bagues = screen.getByRole("link", { name: "Bagues" });
			expect(bagues).toHaveAttribute("href", "/produits/bagues");

			const colliers = screen.getByRole("link", { name: "Colliers" });
			expect(colliers).toHaveAttribute("href", "/produits/colliers");

			const bracelets = screen.getByRole("link", { name: "Bracelets" });
			expect(bracelets).toHaveAttribute("href", "/produits/bracelets");
		});
	});

	describe("wishlist integration", () => {
		it("marks product as in-wishlist when its id is in the wishlist set", async () => {
			mockGetProducts.mockResolvedValue(makeProductsReturn([createProduct({ id: "prod-1" })]));
			mockGetProductTypes.mockResolvedValue(makeProductTypesReturn());
			mockGetWishlistProductIds.mockResolvedValue(new Set(["prod-1"]));

			render(await SearchFallbackSuggestions({}));

			expect(screen.getByTestId("product-card-prod-1")).toHaveAttribute("data-in-wishlist", "true");
		});

		it("marks product as not in-wishlist when its id is absent", async () => {
			mockGetProducts.mockResolvedValue(makeProductsReturn([createProduct({ id: "prod-1" })]));
			mockGetProductTypes.mockResolvedValue(makeProductTypesReturn());
			mockGetWishlistProductIds.mockResolvedValue(new Set(["prod-99"]));

			render(await SearchFallbackSuggestions({}));

			expect(screen.getByTestId("product-card-prod-1")).toHaveAttribute(
				"data-in-wishlist",
				"false",
			);
		});
	});

	describe("data fetching", () => {
		it("calls getProducts with correct parameters", async () => {
			mockGetProducts.mockResolvedValue(makeProductsReturn());
			mockGetProductTypes.mockResolvedValue(makeProductTypesReturn());

			await SearchFallbackSuggestions({});

			expect(mockGetProducts).toHaveBeenCalledWith({
				perPage: 4,
				sortBy: "created-descending",
				filters: {
					status: "PUBLIC",
					stockStatus: "in_stock",
				},
			});
		});

		it("calls getProductTypes with correct parameters", async () => {
			mockGetProducts.mockResolvedValue(makeProductsReturn());
			mockGetProductTypes.mockResolvedValue(makeProductTypesReturn());

			await SearchFallbackSuggestions({});

			expect(mockGetProductTypes).toHaveBeenCalledWith({
				perPage: 20,
				sortBy: "label-ascending",
				filters: {
					isActive: true,
					hasProducts: true,
				},
			});
		});

		it("fetches all three data sources in parallel", async () => {
			mockGetProducts.mockResolvedValue(makeProductsReturn());
			mockGetProductTypes.mockResolvedValue(makeProductTypesReturn());

			await SearchFallbackSuggestions({});

			expect(mockGetProducts).toHaveBeenCalledOnce();
			expect(mockGetProductTypes).toHaveBeenCalledOnce();
			expect(mockGetWishlistProductIds).toHaveBeenCalledOnce();
		});
	});

	describe("combined content", () => {
		it("renders all sections when both products and types exist", async () => {
			mockGetProducts.mockResolvedValue(makeProductsReturn([createProduct({ id: "prod-1" })]));
			mockGetProductTypes.mockResolvedValue(
				makeProductTypesReturn([createProductType({ id: "t1" })]),
			);

			render(await SearchFallbackSuggestions({}));

			expect(screen.getByTestId("empty")).toBeInTheDocument();
			expect(screen.getByRole("heading", { name: "Nos dernières créations" })).toBeInTheDocument();
			expect(screen.getByRole("heading", { name: "Explorer par catégorie" })).toBeInTheDocument();
		});

		it("renders only the empty state when both data arrays are empty", async () => {
			mockGetProducts.mockResolvedValue(makeProductsReturn([]));
			mockGetProductTypes.mockResolvedValue(makeProductTypesReturn([]));

			render(await SearchFallbackSuggestions({}));

			expect(screen.getByTestId("empty")).toBeInTheDocument();
			expect(
				screen.queryByRole("heading", { name: "Nos dernières créations" }),
			).not.toBeInTheDocument();
			expect(
				screen.queryByRole("heading", { name: "Explorer par catégorie" }),
			).not.toBeInTheDocument();
		});
	});
});
