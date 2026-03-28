import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({}));

vi.mock("../user-review-card", () => ({
	UserReviewCard: ({ review }: { review: { id: string } }) => (
		<div data-testid="user-review-card" data-review-id={review.id} />
	),
}));

import { UserReviewsSection } from "../user-reviews-section";
import type { ReviewUser } from "@/modules/reviews/types/review.types";

function createReview(id: string): ReviewUser {
	return {
		id,
		rating: 4,
		title: null,
		content: "Très bien",
		status: "PUBLISHED",
		createdAt: new Date("2026-01-01"),
		updatedAt: new Date("2026-01-01"),
		product: { id: "p1", title: "Bague", slug: "bague", skus: [] },
		medias: [],
		response: null,
	};
}

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("UserReviewsSection", () => {
	it("renders the section heading with review count", () => {
		render(<UserReviewsSection reviews={[createReview("r1"), createReview("r2")]} />);
		expect(screen.getByText("Mes avis (2)")).toBeInTheDocument();
	});

	it("renders a card for each review", () => {
		render(<UserReviewsSection reviews={[createReview("r1"), createReview("r2")]} />);
		expect(screen.getAllByTestId("user-review-card").length).toBe(2);
	});

	it("renders the section element with aria-labelledby", () => {
		render(<UserReviewsSection reviews={[createReview("r1")]} />);
		const section = screen.getByRole("region", { name: "Mes avis (1)" });
		expect(section).toBeInTheDocument();
	});
});
