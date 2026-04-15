import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as LucideReact from "lucide-react";

// ============================================================================
// MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdmin: vi.fn(),
	requireAdminWithUser: vi.fn(),
	requireAuth: vi.fn(),
}));

vi.mock("@/app/generated/prisma/client", () => ({
	ReviewStatus: {
		PUBLISHED: "PUBLISHED",
		HIDDEN: "HIDDEN",
	},
}));

vi.mock("../../constants/review.constants", () => ({
	REVIEW_STATUS_LABELS: {
		PUBLISHED: "Publié",
		HIDDEN: "Masqué",
	},
}));

vi.mock("@/shared/components/cursor-pagination", () => ({
	CursorPagination: () => <div data-testid="cursor-pagination" />,
}));

vi.mock("@/shared/components/table-scroll-container", () => ({
	TableScrollContainer: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="table-scroll-container">{children}</div>
	),
}));

vi.mock("@/shared/components/table-selection-cell", () => ({
	TableSelectionCell: ({
		type,
		itemId,
		itemIds,
	}: {
		type: "header" | "row";
		itemId?: string;
		itemIds?: string[];
	}) => (
		<div
			data-testid={type === "header" ? "selection-cell-header" : `selection-cell-${itemId}`}
			data-item-ids={itemIds?.join(",")}
		/>
	),
}));

vi.mock("@/shared/components/ui/card", () => ({
	Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<div data-testid="card" className={className}>
			{children}
		</div>
	),
	CardContent: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="card-content">{children}</div>
	),
}));

vi.mock("@/shared/components/data-table/table-empty-state", () => ({
	TableEmptyState: ({
		title,
		description,
	}: {
		icon: unknown;
		title: string;
		description: string;
		action?: { label: string; href: string };
	}) => (
		<div data-testid="table-empty-state">
			<p>{title}</p>
			<p>{description}</p>
		</div>
	),
}));

vi.mock("@/shared/components/ui/table", () => ({
	Table: ({
		children,
		"aria-label": ariaLabel,
	}: {
		children: React.ReactNode;
		"aria-label"?: string;
		caption?: string;
		striped?: boolean;
		className?: string;
	}) => <table aria-label={ariaLabel}>{children}</table>,
	TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
	TableCell: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<td className={className}>{children}</td>
	),
	TableHead: ({
		children,
		className,
		"aria-label": ariaLabel,
	}: {
		children?: React.ReactNode;
		className?: string;
		"aria-label"?: string;
	}) => (
		<th className={className} aria-label={ariaLabel}>
			{children}
		</th>
	),
	TableHeader: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
	TableRow: ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>,
}));

vi.mock("@/shared/components/ui/badge", () => ({
	Badge: ({
		children,
		variant,
		role,
		"aria-label": ariaLabel,
		className,
	}: {
		children: React.ReactNode;
		variant?: string;
		role?: string;
		"aria-label"?: string;
		className?: string;
	}) => (
		<span
			data-testid="badge"
			data-variant={variant}
			role={role}
			aria-label={ariaLabel}
			className={className}
		>
			{children}
		</span>
	),
}));

vi.mock("next/link", () => ({
	default: ({
		children,
		href,
		target,
		className,
	}: {
		children: React.ReactNode;
		href: string;
		target?: string;
		className?: string;
	}) => (
		<a href={href} target={target} className={className}>
			{children}
		</a>
	),
}));

vi.mock("@/shared/utils/dates", () => ({
	formatDateShort: vi.fn(() => "01/02/2026"),
}));

vi.mock("lucide-react", async (importOriginal) => {
	const actual = await importOriginal<typeof LucideReact>();
	return {
		...actual,
		CircleCheck: ({ "aria-hidden": ariaHidden }: { "aria-hidden"?: boolean }) => (
			<svg data-testid="icon-circle-check" aria-hidden={ariaHidden} />
		),
		EyeOff: ({ "aria-hidden": ariaHidden }: { "aria-hidden"?: boolean }) => (
			<svg data-testid="icon-eye-off" aria-hidden={ariaHidden} />
		),
		MessageSquare: () => <svg data-testid="icon-message-square" />,
	};
});

vi.mock("@/shared/components/rating-stars", () => ({
	RatingStars: ({ rating, size }: { rating: number; size?: string }) => (
		<div data-testid="rating-stars" data-rating={rating} data-size={size} />
	),
}));

vi.mock("@/modules/reviews/components/admin/review-row-actions", () => ({
	ReviewRowActions: ({ review }: { review: { id: string } }) => (
		<div data-testid={`review-row-actions-${review.id}`} />
	),
}));

vi.mock("@/modules/reviews/components/admin/reviews-selection-toolbar", () => ({
	ReviewsSelectionToolbar: () => <div data-testid="reviews-selection-toolbar" />,
}));

import { ReviewsDataTable } from "../reviews-data-table";

// ============================================================================
// HELPERS
// ============================================================================

function createPagination(overrides = {}) {
	return {
		hasNextPage: false,
		hasPreviousPage: false,
		nextCursor: null,
		prevCursor: null,
		...overrides,
	};
}

function createReview(overrides: Record<string, unknown> = {}) {
	return {
		id: "review-1",
		rating: 4,
		title: "Super produit",
		content: "Très satisfait de cet achat.",
		status: "PUBLISHED",
		response: {
			id: "resp-1",
			content: "Merci !",
			authorId: "admin-1",
			authorName: "Admin",
			createdAt: new Date("2026-02-02"),
			updatedAt: new Date("2026-02-02"),
		},
		createdAt: new Date("2026-02-01"),
		updatedAt: new Date("2026-02-01"),
		product: { id: "product-1", slug: "bracelet-lune", title: "Bracelet Lune" },
		user: { id: "user-1", name: "Marie", email: "marie@test.fr", image: null },
		medias: [],
		...overrides,
	};
}

// ============================================================================
// TESTS
// ============================================================================

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

beforeEach(() => {
	vi.clearAllMocks();
});

describe("ReviewsDataTable", () => {
	// ─── Empty state ──────────────────────────────────────────────────────────

	it("renders empty state when no reviews", async () => {
		const Component = await ReviewsDataTable({
			reviewsPromise: Promise.resolve({
				reviews: [],
				pagination: createPagination(),
				totalCount: 0,
			}),
		});
		render(Component);
		expect(screen.getByTestId("table-empty-state")).toBeInTheDocument();
	});

	it("shows 'Aucun avis trouvé' in empty state", async () => {
		const Component = await ReviewsDataTable({
			reviewsPromise: Promise.resolve({
				reviews: [],
				pagination: createPagination(),
				totalCount: 0,
			}),
		});
		render(Component);
		expect(screen.getByText("Aucun avis trouvé")).toBeInTheDocument();
	});

	// ─── With data ────────────────────────────────────────────────────────────

	it("renders a card when reviews exist", async () => {
		const reviews = [createReview()];
		const Component = await ReviewsDataTable({
			reviewsPromise: Promise.resolve({
				reviews,
				pagination: createPagination(),
				totalCount: reviews.length,
			}),
		});
		render(Component);
		expect(screen.getByTestId("card")).toBeInTheDocument();
	});

	it("renders product link with target _blank", async () => {
		const reviews = [createReview()];
		const Component = await ReviewsDataTable({
			reviewsPromise: Promise.resolve({
				reviews,
				pagination: createPagination(),
				totalCount: reviews.length,
			}),
		});
		render(Component);
		const link = screen.getByRole("link", { name: "Bracelet Lune" });
		expect(link).toBeInTheDocument();
		expect(link).toHaveAttribute("href", "/creations/bracelet-lune");
		expect(link).toHaveAttribute("target", "_blank");
	});

	it("renders rating stars", async () => {
		const reviews = [createReview({ rating: 4 })];
		const Component = await ReviewsDataTable({
			reviewsPromise: Promise.resolve({
				reviews,
				pagination: createPagination(),
				totalCount: reviews.length,
			}),
		});
		render(Component);
		expect(screen.getByTestId("rating-stars")).toHaveAttribute("data-rating", "4");
	});

	it("renders PUBLISHED status badge with CircleCheck icon", async () => {
		const reviews = [createReview({ status: "PUBLISHED" })];
		const Component = await ReviewsDataTable({
			reviewsPromise: Promise.resolve({
				reviews,
				pagination: createPagination(),
				totalCount: reviews.length,
			}),
		});
		render(Component);
		expect(screen.getByText("Publié")).toBeInTheDocument();
		expect(screen.getByTestId("icon-circle-check")).toBeInTheDocument();
	});

	it("renders HIDDEN status badge with EyeOff icon", async () => {
		const reviews = [createReview({ status: "HIDDEN" })];
		const Component = await ReviewsDataTable({
			reviewsPromise: Promise.resolve({
				reviews,
				pagination: createPagination(),
				totalCount: reviews.length,
			}),
		});
		render(Component);
		expect(screen.getByText("Masqué")).toBeInTheDocument();
		expect(screen.getByTestId("icon-eye-off")).toBeInTheDocument();
	});

	it("renders user name", async () => {
		const reviews = [createReview()];
		const Component = await ReviewsDataTable({
			reviewsPromise: Promise.resolve({
				reviews,
				pagination: createPagination(),
				totalCount: reviews.length,
			}),
		});
		render(Component);
		expect(screen.getByText("Marie")).toBeInTheDocument();
	});

	it("renders 'Anonyme' when user name is null", async () => {
		const reviews = [
			createReview({
				user: { id: "user-1", name: null, email: "anon@test.fr", image: null },
			}),
		];
		const Component = await ReviewsDataTable({
			reviewsPromise: Promise.resolve({
				reviews,
				pagination: createPagination(),
				totalCount: reviews.length,
			}),
		});
		render(Component);
		expect(screen.getByText("Anonyme")).toBeInTheDocument();
	});

	it("renders user email", async () => {
		const reviews = [createReview()];
		const Component = await ReviewsDataTable({
			reviewsPromise: Promise.resolve({
				reviews,
				pagination: createPagination(),
				totalCount: reviews.length,
			}),
		});
		render(Component);
		expect(screen.getByText("marie@test.fr")).toBeInTheDocument();
	});

	it("renders 'Répondu' badge when review has a response", async () => {
		const reviews = [createReview({ response: "Merci !" })];
		const Component = await ReviewsDataTable({
			reviewsPromise: Promise.resolve({
				reviews,
				pagination: createPagination(),
				totalCount: reviews.length,
			}),
		});
		render(Component);
		expect(screen.getByText("Répondu")).toBeInTheDocument();
	});

	it("renders '-' when review has no response", async () => {
		const reviews = [createReview({ response: null })];
		const Component = await ReviewsDataTable({
			reviewsPromise: Promise.resolve({
				reviews,
				pagination: createPagination(),
				totalCount: reviews.length,
			}),
		});
		render(Component);
		expect(screen.getByText("-")).toBeInTheDocument();
	});

	it("renders row actions for each review", async () => {
		const reviews = [createReview({ id: "review-1" })];
		const Component = await ReviewsDataTable({
			reviewsPromise: Promise.resolve({
				reviews,
				pagination: createPagination(),
				totalCount: reviews.length,
			}),
		});
		render(Component);
		expect(screen.getByTestId("review-row-actions-review-1")).toBeInTheDocument();
	});

	it("renders multiple reviews", async () => {
		const reviews = [
			createReview({
				id: "review-1",
				product: { id: "p-1", slug: "bracelet-lune", title: "Bracelet Lune" },
			}),
			createReview({
				id: "review-2",
				product: { id: "p-2", slug: "collier-etoile", title: "Collier Étoile" },
			}),
		];
		const Component = await ReviewsDataTable({
			reviewsPromise: Promise.resolve({
				reviews,
				pagination: createPagination(),
				totalCount: reviews.length,
			}),
		});
		render(Component);
		expect(screen.getByText("Bracelet Lune")).toBeInTheDocument();
		expect(screen.getByText("Collier Étoile")).toBeInTheDocument();
	});

	// ─── Pagination ───────────────────────────────────────────────────────────

	it("renders cursor pagination when hasNextPage is true", async () => {
		const reviews = [createReview()];
		const Component = await ReviewsDataTable({
			reviewsPromise: Promise.resolve({
				reviews,
				pagination: createPagination({ hasNextPage: true }),
				totalCount: reviews.length,
			}),
		});
		render(Component);
		expect(screen.getByTestId("cursor-pagination")).toBeInTheDocument();
	});

	it("does not render cursor pagination when no more pages", async () => {
		const reviews = [createReview()];
		const Component = await ReviewsDataTable({
			reviewsPromise: Promise.resolve({
				reviews,
				pagination: createPagination(),
				totalCount: reviews.length,
			}),
		});
		render(Component);
		expect(screen.queryByTestId("cursor-pagination")).not.toBeInTheDocument();
	});

	// ─── Selection toolbar ────────────────────────────────────────────────────

	it("renders selection toolbar", async () => {
		const reviews = [createReview()];
		const Component = await ReviewsDataTable({
			reviewsPromise: Promise.resolve({
				reviews,
				pagination: createPagination(),
				totalCount: reviews.length,
			}),
		});
		render(Component);
		expect(screen.getByTestId("reviews-selection-toolbar")).toBeInTheDocument();
	});

	// ─── Table structure ──────────────────────────────────────────────────────

	it("renders table with correct aria-label", async () => {
		const reviews = [createReview()];
		const Component = await ReviewsDataTable({
			reviewsPromise: Promise.resolve({
				reviews,
				pagination: createPagination(),
				totalCount: reviews.length,
			}),
		});
		render(Component);
		expect(screen.getByRole("table", { name: /Liste des avis produits/i })).toBeInTheDocument();
	});

	it("renders table column headers", async () => {
		const reviews = [createReview()];
		const Component = await ReviewsDataTable({
			reviewsPromise: Promise.resolve({
				reviews,
				pagination: createPagination(),
				totalCount: reviews.length,
			}),
		});
		render(Component);
		expect(screen.getByText("Produit")).toBeInTheDocument();
		expect(screen.getByText("Client")).toBeInTheDocument();
		expect(screen.getByText("Note")).toBeInTheDocument();
		expect(screen.getByText("Statut")).toBeInTheDocument();
		expect(screen.getByText("Réponse")).toBeInTheDocument();
	});
});
