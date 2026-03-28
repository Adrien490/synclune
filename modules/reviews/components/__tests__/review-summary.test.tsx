import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@/shared/utils/rating-utils", () => ({
	formatRating: (rating: number) => rating.toFixed(1),
}));

vi.mock("@/shared/components/rating-stars", () => ({
	RatingStars: ({ rating }: { rating: number; maxRating?: number; size?: string }) => (
		<div data-testid="rating-stars" aria-valuenow={rating} />
	),
}));

vi.mock("../rating-distribution", () => ({
	RatingDistribution: ({ distribution }: { distribution: unknown[] }) => (
		<div data-testid="rating-distribution" data-count={distribution.length} />
	),
}));

import { ReviewSummary } from "../review-summary";
import type { ProductReviewStatistics } from "@/modules/reviews/types/review.types";

// ============================================================================
// HELPERS
// ============================================================================

function createStats(overrides: Partial<ProductReviewStatistics> = {}): ProductReviewStatistics {
	return {
		totalCount: 10,
		averageRating: 4.2,
		distribution: [
			{ rating: 5, count: 6, percentage: 60 },
			{ rating: 4, count: 2, percentage: 20 },
			{ rating: 3, count: 1, percentage: 10 },
			{ rating: 2, count: 1, percentage: 10 },
			{ rating: 1, count: 0, percentage: 0 },
		],
		...overrides,
	};
}

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("ReviewSummary", () => {
	it("renders the average rating", () => {
		render(<ReviewSummary stats={createStats({ averageRating: 4.2 })} />);
		expect(screen.getByText("4.2")).toBeInTheDocument();
	});

	it("renders the total count", () => {
		render(<ReviewSummary stats={createStats({ totalCount: 10 })} />);
		expect(screen.getByText("10 avis")).toBeInTheDocument();
	});

	it("renders rating stars", () => {
		render(<ReviewSummary stats={createStats()} />);
		expect(screen.getByTestId("rating-stars")).toBeInTheDocument();
	});

	it("renders distribution when totalCount >= 5", () => {
		render(<ReviewSummary stats={createStats({ totalCount: 5 })} />);
		expect(screen.getByTestId("rating-distribution")).toBeInTheDocument();
	});

	it("does not render distribution when totalCount < 5", () => {
		render(<ReviewSummary stats={createStats({ totalCount: 4 })} />);
		expect(screen.queryByTestId("rating-distribution")).toBeNull();
	});

	it("has a screen-reader-only heading", () => {
		render(<ReviewSummary stats={createStats()} />);
		expect(screen.getByText("Résumé des avis")).toBeInTheDocument();
	});
});
