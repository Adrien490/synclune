import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({}));

vi.mock("next/image", () => ({
	default: ({ src, alt }: { src: string; alt: string; fill?: boolean }) => (
		// eslint-disable-next-line @next/next/no-img-element
		<img src={src} alt={alt} />
	),
}));

vi.mock("next/link", () => ({
	default: ({ children, href }: { children: React.ReactNode; href: string }) => (
		<a href={href}>{children}</a>
	),
}));

vi.mock("lucide-react", () => ({
	BadgeCheck: () => <svg data-testid="icon-badge-check" />,
	MessageSquare: () => <svg data-testid="icon-message-square" />,
	ExternalLink: () => <svg data-testid="icon-external-link" />,
}));

vi.mock("@/shared/components/ui/badge", () => ({
	Badge: ({
		children,
		variant,
		"aria-label": ariaLabel,
		className,
	}: {
		children: React.ReactNode;
		variant?: string;
		"aria-label"?: string;
		className?: string;
	}) => (
		<span data-testid="badge" data-variant={variant} aria-label={ariaLabel} className={className}>
			{children}
		</span>
	),
}));

vi.mock("@/shared/components/rating-stars", () => ({
	RatingStars: ({ rating }: { rating: number; size?: string }) => (
		<div data-testid="rating-stars" aria-valuenow={rating} />
	),
}));

vi.mock("../user-review-card-actions", () => ({
	UserReviewCardActions: ({ review }: { review: { id: string } }) => (
		<div data-testid="user-review-card-actions" data-review-id={review.id} />
	),
}));

vi.mock("../review-card-gallery", () => ({
	ReviewCardGallery: ({ medias }: { medias: unknown[] }) => (
		<div data-testid="review-card-gallery" data-count={medias.length} />
	),
}));

import { UserReviewCard } from "../user-review-card";
import type { ReviewUser } from "@/modules/reviews/types/review.types";

// ============================================================================
// HELPERS
// ============================================================================

function createReview(overrides: Partial<ReviewUser> = {}): ReviewUser {
	return {
		id: "rev-1",
		rating: 4,
		title: "Super produit",
		content: "Très bien, je recommande.",
		status: "PUBLISHED",
		createdAt: new Date("2026-01-15"),
		updatedAt: new Date("2026-01-15"),
		product: {
			id: "prod-1",
			title: "Bague argent",
			slug: "bague-argent",
			skus: [
				{
					images: [
						{
							url: "https://example.com/image.jpg",
							blurDataUrl: null,
							altText: "Bague argent",
						},
					],
				},
			],
		},
		medias: [],
		response: null,
		...overrides,
	};
}

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("UserReviewCard", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders as an article", () => {
		render(<UserReviewCard review={createReview()} />);
		expect(screen.getByRole("article")).toBeInTheDocument();
	});

	it("renders product title as a link", () => {
		render(<UserReviewCard review={createReview()} />);
		const link = screen.getByRole("link", { name: /Bague argent/ });
		expect(link).toHaveAttribute("href", "/creations/bague-argent");
	});

	it("renders review content", () => {
		render(<UserReviewCard review={createReview()} />);
		expect(screen.getByText("Très bien, je recommande.")).toBeInTheDocument();
	});

	it("renders review title when present", () => {
		render(<UserReviewCard review={createReview({ title: "Super produit" })} />);
		expect(screen.getByText("Super produit")).toBeInTheDocument();
	});

	it("does not render title heading when title is null", () => {
		render(<UserReviewCard review={createReview({ title: null })} />);
		expect(screen.queryByRole("heading", { level: 4 })).toBeNull();
	});

	it("renders rating stars", () => {
		render(<UserReviewCard review={createReview({ rating: 5 })} />);
		expect(screen.getByTestId("rating-stars")).toHaveAttribute("aria-valuenow", "5");
	});

	it("renders 'Achat vérifié' badge", () => {
		render(<UserReviewCard review={createReview()} />);
		expect(screen.getByText("Achat vérifié")).toBeInTheDocument();
	});

	it("renders status badge with correct aria-label for PUBLISHED", () => {
		render(<UserReviewCard review={createReview({ status: "PUBLISHED" })} />);
		const badges = screen.getAllByTestId("badge");
		const statusBadge = badges.find((b) => b.getAttribute("aria-label")?.includes("Statut"));
		expect(statusBadge).toBeTruthy();
		expect(statusBadge?.getAttribute("aria-label")).toContain("Publié");
	});

	it("renders status badge for HIDDEN review", () => {
		render(<UserReviewCard review={createReview({ status: "HIDDEN" })} />);
		const badges = screen.getAllByTestId("badge");
		const statusBadge = badges.find((b) => b.getAttribute("aria-label")?.includes("Statut"));
		expect(statusBadge?.getAttribute("aria-label")).toContain("Masqué");
	});

	it("renders placeholder when no product image", () => {
		const review = createReview({ product: { id: "p1", title: "T", slug: "t", skus: [] } });
		render(<UserReviewCard review={review} />);
		expect(screen.getByTestId("icon-message-square")).toBeInTheDocument();
	});

	it("renders media gallery when medias are present", () => {
		const review = createReview({
			medias: [{ id: "m1", url: "https://example.com/p.jpg", blurDataUrl: null, altText: null }],
		});
		render(<UserReviewCard review={review} />);
		expect(screen.getByTestId("review-card-gallery")).toBeInTheDocument();
	});

	it("renders brand response when present", () => {
		const review = createReview({
			response: {
				content: "Merci !",
				authorName: "Synclune",
				createdAt: new Date("2026-01-20"),
			},
		});
		render(<UserReviewCard review={review} />);
		expect(screen.getByText("Merci !")).toBeInTheDocument();
		expect(screen.getByText(/Réponse de Synclune/)).toBeInTheDocument();
	});

	it("renders user review card actions", () => {
		render(<UserReviewCard review={createReview()} />);
		expect(screen.getByTestId("user-review-card-actions")).toBeInTheDocument();
	});
});
