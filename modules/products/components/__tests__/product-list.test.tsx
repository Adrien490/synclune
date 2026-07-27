import React from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { Suspense } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// INFRASTRUCTURE MOCKS (prevent Stripe/auth init errors)
// ============================================================================

vi.mock("@/modules/auth/lib/get-current-session", () => ({
	getSession: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/modules/auth/lib/auth", () => ({
	auth: {},
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: {},
	notDeleted: { deletedAt: null },
	softDelete: {},
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/modules/products/components/product-card", () => ({
	ProductCard: ({
		product,
		index,
		isInWishlist,
		preferOnSale,
	}: {
		product: { id: string; title: string; slug: string };
		index: number;
		isInWishlist?: boolean;
		sectionId?: string;
		preferOnSale?: boolean;
	}) => (
		<article
			data-testid={`product-card-${product.id}`}
			data-index={index}
			data-in-wishlist={isInWishlist}
			data-prefer-on-sale={preferOnSale}
		>
			{product.title}
		</article>
	),
}));

vi.mock("@/shared/components/cursor-pagination", () => ({
	CursorPagination: ({
		hasNextPage,
		hasPreviousPage,
		nextCursor,
		prevCursor,
		perPage,
	}: {
		hasNextPage: boolean;
		hasPreviousPage: boolean;
		nextCursor?: string | null;
		prevCursor?: string | null;
		perPage: number;
		currentPageSize: number;
	}) => (
		<nav
			data-testid="cursor-pagination"
			data-has-next={hasNextPage}
			data-has-prev={hasPreviousPage}
			data-next-cursor={nextCursor}
			data-prev-cursor={prevCursor}
			data-per-page={perPage}
			aria-label="Pagination"
		/>
	),
}));

vi.mock("@/shared/components/animations/stagger-grid", () => ({
	StaggerGrid: ({
		children,
		role,
		"aria-label": ariaLabel,
		className,
		as: Container = "div",
		itemAs: ItemTag = "div",
	}: {
		children: React.ReactNode;
		role?: string;
		"aria-label"?: string;
		className?: string;
		inView?: boolean;
		as?: "div" | "ul" | "ol";
		itemAs?: "div" | "li";
	}) => (
		<Container role={role} aria-label={ariaLabel} className={className}>
			{React.Children.map(children, (child, index) => (
				<ItemTag key={index}>{child}</ItemTag>
			))}
		</Container>
	),
}));

vi.mock("@/modules/products/components/refresh-button", () => ({
	RefreshButton: () => <button data-testid="refresh-button">Recharger</button>,
}));

vi.mock("@/modules/products/components/search-fallback-suggestions", () => ({
	SearchFallbackSuggestions: ({
		searchTerm,
		suggestion,
	}: {
		searchTerm?: string;
		suggestion?: string | null;
	}) => (
		<div
			data-testid="search-fallback-suggestions"
			data-search-term={searchTerm}
			data-suggestion={suggestion}
		/>
	),
	SearchFallbackSuggestionsSkeleton: () => (
		<div data-testid="search-fallback-suggestions-skeleton" />
	),
}));

vi.mock("@/modules/products/components/search-correction-suggestion", () => ({
	SearchCorrectionSuggestion: ({ suggestion }: { suggestion: string }) => (
		<div data-testid="search-correction-suggestion">{suggestion}</div>
	),
}));

vi.mock("@/shared/components/ui/alert", () => ({
	Alert: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
		<div data-testid="alert" data-variant={variant} role="alert">
			{children}
		</div>
	),
	AlertDescription: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="alert-description">{children}</div>
	),
}));

vi.mock("@/shared/utils/safe-json-ld", () => ({
	safeJsonLd: (data: object) => JSON.stringify(data),
}));

vi.mock("@/shared/constants/seo-config", () => ({
	SITE_URL: "https://example.com",
}));

vi.mock("lucide-react", () => ({
	TriangleAlert: () => <span data-testid="triangle-alert" />,
}));

// ============================================================================
// COMPONENT IMPORT (after mocks)
// ============================================================================

import { ProductList } from "../product-list";
import type { GetProductsReturn } from "@/modules/products/data/get-products";

// ============================================================================
// FIXTURES
// ============================================================================

function makeProduct(id: string) {
	return {
		id,
		slug: `product-${id}`,
		title: `Product ${id}`,
		status: "PUBLIC",
		type: { id: "type-1", label: "Bague", slug: "bague" },
		skus: [],
		collections: [],
		reviewStats: null,
		createdAt: new Date("2025-01-01"),
	};
}

function makeSuccessResult(
	overrides: Partial<{
		products: ReturnType<typeof makeProduct>[];
		totalCount: number;
		suggestion: string | null;
		nextCursor: string | null;
		prevCursor: string | null;
		hasNextPage: boolean;
		hasPreviousPage: boolean;
	}> = {},
): Promise<GetProductsReturn> {
	const products = overrides.products ?? [makeProduct("1"), makeProduct("2")];
	return Promise.resolve({
		products,
		pagination: {
			nextCursor: overrides.nextCursor ?? null,
			prevCursor: overrides.prevCursor ?? null,
			hasNextPage: overrides.hasNextPage ?? false,
			hasPreviousPage: overrides.hasPreviousPage ?? false,
		},
		totalCount: overrides.totalCount ?? products.length,
		suggestion: overrides.suggestion ?? null,
	} as unknown as GetProductsReturn);
}

function makeErrorResult(): Promise<GetProductsReturn> {
	return Promise.resolve({
		error: "Failed to fetch products",
		products: [],
		pagination: {
			nextCursor: null,
			prevCursor: null,
			hasNextPage: false,
			hasPreviousPage: false,
		},
		totalCount: 0,
		suggestion: null,
	} as unknown as GetProductsReturn);
}

// ============================================================================
// HELPERS
// ============================================================================

async function renderList(props: Parameters<typeof ProductList>[0], promise?: Promise<unknown>) {
	let result!: ReturnType<typeof render>;
	await act(async () => {
		result = render(
			<Suspense fallback={<div data-testid="loading" />}>
				<ProductList {...props} />
			</Suspense>,
		);
		await props.productsPromise;
		if (promise) await promise;
	});
	return result;
}

// ============================================================================
// TESTS
// ============================================================================

afterEach(() => {
	cleanup();
	vi.resetAllMocks();
});

describe("ProductList", () => {
	describe("error state", () => {
		it("shows a destructive alert when the result contains an error", async () => {
			await renderList({ productsPromise: makeErrorResult(), perPage: 24 });
			expect(screen.getByTestId("alert")).toHaveAttribute("data-variant", "destructive");
		});

		it("shows the error message text in the alert", async () => {
			await renderList({ productsPromise: makeErrorResult(), perPage: 24 });
			expect(screen.getByText(/erreur est survenue/i)).toBeInTheDocument();
		});

		it("shows the RefreshButton in the error alert", async () => {
			await renderList({ productsPromise: makeErrorResult(), perPage: 24 });
			expect(screen.getByTestId("refresh-button")).toBeInTheDocument();
		});
	});

	describe("empty state", () => {
		it("shows SearchFallbackSuggestions when products array is empty", async () => {
			await renderList({
				productsPromise: makeSuccessResult({ products: [], totalCount: 0 }),
				perPage: 24,
			});
			expect(screen.getByTestId("search-fallback-suggestions")).toBeInTheDocument();
		});

		it("passes searchTerm to SearchFallbackSuggestions", async () => {
			await renderList({
				productsPromise: makeSuccessResult({ products: [], totalCount: 0 }),
				perPage: 24,
				searchTerm: "argent",
			});
			expect(screen.getByTestId("search-fallback-suggestions")).toHaveAttribute(
				"data-search-term",
				"argent",
			);
		});

		it("passes suggestion to SearchFallbackSuggestions", async () => {
			await renderList({
				productsPromise: makeSuccessResult({ products: [], totalCount: 0, suggestion: "bagues" }),
				perPage: 24,
			});
			expect(screen.getByTestId("search-fallback-suggestions")).toHaveAttribute(
				"data-suggestion",
				"bagues",
			);
		});
	});

	describe("product grid", () => {
		it("renders a product card for each product", async () => {
			await renderList({ productsPromise: makeSuccessResult(), perPage: 24 });
			expect(screen.getByTestId("product-card-1")).toBeInTheDocument();
			expect(screen.getByTestId("product-card-2")).toBeInTheDocument();
		});

		it("renders the product grid with correct aria-label", async () => {
			await renderList({ productsPromise: makeSuccessResult(), perPage: 24 });
			expect(screen.getByRole("list", { name: "Liste des produits" })).toBeInTheDocument();
		});

		it("shows total count in the result counter", async () => {
			await renderList({ productsPromise: makeSuccessResult({ totalCount: 42 }), perPage: 24 });
			expect(screen.getByText("42")).toBeInTheDocument();
		});

		it('uses "produit" singular when totalCount is 1', async () => {
			await renderList({
				productsPromise: makeSuccessResult({ products: [makeProduct("1")], totalCount: 1 }),
				perPage: 24,
			});
			expect(screen.getByText("produit")).toBeInTheDocument();
		});

		it('uses "produits" plural when totalCount > 1', async () => {
			await renderList({ productsPromise: makeSuccessResult({ totalCount: 5 }), perPage: 24 });
			expect(screen.getByText("produits")).toBeInTheDocument();
		});

		it("renders each product card in its own list item", async () => {
			// `<li>` natifs depuis la conversion de StaggerGrid en `as="ul" itemAs="li"`
			// (react-doctor prefer-tag-over-role) : plus de `role="listitem"` explicite.
			const { container } = await renderList({
				productsPromise: makeSuccessResult(),
				perPage: 24,
			});
			expect(container.querySelectorAll("li")).toHaveLength(2);
		});

		it("passes correct index to each ProductCard", async () => {
			await renderList({ productsPromise: makeSuccessResult(), perPage: 24 });
			expect(screen.getByTestId("product-card-1")).toHaveAttribute("data-index", "0");
			expect(screen.getByTestId("product-card-2")).toHaveAttribute("data-index", "1");
		});
	});

	describe("wishlist integration", () => {
		it("marks product as in wishlist when its id is in the wishlist set", async () => {
			const wishlistPromise = Promise.resolve(new Set(["1"]));
			await renderList(
				{
					productsPromise: makeSuccessResult(),
					perPage: 24,
					wishlistProductIdsPromise: wishlistPromise,
				},
				wishlistPromise,
			);
			expect(screen.getByTestId("product-card-1")).toHaveAttribute("data-in-wishlist", "true");
		});

		it("marks product as not in wishlist when id is absent from wishlist set", async () => {
			const wishlistPromise = Promise.resolve(new Set(["999"]));
			await renderList(
				{
					productsPromise: makeSuccessResult(),
					perPage: 24,
					wishlistProductIdsPromise: wishlistPromise,
				},
				wishlistPromise,
			);
			expect(screen.getByTestId("product-card-1")).toHaveAttribute("data-in-wishlist", "false");
		});

		it("defaults to empty wishlist set when no wishlistProductIdsPromise is provided", async () => {
			await renderList({ productsPromise: makeSuccessResult(), perPage: 24 });
			expect(screen.getByTestId("product-card-1")).toHaveAttribute("data-in-wishlist", "false");
		});
	});

	describe("preferOnSale", () => {
		it("passes preferOnSale=true to all product cards", async () => {
			await renderList({
				productsPromise: makeSuccessResult(),
				perPage: 24,
				preferOnSale: true,
			});
			expect(screen.getByTestId("product-card-1")).toHaveAttribute("data-prefer-on-sale", "true");
		});

		it("does not pass preferOnSale when not set", async () => {
			await renderList({ productsPromise: makeSuccessResult(), perPage: 24 });
			// When preferOnSale is undefined, the attribute should not be present or be "false"
			const card = screen.getByTestId("product-card-1");
			const val = card.getAttribute("data-prefer-on-sale");
			expect(val === null || val === "false").toBe(true);
		});
	});

	describe("pagination", () => {
		it("renders CursorPagination", async () => {
			await renderList({ productsPromise: makeSuccessResult(), perPage: 24 });
			expect(screen.getByTestId("cursor-pagination")).toBeInTheDocument();
		});

		it("passes perPage to CursorPagination", async () => {
			await renderList({ productsPromise: makeSuccessResult(), perPage: 48 });
			expect(screen.getByTestId("cursor-pagination")).toHaveAttribute("data-per-page", "48");
		});

		it("passes hasNextPage=true when next page exists", async () => {
			await renderList({
				productsPromise: makeSuccessResult({ hasNextPage: true, nextCursor: "cursor-abc" }),
				perPage: 24,
			});
			const pagination = screen.getByTestId("cursor-pagination");
			expect(pagination).toHaveAttribute("data-has-next", "true");
			expect(pagination).toHaveAttribute("data-next-cursor", "cursor-abc");
		});

		it("passes hasPreviousPage=true when previous page exists", async () => {
			await renderList({
				productsPromise: makeSuccessResult({ hasPreviousPage: true, prevCursor: "cursor-xyz" }),
				perPage: 24,
			});
			const pagination = screen.getByTestId("cursor-pagination");
			expect(pagination).toHaveAttribute("data-has-prev", "true");
			expect(pagination).toHaveAttribute("data-prev-cursor", "cursor-xyz");
		});
	});

	describe("search correction suggestion", () => {
		it("shows SearchCorrectionSuggestion when suggestion is present", async () => {
			await renderList({
				productsPromise: makeSuccessResult({ suggestion: "colliers" }),
				perPage: 24,
			});
			expect(screen.getByTestId("search-correction-suggestion")).toHaveTextContent("colliers");
		});

		it("does not show SearchCorrectionSuggestion when no suggestion", async () => {
			await renderList({
				productsPromise: makeSuccessResult({ suggestion: null }),
				perPage: 24,
			});
			expect(screen.queryByTestId("search-correction-suggestion")).not.toBeInTheDocument();
		});
	});

	// Ce composant n'émet PLUS de JSON-LD. Il produisait un `ItemList`
	// (`numberOfItems: totalCount`) alors que les trois pages qui le montent en émettent
	// déjà un, imbriqué dans leur `CollectionPage` via `mainEntity` — deux `ItemList` aux
	// comptages divergents sur une même URL. L'émetteur de page a été conservé (forme
	// attendue sur une page de catégorie), celui-ci retiré.
	//
	// Les 6 tests qui décrivaient l'ancien balisage ont été remplacés par l'assertion
	// inverse. Le pendant statique, qui vérifie aussi que les pages passent bien
	// `noStructuredData` à leur PageHeader, est dans
	// `shared/components/__tests__/catalogue-single-breadcrumb.regression.test.ts`.
	describe("JSON-LD structured data", () => {
		it("n'émet aucun script JSON-LD (l'ItemList appartient à la page)", async () => {
			const { container } = await renderList({
				productsPromise: makeSuccessResult({ totalCount: 2 }),
				perPage: 24,
			});

			expect(container.querySelectorAll('script[type="application/ld+json"]')).toHaveLength(0);
		});
	});
});
