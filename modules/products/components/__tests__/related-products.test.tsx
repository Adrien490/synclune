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

vi.mock("@/shared/components/ui/carousel", () => ({
	Carousel: ({
		children,
		className,
		"aria-label": ariaLabel,
	}: {
		children: React.ReactNode;
		className?: string;
		"aria-label"?: string;
	}) => (
		<div data-testid="carousel" className={className} aria-label={ariaLabel}>
			{children}
		</div>
	),
	CarouselContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<div className={className}>{children}</div>
	),
	CarouselItem: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<div className={className}>{children}</div>
	),
	CarouselNext: ({
		className,
		"aria-label": ariaLabel,
	}: {
		className?: string;
		"aria-label"?: string;
	}) => <button data-testid="carousel-next" className={className} aria-label={ariaLabel} />,
	CarouselPrevious: ({
		className,
		"aria-label": ariaLabel,
	}: {
		className?: string;
		"aria-label"?: string;
	}) => <button data-testid="carousel-prev" className={className} aria-label={ariaLabel} />,
	CarouselDots: ({ className }: { className?: string }) => (
		<div data-testid="carousel-dots" className={className} />
	),
}));

// ---------------------------------------------------------------------------
// Import under test (after mocks)
// ---------------------------------------------------------------------------

import { RelatedProducts } from "../related-products";

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

describe("RelatedProducts", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockGetWishlistProductIds.mockResolvedValue(new Set<string>());
	});

	describe("empty state", () => {
		it("returns null when no related products", async () => {
			mockGetRelatedProducts.mockResolvedValue([]);

			const result = await RelatedProducts({ currentProductSlug: "bague-lune" });

			expect(result).toBeNull();
		});
	});

	describe("happy path", () => {
		it("renders the section heading", async () => {
			mockGetRelatedProducts.mockResolvedValue([createProduct()]);

			render(await RelatedProducts({ currentProductSlug: "bague-lune" }));

			expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
		});

		it("renders an aside with correct aria-labelledby", async () => {
			mockGetRelatedProducts.mockResolvedValue([createProduct()]);

			const { container } = render(await RelatedProducts({ currentProductSlug: "bague-lune" }));

			const aside = container.querySelector("aside");
			expect(aside).not.toBeNull();
			expect(aside?.getAttribute("aria-labelledby")).toBe("related-products-heading");
		});

		it("renders a carousel with aria-label", async () => {
			mockGetRelatedProducts.mockResolvedValue([createProduct()]);

			render(await RelatedProducts({ currentProductSlug: "bague-lune" }));

			expect(screen.getByTestId("carousel")).toHaveAttribute(
				"aria-label",
				"Carousel de produits similaires",
			);
		});

		it("renders a ProductCard for each related product", async () => {
			const products = [
				createProduct({ id: "prod-1", title: "Bague Lune" }),
				createProduct({ id: "prod-2", title: "Collier Soleil" }),
				createProduct({ id: "prod-3", title: "Bracelet Étoile" }),
			];
			mockGetRelatedProducts.mockResolvedValue(products);

			render(await RelatedProducts({ currentProductSlug: "bague-lune" }));

			expect(screen.getByTestId("product-card-prod-1")).toBeInTheDocument();
			expect(screen.getByTestId("product-card-prod-2")).toBeInTheDocument();
			expect(screen.getByTestId("product-card-prod-3")).toBeInTheDocument();
		});

		it("passes sectionId='related' to each ProductCard", async () => {
			mockGetRelatedProducts.mockResolvedValue([createProduct({ id: "prod-1" })]);

			render(await RelatedProducts({ currentProductSlug: "bague-lune" }));

			expect(screen.getByTestId("product-card-prod-1")).toHaveAttribute(
				"data-section-id",
				"related",
			);
		});

		it("renders CarouselDots for mobile navigation", async () => {
			mockGetRelatedProducts.mockResolvedValue([createProduct()]);

			render(await RelatedProducts({ currentProductSlug: "bague-lune" }));

			expect(screen.getByTestId("carousel-dots")).toBeInTheDocument();
		});
	});

	describe("navigation arrows", () => {
		it("renders carousel arrows when there are more than 3 related products", async () => {
			const products = Array.from({ length: 4 }, (_, i) =>
				createProduct({ id: `prod-${i + 1}`, title: `Produit ${i + 1}` }),
			);
			mockGetRelatedProducts.mockResolvedValue(products);

			render(await RelatedProducts({ currentProductSlug: "bague-lune" }));

			expect(screen.getByTestId("carousel-prev")).toBeInTheDocument();
			expect(screen.getByTestId("carousel-next")).toBeInTheDocument();
		});

		it("does not render carousel arrows when there are 3 or fewer related products", async () => {
			const products = Array.from({ length: 3 }, (_, i) => createProduct({ id: `prod-${i + 1}` }));
			mockGetRelatedProducts.mockResolvedValue(products);

			render(await RelatedProducts({ currentProductSlug: "bague-lune" }));

			expect(screen.queryByTestId("carousel-prev")).not.toBeInTheDocument();
			expect(screen.queryByTestId("carousel-next")).not.toBeInTheDocument();
		});
	});

	describe("CTA link", () => {
		it("shows 'Découvrir toutes les créations' link when results equal the limit", async () => {
			// Default limit is 8, so return exactly 8 products
			const products = Array.from({ length: 8 }, (_, i) => createProduct({ id: `prod-${i + 1}` }));
			mockGetRelatedProducts.mockResolvedValue(products);

			render(await RelatedProducts({ currentProductSlug: "bague-lune" }));

			const link = screen.getByRole("link", { name: /Découvrir toutes les créations/ });
			expect(link).toBeInTheDocument();
			expect(link).toHaveAttribute("href", "/produits");
		});

		it("does not show the CTA link when results are fewer than the limit", async () => {
			const products = Array.from({ length: 3 }, (_, i) => createProduct({ id: `prod-${i + 1}` }));
			mockGetRelatedProducts.mockResolvedValue(products);

			render(await RelatedProducts({ currentProductSlug: "bague-lune" }));

			expect(
				screen.queryByRole("link", { name: /Découvrir toutes les créations/ }),
			).not.toBeInTheDocument();
		});

		it("shows the CTA link with custom limit when results fill it", async () => {
			const products = Array.from({ length: 4 }, (_, i) => createProduct({ id: `prod-${i + 1}` }));
			mockGetRelatedProducts.mockResolvedValue(products);

			render(await RelatedProducts({ currentProductSlug: "bague-lune", limit: 4 }));

			expect(
				screen.getByRole("link", { name: /Découvrir toutes les créations/ }),
			).toBeInTheDocument();
		});
	});

	describe("wishlist integration", () => {
		it("marks product as in-wishlist when its id is in the wishlist set", async () => {
			mockGetRelatedProducts.mockResolvedValue([createProduct({ id: "prod-1" })]);
			mockGetWishlistProductIds.mockResolvedValue(new Set(["prod-1"]));

			render(await RelatedProducts({ currentProductSlug: "bague-lune" }));

			expect(screen.getByTestId("product-card-prod-1")).toHaveAttribute("data-in-wishlist", "true");
		});

		it("marks product as not in-wishlist when its id is absent from the wishlist set", async () => {
			mockGetRelatedProducts.mockResolvedValue([createProduct({ id: "prod-1" })]);
			mockGetWishlistProductIds.mockResolvedValue(new Set(["prod-99"]));

			render(await RelatedProducts({ currentProductSlug: "bague-lune" }));

			expect(screen.getByTestId("product-card-prod-1")).toHaveAttribute(
				"data-in-wishlist",
				"false",
			);
		});
	});

	describe("currentProductSlug and limit props", () => {
		it("passes currentProductSlug to getRelatedProducts", async () => {
			mockGetRelatedProducts.mockResolvedValue([]);

			await RelatedProducts({ currentProductSlug: "collier-or-rose" });

			expect(mockGetRelatedProducts).toHaveBeenCalledWith({
				currentProductSlug: "collier-or-rose",
				limit: 8,
			});
		});

		it("passes custom limit to getRelatedProducts", async () => {
			mockGetRelatedProducts.mockResolvedValue([]);

			await RelatedProducts({ currentProductSlug: "bague-lune", limit: 6 });

			expect(mockGetRelatedProducts).toHaveBeenCalledWith({
				currentProductSlug: "bague-lune",
				limit: 6,
			});
		});
	});

	describe("data fetching", () => {
		it("fetches related products and wishlist in parallel", async () => {
			mockGetRelatedProducts.mockResolvedValue([]);

			await RelatedProducts({ currentProductSlug: "bague-lune" });

			expect(mockGetRelatedProducts).toHaveBeenCalledOnce();
			expect(mockGetWishlistProductIds).toHaveBeenCalledOnce();
		});
	});
});
