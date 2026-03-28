import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({}));

vi.mock("next/link", () => ({
	default: ({
		children,
		href,
		className,
		"aria-label": ariaLabel,
	}: {
		children: React.ReactNode;
		href: string;
		className?: string;
		"aria-label"?: string;
	}) => (
		<a href={href} className={className} aria-label={ariaLabel}>
			{children}
		</a>
	),
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@/shared/utils/rating-utils", () => ({
	formatRating: (rating: number) => rating.toFixed(1),
}));

vi.mock("@/shared/components/rating-stars", () => ({
	RatingStars: ({ rating, ariaLabel }: { rating: number; size?: string; ariaLabel?: string }) => (
		<div data-testid="rating-stars" aria-valuenow={rating} aria-label={ariaLabel} />
	),
}));

import { ReviewRatingLink } from "../review-rating-link";
import type { ProductReviewStatistics } from "@/modules/reviews/types/review.types";

function createStats(overrides: Partial<ProductReviewStatistics> = {}): ProductReviewStatistics {
	return {
		totalCount: 12,
		averageRating: 4.5,
		distribution: [],
		...overrides,
	};
}

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("ReviewRatingLink", () => {
	it("returns null when totalCount is 0", () => {
		const { container } = render(<ReviewRatingLink stats={createStats({ totalCount: 0 })} />);
		expect(container.firstChild).toBeNull();
	});

	it("renders a link when totalCount > 0", () => {
		render(<ReviewRatingLink stats={createStats()} />);
		expect(screen.getByRole("link")).toBeInTheDocument();
	});

	it("links to #reviews anchor", () => {
		render(<ReviewRatingLink stats={createStats()} />);
		expect(screen.getByRole("link")).toHaveAttribute("href", "#reviews");
	});

	it("renders the average rating text", () => {
		render(<ReviewRatingLink stats={createStats({ averageRating: 4.5 })} />);
		expect(screen.getByText("4.5")).toBeInTheDocument();
	});

	it("renders the review count", () => {
		render(<ReviewRatingLink stats={createStats({ totalCount: 12 })} />);
		expect(screen.getByText("(12 avis)")).toBeInTheDocument();
	});

	it("renders the rating stars component", () => {
		render(<ReviewRatingLink stats={createStats()} />);
		expect(screen.getByTestId("rating-stars")).toBeInTheDocument();
	});

	it("renders link with descriptive aria-label", () => {
		render(<ReviewRatingLink stats={createStats({ averageRating: 4.5, totalCount: 12 })} />);
		const link = screen.getByRole("link");
		expect(link.getAttribute("aria-label")).toContain("4.5");
		expect(link.getAttribute("aria-label")).toContain("12 avis");
	});
});
