import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MOCKS
// ============================================================================

vi.mock("next/link", () => ({
	default: ({
		href,
		children,
		className,
	}: {
		href: string;
		children: React.ReactNode;
		className?: string;
	}) => (
		<a href={href} className={className}>
			{children}
		</a>
	),
}));

vi.mock("@/shared/components/ui/card", () => ({
	Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
	CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/shared/components/table-scroll-container", () => ({
	TableScrollContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/shared/components/cursor-pagination", () => ({
	CursorPagination: (props: {
		hasNextPage: boolean;
		hasPreviousPage: boolean;
		nextCursor: string | null;
		prevCursor: string | null;
	}) => (
		<div
			data-testid="cursor-pagination"
			data-has-next={props.hasNextPage}
			data-has-prev={props.hasPreviousPage}
		/>
	),
}));

vi.mock("@/shared/components/data-table/table-empty-state", () => ({
	TableEmptyState: ({ title }: { title: string }) => (
		<div data-testid="table-empty-state">{title}</div>
	),
}));

vi.mock("@/shared/components/ui/table", () => ({
	Table: ({ children }: { children: React.ReactNode }) => <table>{children}</table>,
	TableHeader: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
	TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
	TableRow: ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>,
	TableHead: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<th className={className}>{children}</th>
	),
	TableCell: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<td className={className}>{children}</td>
	),
}));

vi.mock("@/shared/components/ui/badge", () => ({
	Badge: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
		<span data-testid="badge" data-variant={variant}>
			{children}
		</span>
	),
}));

vi.mock("@/shared/components/rating-stars", () => ({
	RatingStars: ({ rating }: { rating: number }) => (
		<div data-testid="rating-stars" aria-valuenow={rating} />
	),
}));

vi.mock("@/shared/utils/dates", () => ({
	formatDateShort: (date: Date) => new Date(date).toISOString().slice(0, 10),
}));

vi.mock("../../constants/review.constants", () => ({
	REVIEW_STATUS_LABELS: {
		PUBLISHED: "Publié",
		HIDDEN: "Masqué",
	},
}));

vi.mock("../admin/review-row-actions", () => ({
	ReviewRowActions: () => <div data-testid="row-actions" />,
}));

vi.mock("lucide-react", () => ({
	CheckCircle2: () => <svg />,
	EyeOff: () => <svg />,
	MessageSquare: () => <svg />,
}));

vi.mock("@/app/generated/prisma/client", () => ({
	ReviewStatus: {
		PUBLISHED: "PUBLISHED",
		HIDDEN: "HIDDEN",
	},
}));

import { ReviewsDataTable } from "../admin/reviews-data-table";
import type { GetReviewsReturn, ReviewAdmin } from "../../types/review.types";

afterEach(cleanup);

// ============================================================================
// FIXTURES
// ============================================================================

function createAdminReview(overrides: Partial<ReviewAdmin> = {}): ReviewAdmin {
	return {
		id: "rev-1",
		rating: 4,
		title: "Beau produit",
		content: "Je suis satisfaite.",
		status: "PUBLISHED" as ReviewAdmin["status"],
		createdAt: new Date("2026-02-10"),
		updatedAt: new Date("2026-02-10"),
		user: {
			id: "user-1",
			name: "Claire Durand",
			email: "claire@example.com",
			image: null,
		},
		product: {
			id: "prod-1",
			title: "Collier Étoile",
			slug: "collier-etoile",
		},
		medias: [],
		response: null,
		...overrides,
	};
}

function createReturnData(
	reviews: ReviewAdmin[],
	overrides: Partial<GetReviewsReturn["pagination"]> = {},
): GetReviewsReturn {
	return {
		reviews,
		pagination: {
			nextCursor: null,
			prevCursor: null,
			hasNextPage: false,
			hasPreviousPage: false,
			...overrides,
		},
		totalCount: reviews.length,
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("ReviewsDataTable", () => {
	it("renders empty state when no reviews", async () => {
		const el = await ReviewsDataTable({
			reviewsPromise: Promise.resolve(createReturnData([])),
		});
		render(el);
		expect(screen.getByTestId("table-empty-state")).toBeInTheDocument();
		expect(screen.getByText("Aucun avis trouvé")).toBeInTheDocument();
	});

	it("renders review rows when reviews exist", async () => {
		const reviews = [
			createAdminReview({ id: "rev-1" }),
			createAdminReview({
				id: "rev-2",
				user: { id: "u2", name: "Sophie", email: "s@s.com", image: null },
			}),
		];
		const el = await ReviewsDataTable({
			reviewsPromise: Promise.resolve(createReturnData(reviews)),
		});
		render(el);
		expect(screen.getByText("Claire Durand")).toBeInTheDocument();
		expect(screen.getByText("Sophie")).toBeInTheDocument();
	});

	it("links product to storefront product page", async () => {
		const el = await ReviewsDataTable({
			reviewsPromise: Promise.resolve(createReturnData([createAdminReview()])),
		});
		render(el);
		const link = screen.getByRole("link", { name: "Collier Étoile" });
		expect(link).toHaveAttribute("href", "/creations/collier-etoile");
	});

	it("shows PUBLISHED badge for published reviews", async () => {
		const el = await ReviewsDataTable({
			reviewsPromise: Promise.resolve(
				createReturnData([createAdminReview({ status: "PUBLISHED" as ReviewAdmin["status"] })]),
			),
		});
		render(el);
		expect(screen.getByText("Publié")).toBeInTheDocument();
	});

	it("shows HIDDEN badge for hidden reviews", async () => {
		const el = await ReviewsDataTable({
			reviewsPromise: Promise.resolve(
				createReturnData([createAdminReview({ status: "HIDDEN" as ReviewAdmin["status"] })]),
			),
		});
		render(el);
		expect(screen.getByText("Masqué")).toBeInTheDocument();
	});

	it("shows 'Répondu' badge when review has a response", async () => {
		const review = createAdminReview({
			response: {
				id: "resp-1",
				content: "Merci !",
				authorId: "admin-1",
				authorName: "Admin",
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		});
		const el = await ReviewsDataTable({
			reviewsPromise: Promise.resolve(createReturnData([review])),
		});
		render(el);
		expect(screen.getByText("Répondu")).toBeInTheDocument();
	});

	it("shows '-' placeholder when review has no response", async () => {
		const el = await ReviewsDataTable({
			reviewsPromise: Promise.resolve(createReturnData([createAdminReview({ response: null })])),
		});
		render(el);
		expect(screen.getByText("-")).toBeInTheDocument();
	});

	it("renders cursor pagination when there are more pages", async () => {
		const el = await ReviewsDataTable({
			reviewsPromise: Promise.resolve(
				createReturnData([createAdminReview()], {
					hasNextPage: true,
					nextCursor: "cursor-abc",
					hasPreviousPage: false,
					prevCursor: null,
				}),
			),
		});
		render(el);
		expect(screen.getByTestId("cursor-pagination")).toBeInTheDocument();
	});

	it("does not render pagination when on single page", async () => {
		const el = await ReviewsDataTable({
			reviewsPromise: Promise.resolve(createReturnData([createAdminReview()])),
		});
		render(el);
		expect(screen.queryByTestId("cursor-pagination")).toBeNull();
	});

	it("renders customer email", async () => {
		const el = await ReviewsDataTable({
			reviewsPromise: Promise.resolve(createReturnData([createAdminReview()])),
		});
		render(el);
		expect(screen.getByText("claire@example.com")).toBeInTheDocument();
	});

	it("shows 'Anonyme' for review with null user name", async () => {
		const review = createAdminReview({
			user: { id: "u1", name: null, email: "a@a.com", image: null },
		});
		const el = await ReviewsDataTable({
			reviewsPromise: Promise.resolve(createReturnData([review])),
		});
		render(el);
		expect(screen.getByText("Anonyme")).toBeInTheDocument();
	});
});
