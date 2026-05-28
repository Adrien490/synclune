/**
 * @regression load-more-reset-on-filter-change
 *
 * Verrouille le fix F1 de l'audit Load More (plan 2026-05-28 — m-ne-un-audit-complet-noble-graham).
 *
 * Avant le fix : `<ReviewsLoadMore>` était un client component conservant son
 * useState (`additionalReviews`, `cursor`, `hasMore`) à travers les re-renders.
 * Quand l'user changeait le tri/filtre via les searchParams, le parent
 * `<ReviewsList>` re-fetchait la page 1 du nouveau tri, mais les reviews
 * additionnelles chargées via "Voir plus" restaient affichées (mélangées avec
 * la nouvelle page 1) et le `cursor` pointait vers une position invalide.
 *
 * Fix : `<ReviewsList>` passe `key={"${ratingFilter ?? 'all'}-${sortBy ?? 'default'}"}`
 * à `<ReviewsLoadMore>`, forçant React à le remount à chaque changement de tri/filtre.
 *
 * Si quelqu'un retire la `key`, ce test échoue.
 */

import { cleanup, render } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({}));

const mountSpy = vi.fn();

vi.mock("../reviews-load-more", () => ({
	ReviewsLoadMore: (props: { ratingFilter?: number; sortBy?: string }) => {
		useEffect(() => {
			mountSpy(props);
			// eslint-disable-next-line react-hooks/exhaustive-deps -- spy mount only, intentionally ignore prop changes
		}, []);
		return <div data-testid="reviews-load-more" />;
	},
}));

vi.mock("../review-card", () => ({
	ReviewCard: () => <div data-testid="review-card" />,
}));

vi.mock("../review-summary", () => ({
	ReviewSummary: () => <div data-testid="review-summary" />,
}));

vi.mock("../review-sort-select", () => ({
	ReviewSortSelect: () => <div data-testid="review-sort-select" />,
}));

vi.mock("../review-photos-gallery", () => ({
	ReviewPhotosGallery: () => <div data-testid="review-photos-gallery" />,
}));

vi.mock("../review-filter-reset-button", () => ({
	ReviewFilterResetButton: () => <button>reset</button>,
}));

vi.mock("@/shared/components/ui/empty", () => ({
	Empty: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	EmptyActions: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	EmptyContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	EmptyHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	EmptyMedia: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	EmptyTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("lucide-react", () => ({
	Filter: () => null,
	MessageSquare: () => null,
}));

import { ReviewsList } from "../reviews-list";

afterEach(cleanup);

// ============================================================================
// HELPERS
// ============================================================================

const baseStats = {
	totalCount: 50,
	averageRating: 4.5,
	distribution: [
		{ rating: 5, count: 30, percentage: 60 },
		{ rating: 4, count: 15, percentage: 30 },
		{ rating: 3, count: 5, percentage: 10 },
		{ rating: 2, count: 0, percentage: 0 },
		{ rating: 1, count: 0, percentage: 0 },
	],
};

const makeReview = (id: string) => ({
	id,
	rating: 5,
	title: "T",
	content: "C",
	createdAt: new Date(),
	user: { name: "A", image: null },
	medias: [],
	response: null,
});

const initialReviews = [makeReview("r1"), makeReview("r2")];

const baseProps = {
	initialReviews,
	stats: baseStats,
	totalCount: 50,
	productId: "prod-1",
	nextCursor: "cursor-1",
	hasMore: true,
};

// ============================================================================
// TESTS
// ============================================================================

describe("ReviewsLoadMore — reset on filter/sort change (regression)", () => {
	beforeEach(() => {
		mountSpy.mockClear();
	});

	it("remounts ReviewsLoadMore when sortBy changes", () => {
		const { rerender } = render(<ReviewsList {...baseProps} sortBy="createdAt-desc" />);
		expect(mountSpy).toHaveBeenCalledTimes(1);

		rerender(<ReviewsList {...baseProps} sortBy="rating-desc" />);
		// If `key` is correctly derived from sortBy, the inner component remounts → mountSpy fires again.
		// If the key is removed or stable, mountSpy stays at 1 (component is reused).
		expect(mountSpy).toHaveBeenCalledTimes(2);
	});

	it("remounts ReviewsLoadMore when ratingFilter changes", () => {
		const { rerender } = render(<ReviewsList {...baseProps} ratingFilter={undefined} />);
		expect(mountSpy).toHaveBeenCalledTimes(1);

		rerender(<ReviewsList {...baseProps} ratingFilter={5} />);
		expect(mountSpy).toHaveBeenCalledTimes(2);
	});

	it("does not remount when neither ratingFilter nor sortBy changes", () => {
		const { rerender } = render(
			<ReviewsList {...baseProps} sortBy="createdAt-desc" ratingFilter={4} />,
		);
		expect(mountSpy).toHaveBeenCalledTimes(1);

		// Re-render with identical filter/sort — key is stable, no remount.
		rerender(<ReviewsList {...baseProps} sortBy="createdAt-desc" ratingFilter={4} />);
		expect(mountSpy).toHaveBeenCalledTimes(1);
	});
});
