import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({}));

const { mockLoadMoreReviews } = vi.hoisted(() => ({
	mockLoadMoreReviews: vi.fn(),
}));

vi.mock("@/modules/reviews/actions/load-more-reviews", () => ({
	loadMoreReviews: mockLoadMoreReviews,
}));

const { mockToastError } = vi.hoisted(() => ({
	mockToastError: vi.fn(),
}));

vi.mock("@/shared/utils/toast", () => ({
	toast: {
		error: mockToastError,
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
		...rest
	}: {
		children: React.ReactNode;
		onClick?: () => void;
		disabled?: boolean;
		variant?: string;
		className?: string;
	} & React.HTMLAttributes<HTMLButtonElement>) => (
		<button
			onClick={onClick}
			disabled={disabled}
			data-variant={variant}
			className={className}
			{...rest}
		>
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
// HELPERS
// ============================================================================

const baseProps = {
	productId: "prod-1",
	initialCursor: "cursor-abc",
	initialHasMore: true,
	initialDisplayedCount: 10,
	totalCount: 50,
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

// ============================================================================
// TESTS
// ============================================================================

describe("ReviewsLoadMore", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ──────────────────────────────────────────────────────────────
	// Initial states
	// ──────────────────────────────────────────────────────────────

	it("renders null when no more reviews and no additional reviews loaded", () => {
		const { container } = render(
			<ReviewsLoadMore {...baseProps} initialCursor={null} initialHasMore={false} />,
		);
		expect(container.firstChild).toBeNull();
		expect(screen.queryByRole("button")).not.toBeInTheDocument();
	});

	it("renders 'Voir plus d'avis' button when hasMore is true", () => {
		render(<ReviewsLoadMore {...baseProps} />);
		expect(screen.getByText("Voir plus d'avis")).toBeInTheDocument();
	});

	it("renders button not disabled when not pending", () => {
		render(<ReviewsLoadMore {...baseProps} />);
		expect(screen.getByRole("button")).not.toBeDisabled();
	});

	it("renders counter 'X sur Y avis affichés' when totalCount > 0", () => {
		render(<ReviewsLoadMore {...baseProps} initialDisplayedCount={10} totalCount={50} />);
		expect(screen.getByText("10 sur 50 avis affichés")).toBeInTheDocument();
	});

	it("button has aria-controls pointing to reviews-list", () => {
		render(<ReviewsLoadMore {...baseProps} />);
		expect(screen.getByRole("button")).toHaveAttribute("aria-controls", "reviews-list");
	});

	// ──────────────────────────────────────────────────────────────
	// Interaction — happy path
	// ──────────────────────────────────────────────────────────────

	it("calls loadMoreReviews with correct params on click", async () => {
		mockLoadMoreReviews.mockResolvedValue({
			reviews: [makeReview("r1")],
			nextCursor: "cursor-next",
			hasMore: true,
		});

		render(<ReviewsLoadMore {...baseProps} ratingFilter={4} sortBy="rating-desc" />);

		await act(async () => {
			fireEvent.click(screen.getByRole("button"));
		});

		expect(mockLoadMoreReviews).toHaveBeenCalledWith({
			productId: "prod-1",
			cursor: "cursor-abc",
			filterRating: 4,
			sortBy: "rating-desc",
		});
	});

	it("appends loaded reviews to the DOM and updates counter", async () => {
		mockLoadMoreReviews.mockResolvedValue({
			reviews: [makeReview("r1"), makeReview("r2"), makeReview("r3")],
			nextCursor: "cursor-next",
			hasMore: true,
		});

		render(<ReviewsLoadMore {...baseProps} />);

		await act(async () => {
			fireEvent.click(screen.getByRole("button"));
		});

		await waitFor(() => {
			expect(screen.getAllByTestId("review-card")).toHaveLength(3);
		});
		expect(screen.getByText("13 sur 50 avis affichés")).toBeInTheDocument();
	});

	it("hides button when server returns hasMore=false", async () => {
		mockLoadMoreReviews.mockResolvedValue({
			reviews: [makeReview("r1")],
			nextCursor: null,
			hasMore: false,
		});

		render(<ReviewsLoadMore {...baseProps} />);

		await act(async () => {
			fireEvent.click(screen.getByRole("button"));
		});

		await waitFor(() => {
			expect(screen.queryByRole("button")).not.toBeInTheDocument();
		});
		// Loaded review still rendered
		expect(screen.getByTestId("review-card")).toBeInTheDocument();
	});

	it("announces newly loaded reviews via sr-only status region", async () => {
		mockLoadMoreReviews.mockResolvedValue({
			reviews: [makeReview("r1"), makeReview("r2")],
			nextCursor: "cursor-next",
			hasMore: true,
		});

		render(<ReviewsLoadMore {...baseProps} />);

		await act(async () => {
			fireEvent.click(screen.getByRole("button"));
		});

		const status = screen.getByRole("status");
		expect(status).toHaveTextContent("2 nouveaux avis chargés");
		expect(status).toHaveTextContent("12 sur 50 avis affichés");
	});

	// ──────────────────────────────────────────────────────────────
	// Interaction — error handling
	// ──────────────────────────────────────────────────────────────

	it("shows toast and does not append when server returns error", async () => {
		mockLoadMoreReviews.mockResolvedValue({
			reviews: [],
			nextCursor: null,
			hasMore: false,
			error: "Trop de requêtes. Veuillez patienter.",
		});

		render(<ReviewsLoadMore {...baseProps} />);

		await act(async () => {
			fireEvent.click(screen.getByRole("button"));
		});

		expect(mockToastError).toHaveBeenCalledWith("Trop de requêtes. Veuillez patienter.");
		expect(screen.queryByTestId("review-card")).not.toBeInTheDocument();
		// Button remains clickable for retry
		expect(screen.getByRole("button")).not.toBeDisabled();
	});

	it("shows generic toast when server action throws", async () => {
		mockLoadMoreReviews.mockRejectedValue(new Error("Network down"));

		render(<ReviewsLoadMore {...baseProps} />);

		await act(async () => {
			fireEvent.click(screen.getByRole("button"));
		});

		expect(mockToastError).toHaveBeenCalledWith("Impossible de charger plus d'avis");
	});

	// ──────────────────────────────────────────────────────────────
	// Props pass-through (legacy coverage)
	// ──────────────────────────────────────────────────────────────

	it("renders with ratingFilter prop without error", () => {
		render(<ReviewsLoadMore {...baseProps} ratingFilter={4} />);
		expect(screen.getByText("Voir plus d'avis")).toBeInTheDocument();
	});

	it("renders with sortBy prop without error", () => {
		render(<ReviewsLoadMore {...baseProps} sortBy="rating-desc" />);
		expect(screen.getByText("Voir plus d'avis")).toBeInTheDocument();
	});
});
