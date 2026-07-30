import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const { mockGetRelatedProducts, mockGetWishlistProductIds } = vi.hoisted(() => ({
	mockGetRelatedProducts: vi.fn(),
	mockGetWishlistProductIds: vi.fn(),
}));

vi.mock("@/modules/products/data/get-related-products", () => ({
	getRelatedProducts: mockGetRelatedProducts,
}));

vi.mock("@/modules/wishlist/data/get-wishlist-product-ids", () => ({
	getWishlistProductIds: mockGetWishlistProductIds,
}));

vi.mock("@/modules/products/components/product-card", () => ({
	ProductCard: ({
		product,
		isInWishlist,
		sectionId,
	}: {
		product: { id: string; title: string };
		isInWishlist: boolean;
		sectionId: string;
	}) => (
		<div
			data-testid={`product-card-${product.id}`}
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

vi.mock("@/shared/components/ui/separator", () => ({
	Separator: ({ className }: { className?: string }) => (
		<hr data-testid="separator" className={className} />
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

// ---------------------------------------------------------------------------
// Import under test (after mocks)
// ---------------------------------------------------------------------------

import { CartRecommendations } from "../cart-recommendations";

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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("CartRecommendations", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockGetWishlistProductIds.mockResolvedValue(new Set<string>());
	});

	describe("empty state", () => {
		it("returns null when recommendations is empty", async () => {
			mockGetRelatedProducts.mockResolvedValue([]);

			const result = await CartRecommendations({});

			expect(result).toBeNull();
		});

		it("renders nothing to the DOM when no recommendations", async () => {
			mockGetRelatedProducts.mockResolvedValue([]);

			const result = await CartRecommendations({});
			// null means no DOM node is rendered
			expect(result).toBeNull();
		});
	});

	describe("happy path", () => {
		it("renders the section heading 'Vous pourriez aimer'", async () => {
			mockGetRelatedProducts.mockResolvedValue([createProduct()]);

			render(await CartRecommendations({}));

			expect(screen.getByRole("heading", { name: "Vous pourriez aimer" })).toBeInTheDocument();
		});

		it("renders the section description", async () => {
			mockGetRelatedProducts.mockResolvedValue([createProduct()]);

			render(await CartRecommendations({}));

			expect(
				screen.getByText("Des créations sélectionnées pour compléter votre commande"),
			).toBeInTheDocument();
		});

		it("renders a separator", async () => {
			mockGetRelatedProducts.mockResolvedValue([createProduct()]);

			render(await CartRecommendations({}));

			expect(screen.getByTestId("separator")).toBeInTheDocument();
		});

		it("renders an aside with correct aria-labelledby", async () => {
			mockGetRelatedProducts.mockResolvedValue([createProduct()]);

			const { container } = render(await CartRecommendations({}));

			const aside = container.querySelector("aside");
			expect(aside).not.toBeNull();
			expect(aside?.getAttribute("aria-labelledby")).toBe("cart-recommendations-heading");
		});

		it("renders a ProductCard for each recommendation", async () => {
			const products = [
				createProduct({ id: "prod-1", title: "Bague Lune" }),
				createProduct({ id: "prod-2", title: "Collier Soleil" }),
				createProduct({ id: "prod-3", title: "Bracelet Étoile" }),
			];
			mockGetRelatedProducts.mockResolvedValue(products);

			render(await CartRecommendations({}));

			expect(screen.getByTestId("product-card-prod-1")).toBeInTheDocument();
			expect(screen.getByTestId("product-card-prod-2")).toBeInTheDocument();
			expect(screen.getByTestId("product-card-prod-3")).toBeInTheDocument();
		});

		it("passes sectionId='cart-reco' to each ProductCard", async () => {
			mockGetRelatedProducts.mockResolvedValue([createProduct({ id: "prod-1" })]);

			render(await CartRecommendations({}));

			expect(screen.getByTestId("product-card-prod-1")).toHaveAttribute(
				"data-section-id",
				"cart-reco",
			);
		});
	});

	describe("CTA link", () => {
		it("shows 'Découvrir toutes les créations' link when results reach the limit", async () => {
			const products = Array.from({ length: 4 }, (_, i) => createProduct({ id: `prod-${i + 1}` }));
			mockGetRelatedProducts.mockResolvedValue(products);

			render(await CartRecommendations({}));

			const link = screen.getByRole("link", { name: /Découvrir toutes les créations/ });
			expect(link).toBeInTheDocument();
			expect(link).toHaveAttribute("href", "/produits");
		});

		it("does not show the CTA link when results are fewer than the limit", async () => {
			const products = Array.from({ length: 2 }, (_, i) => createProduct({ id: `prod-${i + 1}` }));
			mockGetRelatedProducts.mockResolvedValue(products);

			render(await CartRecommendations({}));

			expect(
				screen.queryByRole("link", { name: /Découvrir toutes les créations/ }),
			).not.toBeInTheDocument();
		});

		it("respects a custom limit when deciding to show the CTA", async () => {
			const products = Array.from({ length: 6 }, (_, i) => createProduct({ id: `prod-${i + 1}` }));
			mockGetRelatedProducts.mockResolvedValue(products);

			render(await CartRecommendations({ limit: 6 }));

			expect(
				screen.getByRole("link", { name: /Découvrir toutes les créations/ }),
			).toBeInTheDocument();
		});
	});

	describe("wishlist integration", () => {
		it("marks product as in-wishlist when its id is in the wishlist set", async () => {
			mockGetRelatedProducts.mockResolvedValue([createProduct({ id: "prod-1" })]);
			mockGetWishlistProductIds.mockResolvedValue(new Set(["prod-1"]));

			render(await CartRecommendations({}));

			expect(screen.getByTestId("product-card-prod-1")).toHaveAttribute("data-in-wishlist", "true");
		});

		it("marks product as not in-wishlist when its id is absent from the wishlist set", async () => {
			mockGetRelatedProducts.mockResolvedValue([createProduct({ id: "prod-1" })]);
			mockGetWishlistProductIds.mockResolvedValue(new Set(["prod-99"]));

			render(await CartRecommendations({}));

			expect(screen.getByTestId("product-card-prod-1")).toHaveAttribute(
				"data-in-wishlist",
				"false",
			);
		});
	});

	describe("limit prop", () => {
		it("passes the limit to getRelatedProducts", async () => {
			mockGetRelatedProducts.mockResolvedValue([]);

			await CartRecommendations({ limit: 6 });

			expect(mockGetRelatedProducts).toHaveBeenCalledWith({ limit: 6 });
		});

		it("uses default limit of 4 when no limit is provided", async () => {
			mockGetRelatedProducts.mockResolvedValue([]);

			await CartRecommendations({});

			expect(mockGetRelatedProducts).toHaveBeenCalledWith({ limit: 4 });
		});
	});

	describe("data fetching", () => {
		it("fetches recommendations and wishlist in parallel", async () => {
			mockGetRelatedProducts.mockResolvedValue([]);

			await CartRecommendations({});

			expect(mockGetRelatedProducts).toHaveBeenCalledOnce();
			expect(mockGetWishlistProductIds).toHaveBeenCalledOnce();
		});
	});
});
