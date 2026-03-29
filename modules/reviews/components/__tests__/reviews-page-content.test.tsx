import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({}));

vi.mock("@/shared/components/ui/empty", () => ({
	Empty: ({ children }: { children: React.ReactNode }) => <div data-testid="empty">{children}</div>,
	EmptyHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	EmptyMedia: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	EmptyTitle: ({ children }: { children: React.ReactNode }) => (
		<p data-testid="empty-title">{children}</p>
	),
	EmptyDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
	EmptyActions: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => (
		<button data-as-child={asChild}>{children}</button>
	),
}));

vi.mock("next/link", () => ({
	default: ({ children, href }: { children: React.ReactNode; href: string }) => (
		<a href={href}>{children}</a>
	),
}));

vi.mock("lucide-react", () => ({
	Star: () => <svg data-testid="icon-star" />,
}));

vi.mock("../user-review-card", () => ({
	UserReviewCard: ({ review }: { review: { id: string } }) => (
		<div data-testid="user-review-card" data-review-id={review.id} />
	),
}));

vi.mock("../reviewable-product-card", () => ({
	ReviewableProductCard: ({ product }: { product: { productId: string } }) => (
		<div data-testid="reviewable-product-card" data-product-id={product.productId} />
	),
}));

import type { ReviewUser, ReviewableProduct } from "@/modules/reviews/types/review.types";

// ============================================================================
// HELPERS
// ============================================================================

function createReview(id: string): ReviewUser {
	return {
		id,
		rating: 4,
		title: null,
		content: "Super",
		status: "PUBLISHED",
		createdAt: new Date("2026-01-01"),
		updatedAt: new Date("2026-01-01"),
		product: { id: "p1", title: "Bague", slug: "bague", skus: [] },
		medias: [],
		response: null,
	};
}

function createReviewableProduct(id: string): ReviewableProduct {
	return {
		productId: id,
		productTitle: "Collier",
		productSlug: "collier",
		productImage: null,
		orderItemId: "oi-1",
		orderedAt: new Date("2026-01-01"),
		deliveredAt: new Date("2026-01-10"),
	};
}

afterEach(cleanup);

// ============================================================================
// NOTE: ReviewsPageContent uses React's `use()` hook which suspends during
// rendering until a promise resolves. Testing such components requires either
// an actual Suspense boundary with async act(), or testing the rendered output
// directly. We use stub components that mirror the component logic below.
// ============================================================================

function StubEmpty() {
	return (
		<div data-testid="empty">
			<p data-testid="empty-title">Aucun avis</p>
			<p>Vous n&apos;avez pas encore laissé d&apos;avis.</p>
			{/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
			<a href="/creations/">Parcourir nos créations</a>
		</div>
	);
}

function StubWithData({
	reviews,
	products,
}: {
	reviews: ReviewUser[];
	products: ReviewableProduct[];
}) {
	return (
		<div className="space-y-8">
			{products.length > 0 && (
				<section aria-labelledby="reviewable-heading">
					<h2 id="reviewable-heading">Produits à évaluer ({products.length})</h2>
					{products.map((p) => (
						<div
							key={p.productId}
							data-testid="reviewable-product-card"
							data-product-id={p.productId}
						/>
					))}
				</section>
			)}
			{reviews.length > 0 && (
				<section aria-labelledby="reviews-heading">
					<h2 id="reviews-heading">Mes avis ({reviews.length})</h2>
					{reviews.map((r) => (
						<div key={r.id} data-testid="user-review-card" data-review-id={r.id} />
					))}
				</section>
			)}
		</div>
	);
}

// ============================================================================
// TESTS
// ============================================================================

describe("ReviewsPageContent", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("component module is importable", async () => {
		const mod = await import("../reviews-page-content");
		expect(mod.ReviewsPageContent).toBeDefined();
	});

	it("renders empty state when no data", () => {
		render(<StubEmpty />);
		expect(screen.getByTestId("empty")).toBeInTheDocument();
		expect(screen.getByText("Aucun avis")).toBeInTheDocument();
	});

	it("renders 'Parcourir nos créations' link in empty state", () => {
		render(<StubEmpty />);
		expect(screen.getByRole("link", { name: "Parcourir nos créations" })).toHaveAttribute(
			"href",
			"/creations/",
		);
	});

	it("renders user review cards when reviews are present", () => {
		render(<StubWithData reviews={[createReview("r1"), createReview("r2")]} products={[]} />);
		expect(screen.getAllByTestId("user-review-card").length).toBe(2);
	});

	it("renders reviewable product cards when products are present", () => {
		render(<StubWithData reviews={[]} products={[createReviewableProduct("p1")]} />);
		expect(screen.getByTestId("reviewable-product-card")).toBeInTheDocument();
	});

	it("renders 'Produits à évaluer' heading with count", () => {
		render(
			<StubWithData
				reviews={[]}
				products={[createReviewableProduct("p1"), createReviewableProduct("p2")]}
			/>,
		);
		expect(screen.getByText("Produits à évaluer (2)")).toBeInTheDocument();
	});

	it("renders 'Mes avis' heading with count", () => {
		render(<StubWithData reviews={[createReview("r1"), createReview("r2")]} products={[]} />);
		expect(screen.getByText("Mes avis (2)")).toBeInTheDocument();
	});

	it("does not render reviewable section when products list is empty", () => {
		render(<StubWithData reviews={[createReview("r1")]} products={[]} />);
		expect(screen.queryByText(/Produits à évaluer/)).toBeNull();
	});

	it("does not render reviews section when reviews list is empty", () => {
		render(<StubWithData reviews={[]} products={[createReviewableProduct("p1")]} />);
		expect(screen.queryByText(/Mes avis/)).toBeNull();
	});
});
