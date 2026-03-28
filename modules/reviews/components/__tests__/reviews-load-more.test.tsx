import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({}));

vi.mock("@/modules/reviews/actions/load-more-reviews", () => ({
	loadMoreReviews: vi.fn(),
}));

vi.mock("sonner", () => ({
	toast: {
		error: vi.fn(),
		success: vi.fn(),
	},
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		onClick,
		disabled,
		variant,
		className,
	}: {
		children: React.ReactNode;
		onClick?: () => void;
		disabled?: boolean;
		variant?: string;
		className?: string;
	}) => (
		<button onClick={onClick} disabled={disabled} data-variant={variant} className={className}>
			{children}
		</button>
	),
}));

vi.mock("lucide-react", () => ({
	LoaderCircle: () => <svg data-testid="icon-loader" />,
}));

vi.mock("../review-card", () => ({
	ReviewCard: ({ review }: { review: { id: string } }) => (
		<div data-testid="review-card" data-review-id={review.id} />
	),
}));

import { ReviewsLoadMore } from "../reviews-load-more";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("ReviewsLoadMore", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders null when no more reviews and no additional reviews loaded", () => {
		const { container } = render(
			<ReviewsLoadMore productId="prod-1" initialCursor={null} initialHasMore={false} />,
		);
		expect(container.firstChild).toBeNull();
	});

	it("renders 'Voir plus d'avis' button when hasMore is true", () => {
		render(<ReviewsLoadMore productId="prod-1" initialCursor="cursor-abc" initialHasMore={true} />);
		expect(screen.getByText("Voir plus d'avis")).toBeInTheDocument();
	});

	it("renders button disabled when not pending", () => {
		render(<ReviewsLoadMore productId="prod-1" initialCursor="cursor-abc" initialHasMore={true} />);
		const button = screen.getByRole("button");
		expect(button).not.toBeDisabled();
	});

	it("does not render button when hasMore is false and no additional reviews", () => {
		const { container } = render(
			<ReviewsLoadMore productId="prod-1" initialCursor={null} initialHasMore={false} />,
		);
		expect(container.firstChild).toBeNull();
	});

	it("renders with ratingFilter prop without error", () => {
		render(
			<ReviewsLoadMore
				productId="prod-1"
				initialCursor="cursor-abc"
				initialHasMore={true}
				ratingFilter={4}
			/>,
		);
		expect(screen.getByText("Voir plus d'avis")).toBeInTheDocument();
	});

	it("renders with sortBy prop without error", () => {
		render(
			<ReviewsLoadMore
				productId="prod-1"
				initialCursor="cursor-abc"
				initialHasMore={true}
				sortBy="rating-desc"
			/>,
		);
		expect(screen.getByText("Voir plus d'avis")).toBeInTheDocument();
	});
});
