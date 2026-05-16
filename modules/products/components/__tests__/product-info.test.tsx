import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Stub next/link
vi.mock("next/link", () => ({
	default: ({
		href,
		children,
		...rest
	}: {
		href: string;
		children: React.ReactNode;
		[key: string]: unknown;
	}) => (
		<a href={href} {...rest}>
			{children}
		</a>
	),
}));

// Stub WishlistButton — not under test
vi.mock("@/modules/wishlist/components/wishlist-button", () => ({
	WishlistButton: ({
		productId,
		isInWishlist,
	}: {
		productId: string;
		productTitle: string;
		isInWishlist: boolean;
		size?: string;
	}) => (
		<button data-testid="wishlist-btn" data-product-id={productId} aria-pressed={isInWishlist}>
			{isInWishlist ? "Dans les favoris" : "Ajouter aux favoris"}
		</button>
	),
}));

// Stub ShareButton — not under test
vi.mock("@/modules/products/components/share-button", () => ({
	ShareButton: () => <button data-testid="share-btn">Partager</button>,
}));

// Stub ReviewRatingLink — not under test
vi.mock("@/modules/reviews/components/review-rating-link", () => ({
	ReviewRatingLink: ({ stats }: { stats: { averageRating: number; totalCount: number } }) => (
		<a href="#reviews" data-testid="review-rating-link">
			{stats.averageRating} / 5 ({stats.totalCount} avis)
		</a>
	),
}));

// Stub Badge
vi.mock("@/shared/components/ui/badge", () => ({
	Badge: ({ children }: { children: React.ReactNode; [key: string]: unknown }) => (
		<span data-testid="badge">{children}</span>
	),
}));

// Stub animations — HandDrawnAccent uses framer-motion useInView (IntersectionObserver)
vi.mock("@/shared/components/animations", () => ({
	HandDrawnAccent: () => null,
}));

import { ProductInfo } from "../product-info";
import type { GetProductReturn } from "@/modules/products/types/product.types";
import type { ProductReviewStatistics } from "@/modules/reviews/types/review.types";

afterEach(cleanup);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeProduct(overrides: Partial<GetProductReturn> = {}): GetProductReturn {
	return {
		id: "prod-1",
		title: "Collier Étoile",
		slug: "collier-etoile",
		type: null,
		skus: [],
		collections: [],
		...overrides,
	} as unknown as GetProductReturn;
}

function makeReviewStats(
	overrides: Partial<ProductReviewStatistics> = {},
): ProductReviewStatistics {
	return {
		totalCount: 8,
		averageRating: 4.5,
		...overrides,
	} as unknown as ProductReviewStatistics;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("ProductInfo", () => {
	it("renders the product title", () => {
		render(<ProductInfo product={makeProduct()} />);

		// Le titre apparait dans deux endroits : h1 sr-only mobile + p[itemprop=name] visuel
		expect(screen.getAllByText("Collier Étoile").length).toBeGreaterThan(0);
	});

	it("renders the product type badge when a type is provided", () => {
		const product = makeProduct({
			type: { id: "t1", label: "Collier", slug: "collier" } as GetProductReturn["type"],
		});

		render(<ProductInfo product={product} />);

		expect(screen.getByTestId("badge")).toHaveTextContent("Collier");
	});

	it("does not render a type badge when type is null", () => {
		render(<ProductInfo product={makeProduct({ type: null })} />);

		expect(screen.queryByTestId("badge")).not.toBeInTheDocument();
	});

	it("renders the review rating link when reviewStats are provided", () => {
		render(<ProductInfo product={makeProduct()} reviewStats={makeReviewStats()} />);

		expect(screen.getAllByTestId("review-rating-link")).toHaveLength(2); // mobile + desktop
	});

	it("does not render the review rating link when reviewStats is not provided", () => {
		render(<ProductInfo product={makeProduct()} />);

		expect(screen.queryByTestId("review-rating-link")).not.toBeInTheDocument();
	});

	it("renders the wishlist button with the correct product id", () => {
		render(<ProductInfo product={makeProduct()} />);

		const wishlistBtns = screen.getAllByTestId("wishlist-btn");
		expect(wishlistBtns.length).toBeGreaterThan(0);
		expect(wishlistBtns[0]).toHaveAttribute("data-product-id", "prod-1");
	});

	it("reflects the isInWishlist state on the wishlist button", () => {
		render(<ProductInfo product={makeProduct()} isInWishlist={true} />);

		const wishlistBtns = screen.getAllByTestId("wishlist-btn");
		expect(wishlistBtns[0]).toHaveAttribute("aria-pressed", "true");
	});

	it("renders the share button", () => {
		render(<ProductInfo product={makeProduct()} />);

		const shareBtns = screen.getAllByTestId("share-btn");
		expect(shareBtns.length).toBeGreaterThan(0);
	});

	it("exposes a sr-only h1 with the product title (mobile-first indexing fallback)", () => {
		render(<ProductInfo product={makeProduct()} />);

		const heading = screen.getByRole("heading", { level: 1, name: "Collier Étoile" });
		expect(heading).toHaveClass("sr-only");
	});

	it("renders the « Fait main en France » trust badge above-the-fold", () => {
		render(<ProductInfo product={makeProduct()} />);

		expect(screen.getByText("Fait main en France")).toBeInTheDocument();
	});
});
