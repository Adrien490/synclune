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
	SkeletonGroup: ({ children, label }: { children: React.ReactNode; label?: string }) => (
		<div data-testid="skeleton-group" aria-label={label}>
			{children}
		</div>
	),
}));

vi.mock("../reviewable-product-card-skeleton", () => ({
	ReviewableProductCardSkeleton: () => <div data-testid="reviewable-product-card-skeleton" />,
}));

vi.mock("../user-review-card-skeleton", () => ({
	UserReviewCardSkeleton: () => <div data-testid="user-review-card-skeleton" />,
}));

import {
	ReviewableProductsSkeleton,
	UserReviewsSkeleton,
	ReviewsPageSkeleton,
} from "../reviews-page-skeleton";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("ReviewableProductsSkeleton", () => {
	it("renders without error", () => {
		render(<ReviewableProductsSkeleton />);
		expect(screen.getByTestId("skeleton-group")).toBeInTheDocument();
	});

	it("renders with aria-label 'Chargement des produits à évaluer'", () => {
		render(<ReviewableProductsSkeleton />);
		expect(screen.getByLabelText("Chargement des produits à évaluer")).toBeInTheDocument();
	});

	it("renders 3 product card skeletons", () => {
		render(<ReviewableProductsSkeleton />);
		expect(screen.getAllByTestId("reviewable-product-card-skeleton").length).toBe(3);
	});
});

describe("UserReviewsSkeleton", () => {
	it("renders without error", () => {
		render(<UserReviewsSkeleton />);
		expect(screen.getByTestId("skeleton-group")).toBeInTheDocument();
	});

	it("renders with aria-label 'Chargement des avis'", () => {
		render(<UserReviewsSkeleton />);
		expect(screen.getByLabelText("Chargement des avis")).toBeInTheDocument();
	});

	it("renders 2 user review card skeletons", () => {
		render(<UserReviewsSkeleton />);
		expect(screen.getAllByTestId("user-review-card-skeleton").length).toBe(2);
	});
});

describe("ReviewsPageSkeleton", () => {
	it("renders both sub-skeletons", () => {
		render(<ReviewsPageSkeleton />);
		expect(screen.getAllByTestId("skeleton-group").length).toBe(2);
	});

	it("renders without error", () => {
		expect(() => render(<ReviewsPageSkeleton />)).not.toThrow();
	});
});
