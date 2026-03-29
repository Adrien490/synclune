import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({}));

vi.mock("@/shared/hooks", () => ({
	useLightbox: () => ({ isOpen: false, open: vi.fn(), close: vi.fn() }),
}));

vi.mock("next/image", () => ({
	default: ({ src, alt }: { src: string; alt: string; fill?: boolean }) => (
		// eslint-disable-next-line @next/next/no-img-element
		<img src={src} alt={alt} />
	),
}));

vi.mock("@/modules/media/components/media-lightbox", () => ({
	default: () => <div data-testid="media-lightbox" />,
}));

vi.mock("next/dynamic", () => ({
	default: () => () => <div data-testid="media-lightbox" />,
}));

import { ReviewPhotosGallery } from "../review-photos-gallery";
import type { ReviewPublic } from "@/modules/reviews/types/review.types";

// ============================================================================
// HELPERS
// ============================================================================

function createReview(id: string, medias: ReviewPublic["medias"] = []): ReviewPublic {
	return {
		id,
		rating: 4,
		title: null,
		content: "Très bien",
		createdAt: new Date("2026-01-01"),
		user: { name: "Alice", image: null },
		medias,
		response: null,
	};
}

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("ReviewPhotosGallery", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns null when no reviews have photos", () => {
		const { container } = render(
			<ReviewPhotosGallery reviews={[createReview("r1"), createReview("r2")]} />,
		);
		expect(container.firstChild).toBeNull();
	});

	it("renders section heading when photos are present", () => {
		const reviews = [
			createReview("r1", [
				{ id: "m1", url: "https://example.com/p1.jpg", blurDataUrl: null, altText: null },
			]),
		];
		render(<ReviewPhotosGallery reviews={reviews} />);
		expect(screen.getByText(/Photos clients \(1\)/)).toBeInTheDocument();
	});

	it("renders correct photo count in heading", () => {
		const reviews = [
			createReview("r1", [
				{ id: "m1", url: "https://example.com/p1.jpg", blurDataUrl: null, altText: null },
				{ id: "m2", url: "https://example.com/p2.jpg", blurDataUrl: null, altText: null },
			]),
			createReview("r2", [
				{ id: "m3", url: "https://example.com/p3.jpg", blurDataUrl: null, altText: null },
			]),
		];
		render(<ReviewPhotosGallery reviews={reviews} />);
		expect(screen.getByText(/Photos clients \(3\)/)).toBeInTheDocument();
	});

	it("renders a button for each photo", () => {
		const reviews = [
			createReview("r1", [
				{ id: "m1", url: "https://example.com/p1.jpg", blurDataUrl: null, altText: null },
				{ id: "m2", url: "https://example.com/p2.jpg", blurDataUrl: null, altText: null },
			]),
		];
		render(<ReviewPhotosGallery reviews={reviews} />);
		const buttons = screen.getAllByRole("button");
		expect(buttons.length).toBe(2);
	});

	it("renders button with correct aria-label including user name", () => {
		const reviews = [
			createReview("r1", [
				{ id: "m1", url: "https://example.com/p1.jpg", blurDataUrl: null, altText: null },
			]),
		];
		// User name is "Alice"
		render(<ReviewPhotosGallery reviews={reviews} />);
		expect(screen.getByRole("button", { name: "Photo 1 de l'avis de Alice" })).toBeInTheDocument();
	});

	it("uses 'Anonyme' in aria-label when user name is null", () => {
		const review = createReview("r1", [
			{ id: "m1", url: "https://example.com/p1.jpg", blurDataUrl: null, altText: null },
		]);
		review.user.name = null;
		render(<ReviewPhotosGallery reviews={[review]} />);
		expect(
			screen.getByRole("button", { name: "Photo 1 de l'avis de Anonyme" }),
		).toBeInTheDocument();
	});

	it("renders with correct section aria-labelledby", () => {
		const reviews = [
			createReview("r1", [
				{ id: "m1", url: "https://example.com/p1.jpg", blurDataUrl: null, altText: null },
			]),
		];
		render(<ReviewPhotosGallery reviews={reviews} />);
		expect(screen.getByRole("region", { name: /Photos clients/ })).toBeInTheDocument();
	});
});
