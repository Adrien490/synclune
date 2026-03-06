import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MOCKS
// ============================================================================

vi.mock("next/image", () => ({
	default: ({
		src,
		alt,
		...props
	}: {
		src: string;
		alt: string;
		[key: string]: unknown;
		// eslint-disable-next-line @next/next/no-img-element
	}) => <img src={src} alt={alt} {...props} />,
}));

vi.mock("next/link", () => ({
	default: ({
		href,
		children,
		className,
		"aria-label": ariaLabel,
	}: {
		href: string;
		children: React.ReactNode;
		className?: string;
		"aria-label"?: string;
	}) => (
		<a href={href} className={className} aria-label={ariaLabel}>
			{children}
		</a>
	),
}));

vi.mock("@/shared/components/rating-stars", () => ({
	RatingStars: ({ rating }: { rating: number }) => (
		<div role="meter" aria-valuenow={rating} data-testid="rating-stars" />
	),
}));

vi.mock("@/shared/components/relative-date", () => ({
	RelativeDate: ({ date }: { date: Date; className?: string }) => (
		<time data-testid="relative-date">{new Date(date).toISOString().slice(0, 10)}</time>
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

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

import { HomepageReviewCard } from "../homepage-review-card";
import type { ReviewHomepage } from "../../types/review.types";

afterEach(cleanup);

// ============================================================================
// FIXTURES
// ============================================================================

function createReview(overrides: Partial<ReviewHomepage> = {}): ReviewHomepage {
	return {
		id: "rev-1",
		rating: 5,
		title: "Magnifique",
		content: "Je suis ravie de mon achat.",
		createdAt: new Date("2026-02-15"),
		user: { name: "Sophie Martin", image: null },
		medias: [],
		response: null,
		product: {
			title: "Bracelet Lune",
			slug: "bracelet-lune",
			skus: [
				{
					images: [
						{
							url: "https://example.com/bracelet.jpg",
							blurDataUrl: null,
							altText: "Bracelet Lune",
						},
					],
				},
			],
		},
		...overrides,
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("HomepageReviewCard", () => {
	it("renders the user name", () => {
		render(<HomepageReviewCard review={createReview()} />);
		expect(screen.getByText("Sophie Martin")).toBeInTheDocument();
	});

	it("renders 'Anonyme' when user name is null", () => {
		render(<HomepageReviewCard review={createReview({ user: { name: null, image: null } })} />);
		expect(screen.getByText("Anonyme")).toBeInTheDocument();
	});

	it("renders the rating stars", () => {
		render(<HomepageReviewCard review={createReview({ rating: 4 })} />);
		expect(screen.getByTestId("rating-stars")).toHaveAttribute("aria-valuenow", "4");
	});

	it("renders the review content", () => {
		render(<HomepageReviewCard review={createReview()} />);
		expect(screen.getByTestId("review-content").textContent).toBe("Je suis ravie de mon achat.");
	});

	it("renders title when provided", () => {
		render(<HomepageReviewCard review={createReview({ title: "Magnifique" })} />);
		expect(screen.getByRole("heading", { name: "Magnifique" })).toBeInTheDocument();
	});

	it("does not render a title heading when title is null", () => {
		render(<HomepageReviewCard review={createReview({ title: null })} />);
		expect(screen.queryByRole("heading")).toBeNull();
	});

	it("renders the article with correct aria-label", () => {
		render(<HomepageReviewCard review={createReview({ rating: 5 })} />);
		const article = screen.getByRole("article");
		expect(article).toHaveAttribute("aria-label", "Avis de Sophie Martin — 5 sur 5 étoiles");
	});

	describe("product link", () => {
		it("links to the correct product URL", () => {
			render(<HomepageReviewCard review={createReview()} />);
			const link = screen.getByRole("link");
			expect(link).toHaveAttribute("href", "/creations/bracelet-lune");
		});

		it("has accessible aria-label for the product link", () => {
			render(<HomepageReviewCard review={createReview()} />);
			expect(
				screen.getByRole("link", { name: /Voir le produit : Bracelet Lune/ }),
			).toBeInTheDocument();
		});

		it("renders product image when available", () => {
			const { container } = render(<HomepageReviewCard review={createReview()} />);
			// Image has aria-hidden="true", so we query by tag
			const img = container.querySelector("img");
			expect(img).not.toBeNull();
			expect(img?.getAttribute("src")).toBe("https://example.com/bracelet.jpg");
		});

		it("does not render product image when no SKU images", () => {
			const review = createReview({
				product: {
					title: "Bracelet Lune",
					slug: "bracelet-lune",
					skus: [],
				},
			});
			render(<HomepageReviewCard review={review} />);
			expect(screen.queryByRole("img")).toBeNull();
		});
	});

	describe("media gallery", () => {
		it("renders gallery when review has media", () => {
			const review = createReview({
				medias: [{ id: "m1", url: "https://example.com/p.jpg", blurDataUrl: null, altText: null }],
			});
			render(<HomepageReviewCard review={review} />);
			expect(screen.getByTestId("review-card-gallery")).toBeInTheDocument();
		});

		it("does not render gallery when review has no media", () => {
			render(<HomepageReviewCard review={createReview({ medias: [] })} />);
			expect(screen.queryByTestId("review-card-gallery")).toBeNull();
		});
	});

	describe("brand response", () => {
		it("renders condensed brand response when present", () => {
			const review = createReview({
				response: {
					content: "Merci beaucoup !",
					authorName: "Synclune",
					createdAt: new Date("2026-02-20"),
				},
			});
			render(<HomepageReviewCard review={review} />);
			expect(screen.getByText("Merci beaucoup !")).toBeInTheDocument();
			expect(screen.getByRole("note", { name: "Réponse de Synclune" })).toBeInTheDocument();
		});

		it("does not render response section when response is null", () => {
			render(<HomepageReviewCard review={createReview({ response: null })} />);
			expect(screen.queryByRole("note")).toBeNull();
		});
	});
});
