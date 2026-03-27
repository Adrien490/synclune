import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const { mockGetRecentProducts, mockGetWishlistProductIds } = vi.hoisted(() => ({
	mockGetRecentProducts: vi.fn(),
	mockGetWishlistProductIds: vi.fn(),
}));

vi.mock("@/modules/products/data/get-recent-products", () => ({
	getRecentProducts: mockGetRecentProducts,
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

vi.mock("@/shared/components/animations", () => ({
	Reveal: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	Stagger: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<div className={className}>{children}</div>
	),
}));

// ---------------------------------------------------------------------------
// Import under test (after mocks)
// ---------------------------------------------------------------------------

import { RecentlyViewedProducts } from "../recently-viewed-products";

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
		reviewStats: null,
		createdAt: new Date("2025-01-01"),
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("RecentlyViewedProducts", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockGetWishlistProductIds.mockResolvedValue(new Set<string>());
	});

	describe("empty state", () => {
		it("returns null when no recent products", async () => {
			mockGetRecentProducts.mockResolvedValue([]);

			const result = await RecentlyViewedProducts({ currentProductSlug: "bague-lune" });

			expect(result).toBeNull();
		});
	});

	describe("happy path", () => {
		it("renders the section heading 'Récemment vus'", async () => {
			mockGetRecentProducts.mockResolvedValue([createProduct()]);

			render(await RecentlyViewedProducts({ currentProductSlug: "bague-lune" }));

			expect(screen.getByRole("heading", { name: "Récemment vus" })).toBeInTheDocument();
		});

		it("renders an aside with correct aria-labelledby", async () => {
			mockGetRecentProducts.mockResolvedValue([createProduct()]);

			const { container } = render(
				await RecentlyViewedProducts({ currentProductSlug: "bague-lune" }),
			);

			const aside = container.querySelector("aside");
			expect(aside).not.toBeNull();
			expect(aside?.getAttribute("aria-labelledby")).toBe("recently-viewed-heading");
		});

		it("renders a ProductCard for each recent product", async () => {
			const products = [
				createProduct({ id: "prod-1", title: "Bague Lune" }),
				createProduct({ id: "prod-2", title: "Collier Soleil" }),
			];
			mockGetRecentProducts.mockResolvedValue(products);

			render(await RecentlyViewedProducts({ currentProductSlug: "bague-lune" }));

			expect(screen.getByTestId("product-card-prod-1")).toBeInTheDocument();
			expect(screen.getByTestId("product-card-prod-2")).toBeInTheDocument();
		});

		it("passes correct index to each ProductCard", async () => {
			const products = [
				createProduct({ id: "prod-1" }),
				createProduct({ id: "prod-2" }),
				createProduct({ id: "prod-3" }),
			];
			mockGetRecentProducts.mockResolvedValue(products);

			render(await RecentlyViewedProducts({ currentProductSlug: "bague-lune" }));

			expect(screen.getByTestId("product-card-prod-1")).toHaveAttribute("data-index", "0");
			expect(screen.getByTestId("product-card-prod-2")).toHaveAttribute("data-index", "1");
			expect(screen.getByTestId("product-card-prod-3")).toHaveAttribute("data-index", "2");
		});

		it("passes sectionId='recent' to each ProductCard", async () => {
			mockGetRecentProducts.mockResolvedValue([createProduct({ id: "prod-1" })]);

			render(await RecentlyViewedProducts({ currentProductSlug: "bague-lune" }));

			expect(screen.getByTestId("product-card-prod-1")).toHaveAttribute(
				"data-section-id",
				"recent",
			);
		});
	});

	describe("wishlist integration", () => {
		it("marks product as in-wishlist when its id is in the wishlist set", async () => {
			mockGetRecentProducts.mockResolvedValue([createProduct({ id: "prod-1" })]);
			mockGetWishlistProductIds.mockResolvedValue(new Set(["prod-1"]));

			render(await RecentlyViewedProducts({ currentProductSlug: "bague-lune" }));

			expect(screen.getByTestId("product-card-prod-1")).toHaveAttribute("data-in-wishlist", "true");
		});

		it("marks product as not in-wishlist when its id is absent from the wishlist set", async () => {
			mockGetRecentProducts.mockResolvedValue([createProduct({ id: "prod-1" })]);
			mockGetWishlistProductIds.mockResolvedValue(new Set(["prod-99"]));

			render(await RecentlyViewedProducts({ currentProductSlug: "bague-lune" }));

			expect(screen.getByTestId("product-card-prod-1")).toHaveAttribute(
				"data-in-wishlist",
				"false",
			);
		});
	});

	describe("currentProductSlug prop", () => {
		it("passes currentProductSlug as excludeSlug to getRecentProducts", async () => {
			mockGetRecentProducts.mockResolvedValue([]);

			await RecentlyViewedProducts({ currentProductSlug: "collier-or-rose" });

			expect(mockGetRecentProducts).toHaveBeenCalledWith({
				excludeSlug: "collier-or-rose",
				limit: 8,
			});
		});
	});

	describe("limit prop", () => {
		it("passes the limit to getRecentProducts", async () => {
			mockGetRecentProducts.mockResolvedValue([]);

			await RecentlyViewedProducts({ currentProductSlug: "bague-lune", limit: 4 });

			expect(mockGetRecentProducts).toHaveBeenCalledWith({
				excludeSlug: "bague-lune",
				limit: 4,
			});
		});

		it("uses default limit of 8 when no limit is provided", async () => {
			mockGetRecentProducts.mockResolvedValue([]);

			await RecentlyViewedProducts({ currentProductSlug: "bague-lune" });

			expect(mockGetRecentProducts).toHaveBeenCalledWith({
				excludeSlug: "bague-lune",
				limit: 8,
			});
		});
	});

	describe("data fetching", () => {
		it("fetches recent products and wishlist in parallel", async () => {
			mockGetRecentProducts.mockResolvedValue([]);

			await RecentlyViewedProducts({ currentProductSlug: "bague-lune" });

			expect(mockGetRecentProducts).toHaveBeenCalledOnce();
			expect(mockGetWishlistProductIds).toHaveBeenCalledOnce();
		});
	});
});
