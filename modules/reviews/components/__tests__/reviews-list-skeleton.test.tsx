import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({}));

vi.mock("../review-card-skeleton", () => ({
	ReviewCardSkeleton: ({ showMedia }: { showMedia?: boolean }) => (
		<div data-testid="review-card-skeleton" data-show-media={showMedia} />
	),
}));

import { ReviewsListSkeleton } from "../reviews-list-skeleton";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("ReviewsListSkeleton", () => {
	it("renders 3 skeletons by default", () => {
		render(<ReviewsListSkeleton />);
		expect(screen.getAllByTestId("review-card-skeleton").length).toBe(3);
	});

	it("renders the specified count of skeletons", () => {
		render(<ReviewsListSkeleton count={5} />);
		expect(screen.getAllByTestId("review-card-skeleton").length).toBe(5);
	});

	it("renders first skeleton with showMedia=true", () => {
		render(<ReviewsListSkeleton />);
		const skeletons = screen.getAllByTestId("review-card-skeleton");
		expect(skeletons[0]).toHaveAttribute("data-show-media", "true");
	});
});
