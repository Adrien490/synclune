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

import { ReviewSummaryCompact } from "../review-summary-compact";
import type { ProductReviewStatistics } from "@/modules/reviews/types/review.types";

function createStats(overrides: Partial<ProductReviewStatistics> = {}): ProductReviewStatistics {
	return {
		totalCount: 8,
		averageRating: 4.3,
		distribution: [],
		...overrides,
	};
}

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("ReviewSummaryCompact", () => {
	it("returns null when totalCount is 0", () => {
		const { container } = render(<ReviewSummaryCompact stats={createStats({ totalCount: 0 })} />);
		expect(container.firstChild).toBeNull();
	});

	it("renders when totalCount > 0", () => {
		render(<ReviewSummaryCompact stats={createStats()} />);
		expect(screen.getByTestId("rating-stars")).toBeInTheDocument();
	});

	it("renders the average rating text", () => {
		render(<ReviewSummaryCompact stats={createStats({ averageRating: 4.3 })} />);
		expect(screen.getByText("4.3")).toBeInTheDocument();
	});

	it("renders the review count in parentheses", () => {
		render(<ReviewSummaryCompact stats={createStats({ totalCount: 8 })} />);
		expect(screen.getByText("(8 avis)")).toBeInTheDocument();
	});

	it("renders with descriptive aria-label", () => {
		render(<ReviewSummaryCompact stats={createStats({ averageRating: 4.3, totalCount: 8 })} />);
		const wrapper = document.querySelector("[aria-label]");
		expect(wrapper?.getAttribute("aria-label")).toContain("4.3");
		expect(wrapper?.getAttribute("aria-label")).toContain("8 avis");
	});
});
