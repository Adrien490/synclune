import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({}));

vi.mock("@/shared/components/ui/empty", () => ({
	Empty: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<div data-testid="empty" className={className}>
			{children}
		</div>
	),
	EmptyHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	EmptyMedia: ({ children }: { children: React.ReactNode; variant?: string }) => (
		<div>{children}</div>
	),
	EmptyTitle: ({ children }: { children: React.ReactNode }) => (
		<p data-testid="empty-title">{children}</p>
	),
	EmptyContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	EmptyActions: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		asChild,
		variant,
	}: {
		children: React.ReactNode;
		asChild?: boolean;
		variant?: string;
	}) => (
		<button data-variant={variant} data-as-child={asChild}>
			{children}
		</button>
	),
}));

vi.mock("next/link", () => ({
	default: ({ children, href }: { children: React.ReactNode; href: string }) => (
		<a href={href}>{children}</a>
	),
}));

vi.mock("lucide-react", () => ({
	MessageSquare: () => <svg data-testid="icon-message-square" />,
	Filter: () => <svg data-testid="icon-filter" />,
}));

vi.mock("../review-card", () => ({
	ReviewCard: ({ review }: { review: { id: string } }) => (
		<div data-testid="review-card" data-review-id={review.id} />
	),
}));

vi.mock("../review-filter-reset-button", () => ({
	ReviewFilterResetButton: () => (
		<button data-testid="filter-reset-button">Voir tous les avis</button>
	),
}));

vi.mock("../review-photos-gallery", () => ({
	ReviewPhotosGallery: ({ reviews }: { reviews: unknown[] }) => (
		<div data-testid="review-photos-gallery" data-count={reviews.length} />
	),
}));

vi.mock("../review-summary", () => ({
	ReviewSummary: ({ stats }: { stats: { totalCount: number } }) => (
		<div data-testid="review-summary" data-total={stats.totalCount} />
	),
}));

vi.mock("../review-sort-select", () => ({
	ReviewSortSelect: () => <div data-testid="review-sort-select" />,
}));

vi.mock("../reviews-load-more", () => ({
	ReviewsLoadMore: ({ productId }: { productId: string }) => (
		<div data-testid="reviews-load-more" data-product-id={productId} />
	),
}));

import { ReviewsList } from "../reviews-list";
import type { ReviewPublic, ProductReviewStatistics } from "@/modules/reviews/types/review.types";

// ============================================================================
// HELPERS
// ============================================================================

function createStats(overrides: Partial<ProductReviewStatistics> = {}): ProductReviewStatistics {
	return {
		totalCount: 5,
		averageRating: 4.2,
		distribution: [],
		...overrides,
	};
}

function createReview(id: string): ReviewPublic {
	return {
		id,
		rating: 4,
		title: null,
		content: "Très bien",
		createdAt: new Date("2026-01-01"),
		user: { name: "Alice", image: null },
		medias: [],
		response: null,
	};
}

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("ReviewsList", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders empty state when no reviews and totalCount is 0", () => {
		render(
			<ReviewsList initialReviews={[]} stats={createStats({ totalCount: 0 })} totalCount={0} />,
		);
		expect(screen.getByTestId("empty")).toBeInTheDocument();
		expect(screen.getByText("Aucun avis pour le moment")).toBeInTheDocument();
	});

	it("shows CTA to login when not authenticated and no reviews", () => {
		render(
			<ReviewsList
				initialReviews={[]}
				stats={createStats({ totalCount: 0 })}
				totalCount={0}
				isAuthenticated={false}
			/>,
		);
		expect(screen.queryByText("Donner mon avis")).toBeNull();
	});

	it("shows CTA 'Donner mon avis' when authenticated and no reviews", () => {
		render(
			<ReviewsList
				initialReviews={[]}
				stats={createStats({ totalCount: 0 })}
				totalCount={0}
				isAuthenticated={true}
			/>,
		);
		expect(screen.getByText("Donner mon avis")).toBeInTheDocument();
	});

	it("renders filtered empty state when filter is active and no reviews match", () => {
		render(
			<ReviewsList
				initialReviews={[]}
				stats={createStats({ totalCount: 5 })}
				totalCount={0}
				ratingFilter={1}
			/>,
		);
		expect(screen.getByText("Aucun avis à 1 étoile")).toBeInTheDocument();
		expect(screen.getByTestId("filter-reset-button")).toBeInTheDocument();
	});

	it("renders review cards when reviews are provided", () => {
		render(
			<ReviewsList
				initialReviews={[createReview("r1"), createReview("r2")]}
				stats={createStats()}
				totalCount={2}
			/>,
		);
		const cards = screen.getAllByTestId("review-card");
		expect(cards.length).toBe(2);
	});

	it("renders review summary", () => {
		render(
			<ReviewsList initialReviews={[createReview("r1")]} stats={createStats()} totalCount={1} />,
		);
		expect(screen.getByTestId("review-summary")).toBeInTheDocument();
	});

	it("renders photos gallery when not filtered", () => {
		render(
			<ReviewsList initialReviews={[createReview("r1")]} stats={createStats()} totalCount={1} />,
		);
		expect(screen.getByTestId("review-photos-gallery")).toBeInTheDocument();
	});

	it("does not render photos gallery when filtered", () => {
		render(
			<ReviewsList
				initialReviews={[createReview("r1")]}
				stats={createStats()}
				totalCount={1}
				ratingFilter={4}
			/>,
		);
		expect(screen.queryByTestId("review-photos-gallery")).toBeNull();
	});

	it("renders load more when productId is provided", () => {
		render(
			<ReviewsList
				initialReviews={[createReview("r1")]}
				stats={createStats()}
				totalCount={1}
				productId="prod-1"
				hasMore={true}
				nextCursor="cursor-abc"
			/>,
		);
		expect(screen.getByTestId("reviews-load-more")).toBeInTheDocument();
	});

	it("does not render load more when no productId", () => {
		render(
			<ReviewsList initialReviews={[createReview("r1")]} stats={createStats()} totalCount={1} />,
		);
		expect(screen.queryByTestId("reviews-load-more")).toBeNull();
	});

	it("shows filter indicator when ratingFilter is active", () => {
		render(
			<ReviewsList
				initialReviews={[createReview("r1")]}
				stats={createStats()}
				totalCount={1}
				ratingFilter={4}
			/>,
		);
		expect(screen.getByRole("status")).toHaveTextContent(/étoile/);
	});

	it("renders the feed region", () => {
		render(
			<ReviewsList initialReviews={[createReview("r1")]} stats={createStats()} totalCount={1} />,
		);
		expect(screen.getByRole("feed")).toBeInTheDocument();
	});
});
