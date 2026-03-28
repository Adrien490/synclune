import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

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

import { UserReviewCardSkeleton } from "../user-review-card-skeleton";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("UserReviewCardSkeleton", () => {
	it("renders without error", () => {
		render(<UserReviewCardSkeleton />);
		expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
	});

	it("renders multiple skeleton elements", () => {
		render(<UserReviewCardSkeleton />);
		const skeletons = screen.getAllByTestId("skeleton");
		expect(skeletons.length).toBeGreaterThanOrEqual(5);
	});
});
