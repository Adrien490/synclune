import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({}));

vi.mock("@/shared/components/ui/skeleton", () => ({
	Skeleton: ({ className }: { className?: string }) => (
		<div data-testid="skeleton" className={className} />
	),
}));

vi.mock("../reviews-list", () => ({
	ReviewsList: ({
		initialReviews,
		productId,
	}: {
		initialReviews: unknown[];
		stats: unknown;
		productId?: string;
		nextCursor?: string | null;
		hasMore?: boolean;
		totalCount: number;
		ratingFilter?: number;
		sortBy?: string;
		isAuthenticated?: boolean;
	}) => (
		<div
			data-testid="reviews-list"
			data-review-count={initialReviews.length}
			data-product-id={productId}
		/>
	),
}));

vi.mock("../review-summary-compact", () => ({
	ReviewSummaryCompact: ({ stats }: { stats: { totalCount: number } }) => (
		<div data-testid="review-summary-compact" data-total={stats.totalCount} />
	),
}));

import { ProductReviewsSectionSkeleton } from "../product-reviews-section";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("ProductReviewsSectionSkeleton", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders without error", () => {
		render(<ProductReviewsSectionSkeleton />);
		expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
	});

	it("renders with aria-busy='true'", () => {
		render(<ProductReviewsSectionSkeleton />);
		const section = document.querySelector("[aria-busy='true']");
		expect(section).not.toBeNull();
	});

	it("renders with aria-label 'Chargement des avis'", () => {
		render(<ProductReviewsSectionSkeleton />);
		expect(screen.getByLabelText("Chargement des avis")).toBeInTheDocument();
	});

	it("renders 5 distribution skeleton bars", () => {
		render(<ProductReviewsSectionSkeleton />);
		// 5 rows in the distribution section + other skeletons
		const skeletons = screen.getAllByTestId("skeleton");
		expect(skeletons.length).toBeGreaterThanOrEqual(5);
	});

	it("renders 3 review card skeletons", () => {
		render(<ProductReviewsSectionSkeleton />);
		// 3 rounded border skeleton cards
		const cards = document.querySelectorAll(".space-y-4.rounded-lg.border.p-4");
		expect(cards.length).toBe(3);
	});
});
