import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReviewHomepage, GlobalReviewStats } from "@/modules/reviews/types/review.types";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

vi.mock("@/shared/components/animations", () => ({
	Fade: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	HandDrawnUnderline: () => <div data-testid="underline" />,
	Reveal: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	Stagger: ({
		children,
		className,
	}: {
		children: React.ReactNode;
		className?: string;
		[key: string]: unknown;
	}) => (
		<div data-testid="stagger" className={className}>
			{children}
		</div>
	),
}));

vi.mock("@/shared/components/animations/motion.config", () => ({
	MOTION_CONFIG: {
		section: {
			title: { y: 20, duration: 0.5 },
			subtitle: { y: 15, delay: 0.1, duration: 0.4 },
			carousel: { y: 20, delay: 0.2, duration: 0.5 },
			cta: { y: 10, delay: 0.1, duration: 0.4 },
			grid: { stagger: 0.1, y: 20 },
		},
	},
}));

vi.mock("@/shared/components/section-title", () => ({
	SectionTitle: ({
		children,
		id,
	}: {
		children: React.ReactNode;
		id?: string;
		[key: string]: unknown;
	}) => <h2 id={id}>{children}</h2>,
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		asChild,
		...props
	}: {
		children: React.ReactNode;
		asChild?: boolean;
		[key: string]: unknown;
	}) => (asChild ? <>{children}</> : <button {...(props as object)}>{children}</button>),
}));

vi.mock("@/shared/components/ui/carousel", () => ({
	Carousel: ({
		children,
		"aria-label": ariaLabel,
	}: {
		children: React.ReactNode;
		"aria-label"?: string;
		[key: string]: unknown;
	}) => (
		<div data-testid="carousel" aria-label={ariaLabel}>
			{children}
		</div>
	),
	CarouselContent: ({ children }: { children: React.ReactNode; [key: string]: unknown }) => (
		<div data-testid="carousel-content">{children}</div>
	),
	CarouselItem: ({ children }: { children: React.ReactNode; [key: string]: unknown }) => (
		<div data-testid="carousel-item">{children}</div>
	),
	CarouselDots: () => <div data-testid="carousel-dots" />,
}));

vi.mock("next/link", () => ({
	default: ({
		children,
		href,
		...props
	}: {
		children: React.ReactNode;
		href: string;
		[key: string]: unknown;
	}) => (
		<a href={href} {...(props as object)}>
			{children}
		</a>
	),
}));

vi.mock("@/shared/constants/spacing", () => ({
	SECTION_SPACING: { section: "py-16" },
}));

vi.mock("@/shared/components/rating-stars", () => ({
	RatingStars: ({ rating }: { rating: number; [key: string]: unknown }) => (
		<div data-testid="rating-stars" data-rating={rating} />
	),
}));

vi.mock("@/shared/utils/rating-utils", () => ({
	formatRating: (rating: number) => rating.toFixed(1),
}));

// Prevent transitive module loading
vi.mock("@/modules/reviews/types/review.types", () => ({}));

vi.mock("@/modules/reviews/components/homepage-review-card", () => ({
	HomepageReviewCard: ({ review }: { review: { id: string }; [key: string]: unknown }) => (
		<div data-testid={`review-card-${review.id}`}>ReviewCard</div>
	),
}));

const mockUse = vi.fn();

vi.mock("react", async (importOriginal) => {
	// eslint-disable-next-line @typescript-eslint/consistent-type-imports
	const actual = await importOriginal<typeof import("react")>();
	return {
		...actual,
		use: (...args: unknown[]) => mockUse(...args),
	};
});

import { ReviewsSection } from "../reviews-section";

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const mockReviews = [
	{
		id: "r1",
		rating: 5,
		content: "Magnifique bracelet",
		title: "Superbe",
		createdAt: new Date("2025-12-01"),
		user: { name: "Marie" },
		product: { title: "Bracelet Lune", slug: "bracelet-lune", media: [] },
	},
	{
		id: "r2",
		rating: 4,
		content: "Très joli collier",
		title: null,
		createdAt: new Date("2025-12-05"),
		user: { name: "Sophie" },
		product: { title: "Collier Soleil", slug: "collier-soleil", media: [] },
	},
	{
		id: "r3",
		rating: 5,
		content: "Parfait cadeau",
		title: "Cadeau idéal",
		createdAt: new Date("2025-12-10"),
		user: { name: "Claire" },
		product: { title: "Bague Étoile", slug: "bague-etoile", media: [] },
	},
];

const mockStats = {
	averageRating: 4.7,
	totalReviews: 42,
};

const mockStatsEmpty = {
	averageRating: 0,
	totalReviews: 0,
};

const reviewsPromise = Promise.resolve(mockReviews) as unknown as Promise<ReviewHomepage[]>;
const statsPromise = Promise.resolve(mockStats) as unknown as Promise<GlobalReviewStats>;

// Helper: mockUse is called twice per render (reviews, then stats)
function setupMockUse(reviews: unknown[], stats: Record<string, unknown>) {
	let callCount = 0;
	mockUse.mockImplementation(() => {
		callCount++;
		return callCount % 2 === 1 ? reviews : stats;
	});
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ReviewsSection", () => {
	it("renders section with correct id and aria attributes", () => {
		setupMockUse(mockReviews, mockStats);
		render(<ReviewsSection reviewsPromise={reviewsPromise} reviewStatsPromise={statsPromise} />);

		const section = document.getElementById("reviews");
		expect(section).not.toBeNull();
		expect(section?.getAttribute("aria-labelledby")).toBe("reviews-title");
		expect(section?.getAttribute("aria-describedby")).toBe("reviews-subtitle");
	});

	it("renders h2 title 'Ce que disent nos clientes'", () => {
		setupMockUse(mockReviews, mockStats);
		render(<ReviewsSection reviewsPromise={reviewsPromise} reviewStatsPromise={statsPromise} />);

		const heading = screen.getByRole("heading", { level: 2 });
		expect(heading).toBeInTheDocument();
		expect(heading.id).toBe("reviews-title");
		expect(heading.textContent).toContain("Ce que disent nos clientes");
	});

	it("renders subtitle text", () => {
		setupMockUse(mockReviews, mockStats);
		render(<ReviewsSection reviewsPromise={reviewsPromise} reviewStatsPromise={statsPromise} />);

		const subtitle = document.getElementById("reviews-subtitle");
		expect(subtitle).not.toBeNull();
		expect(subtitle?.textContent).toContain("Des créations uniques");
	});

	it("returns null when reviews array is empty", () => {
		setupMockUse([], mockStats);
		const { container } = render(
			<ReviewsSection reviewsPromise={reviewsPromise} reviewStatsPromise={statsPromise} />,
		);

		expect(container.innerHTML).toBe("");
	});

	it("renders aggregate rating when totalReviews > 0", () => {
		setupMockUse(mockReviews, mockStats);
		render(<ReviewsSection reviewsPromise={reviewsPromise} reviewStatsPromise={statsPromise} />);

		expect(screen.getByTestId("rating-stars")).toBeInTheDocument();
		expect(screen.getByText("4.7")).toBeInTheDocument();
		expect(screen.getByText("(42 avis)")).toBeInTheDocument();
	});

	it("hides aggregate rating when totalReviews is 0", () => {
		setupMockUse(mockReviews, mockStatsEmpty);
		render(<ReviewsSection reviewsPromise={reviewsPromise} reviewStatsPromise={statsPromise} />);

		expect(screen.queryByTestId("rating-stars")).not.toBeInTheDocument();
		expect(screen.queryByText("(0 avis)")).not.toBeInTheDocument();
	});

	it("skip link present and targets #reviews-cta", () => {
		setupMockUse(mockReviews, mockStats);
		render(<ReviewsSection reviewsPromise={reviewsPromise} reviewStatsPromise={statsPromise} />);

		const skipLink = screen.getByText("Passer le carrousel d'avis");
		expect(skipLink).toBeInTheDocument();
		expect(skipLink.getAttribute("href")).toBe("#reviews-cta");
	});

	it("CTA links to /produits?sortBy=rating-descending", () => {
		setupMockUse(mockReviews, mockStats);
		render(<ReviewsSection reviewsPromise={reviewsPromise} reviewStatsPromise={statsPromise} />);

		const ctaLink = screen.getByText("Voir les créations les mieux notées");
		expect(ctaLink.closest("a")).toHaveAttribute("href", "/produits?sortBy=rating-descending");
	});

	it("mobile carousel has dynamic aria-label with review count", () => {
		setupMockUse(mockReviews, mockStats);
		render(<ReviewsSection reviewsPromise={reviewsPromise} reviewStatsPromise={statsPromise} />);

		const carousel = screen.getByTestId("carousel");
		expect(carousel.getAttribute("aria-label")).toBe("Carrousel de 3 avis clients");
	});
});
