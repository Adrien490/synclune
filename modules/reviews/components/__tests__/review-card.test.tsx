import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MOCKS
// ============================================================================

vi.mock("@/shared/components/ui/badge", () => ({
	Badge: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<span data-testid="badge" className={className}>
			{children}
		</span>
	),
}));

vi.mock("@/shared/components/ui/card", () => ({
	CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<div className={className}>{children}</div>
	),
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@/shared/utils/dates", () => ({
	formatRelativeDate: (date: Date) => `il y a X jours (${date.toISOString().slice(0, 10)})`,
	formatDateLong: (date: Date) => date.toLocaleDateString("fr-FR"),
	isRecent: vi.fn((date: Date, days: number) => {
		const now = new Date("2026-03-06");
		return now.getTime() - new Date(date).getTime() < days * 24 * 60 * 60 * 1000;
	}),
}));

vi.mock("@/shared/components/rating-stars", () => ({
	RatingStars: ({ rating }: { rating: number }) => (
		<div role="meter" aria-valuenow={rating} data-testid="rating-stars" />
	),
}));

vi.mock("../review-card-gallery", () => ({
	ReviewCardGallery: ({ medias }: { medias: unknown[] }) => (
		<div data-testid="review-card-gallery" data-count={medias.length} />
	),
}));

vi.mock("../expandable-review-content", () => ({
	ExpandableReviewContent: ({ content }: { content: string }) => (
		<p data-testid="review-content">{content}</p>
	),
}));

vi.mock("lucide-react", () => ({
	BadgeCheck: () => <svg data-testid="badge-check" />,
}));

import { ReviewCard } from "../review-card";
import type { ReviewPublic } from "../../types/review.types";

afterEach(cleanup);

// ============================================================================
// FIXTURES
// ============================================================================

function createReview(overrides: Partial<ReviewPublic> = {}): ReviewPublic {
	return {
		id: "rev-1",
		rating: 4,
		title: "Super bague",
		content: "Très belle qualité, je recommande vivement.",
		createdAt: new Date("2026-02-01"),
		user: { name: "Marie Dupont", image: null },
		medias: [],
		response: null,
		...overrides,
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("ReviewCard", () => {
	it("renders the user name", () => {
		render(<ReviewCard review={createReview()} />);
		expect(screen.getByText("Marie Dupont")).toBeInTheDocument();
	});

	it("renders 'Anonyme' when user name is null", () => {
		render(<ReviewCard review={createReview({ user: { name: null, image: null } })} />);
		expect(screen.getByText("Anonyme")).toBeInTheDocument();
	});

	it("renders the rating stars with correct value", () => {
		render(<ReviewCard review={createReview({ rating: 5 })} />);
		const stars = screen.getByTestId("rating-stars");
		expect(stars).toHaveAttribute("aria-valuenow", "5");
	});

	it("renders the review content", () => {
		render(<ReviewCard review={createReview()} />);
		expect(screen.getByTestId("review-content").textContent).toBe(
			"Très belle qualité, je recommande vivement.",
		);
	});

	it("renders the review title when provided", () => {
		render(<ReviewCard review={createReview({ title: "Super bague" })} />);
		expect(screen.getByRole("heading", { name: "Super bague" })).toBeInTheDocument();
	});

	it("does not render a title heading when title is null", () => {
		render(<ReviewCard review={createReview({ title: null })} />);
		expect(screen.queryByRole("heading")).toBeNull();
	});

	it("renders 'Achat vérifié' badge", () => {
		render(<ReviewCard review={createReview()} />);
		expect(screen.getByText("Achat vérifié")).toBeInTheDocument();
	});

	it("renders 'Nouveau' badge for recent review", () => {
		render(<ReviewCard review={createReview({ createdAt: new Date("2026-03-05") })} />);
		expect(screen.getByText("Nouveau")).toBeInTheDocument();
	});

	it("does not render 'Nouveau' badge for old review", () => {
		render(<ReviewCard review={createReview({ createdAt: new Date("2025-01-01") })} />);
		expect(screen.queryByText("Nouveau")).toBeNull();
	});

	it("renders the article with correct aria-label", () => {
		render(<ReviewCard review={createReview({ rating: 4 })} />);
		const article = screen.getByRole("article");
		expect(article).toHaveAttribute("aria-label", "Avis de Marie Dupont — 4 sur 5 étoiles");
	});

	it("renders article id as review-{id}", () => {
		render(<ReviewCard review={createReview({ id: "rev-42" })} />);
		const article = document.getElementById("review-rev-42");
		expect(article).not.toBeNull();
	});

	describe("media gallery", () => {
		it("renders the gallery when review has media", () => {
			const review = createReview({
				medias: [
					{ id: "m1", url: "https://example.com/photo.jpg", blurDataUrl: null, altText: null },
				],
			});
			render(<ReviewCard review={review} />);
			expect(screen.getByTestId("review-card-gallery")).toBeInTheDocument();
		});

		it("does not render the gallery when review has no media", () => {
			render(<ReviewCard review={createReview({ medias: [] })} />);
			expect(screen.queryByTestId("review-card-gallery")).toBeNull();
		});
	});

	describe("brand response", () => {
		it("renders brand response when present", () => {
			const review = createReview({
				response: {
					content: "Merci pour votre avis !",
					authorName: "Synclune",
					createdAt: new Date("2026-02-10"),
				},
			});
			render(<ReviewCard review={review} />);
			expect(screen.getByText("Merci pour votre avis !")).toBeInTheDocument();
			expect(screen.getByText(/Réponse de Synclune/)).toBeInTheDocument();
		});

		it("does not render response section when response is null", () => {
			render(<ReviewCard review={createReview({ response: null })} />);
			expect(screen.queryByText(/Réponse de/)).toBeNull();
		});
	});
});
