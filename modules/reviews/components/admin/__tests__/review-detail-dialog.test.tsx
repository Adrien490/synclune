import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({}));

vi.mock("@/shared/components/ui/dialog", () => ({
	Dialog: ({
		children,
		open,
	}: {
		children: React.ReactNode;
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
	}) => (open ? <div data-testid="dialog">{children}</div> : null),
	DialogContent: ({ children }: { children: React.ReactNode; className?: string }) => (
		<div data-testid="dialog-content">{children}</div>
	),
	DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	DialogTitle: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<h2 className={className}>{children}</h2>
	),
	DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
	DialogTrigger: ({ children }: { children: React.ReactNode; asChild?: boolean }) => (
		<div data-testid="dialog-trigger">{children}</div>
	),
}));

vi.mock("@/shared/components/ui/badge", () => ({
	Badge: ({
		children,
		role,
		"aria-label": ariaLabel,
	}: {
		children: React.ReactNode;
		variant?: string;
		role?: string;
		"aria-label"?: string;
	}) => (
		<span data-testid="badge" role={role} aria-label={ariaLabel}>
			{children}
		</span>
	),
}));

vi.mock("@/shared/components/ui/separator", () => ({
	Separator: ({ className }: { className?: string }) => (
		<hr data-testid="separator" className={className} />
	),
}));

vi.mock("@/shared/utils/dates", () => ({
	formatDateShort: (date: Date) => new Date(date).toLocaleDateString("fr-FR"),
}));

vi.mock("@/shared/components/rating-stars", () => ({
	RatingStars: ({ rating }: { rating: number; size?: string }) => (
		<div data-testid="rating-stars" aria-valuenow={rating} />
	),
}));

vi.mock("next/image", () => ({
	default: ({ src, alt }: { src: string; alt: string; fill?: boolean }) => (
		<img src={src} alt={alt} />
	),
}));

vi.mock("next/link", () => ({
	default: ({ children, href }: { children: React.ReactNode; href: string }) => (
		<a href={href}>{children}</a>
	),
}));

vi.mock("lucide-react", () => ({
	MessageSquare: () => <svg data-testid="icon-message-square" />,
	CircleCheck: () => <svg data-testid="icon-circle-check" />,
	EyeOff: () => <svg data-testid="icon-eye-off" />,
	ExternalLink: () => <svg data-testid="icon-external-link" />,
}));

vi.mock("../review-response-form", () => ({
	ReviewResponseForm: ({ reviewId }: { reviewId: string; existingResponse?: unknown }) => (
		<div data-testid="review-response-form" data-review-id={reviewId} />
	),
}));

import { ReviewDetailDialog } from "../review-detail-dialog";
import type { ReviewAdmin } from "@/modules/reviews/types/review.types";

// ============================================================================
// HELPERS
// ============================================================================

function createReview(overrides: Partial<ReviewAdmin> = {}): ReviewAdmin {
	return {
		id: "rev-1",
		rating: 4,
		title: "Belle bague",
		content: "Très bien, je recommande.",
		status: "PUBLISHED",
		createdAt: new Date("2026-01-15"),
		updatedAt: new Date("2026-01-15"),
		user: {
			id: "user-1",
			name: "Marie Dupont",
			email: "marie@example.com",
			image: null,
		},
		product: {
			id: "prod-1",
			title: "Bague argent",
			slug: "bague-argent",
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

describe("ReviewDetailDialog", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders nothing when closed", () => {
		render(<ReviewDetailDialog review={createReview()} open={false} />);
		expect(screen.queryByTestId("dialog")).toBeNull();
	});

	it("renders when open", () => {
		render(<ReviewDetailDialog review={createReview()} open={true} />);
		expect(screen.getByTestId("dialog")).toBeInTheDocument();
	});

	it("shows dialog title 'Détail de l'avis'", () => {
		render(<ReviewDetailDialog review={createReview()} open={true} />);
		expect(screen.getByText("Détail de l'avis")).toBeInTheDocument();
	});

	it("shows product title in description", () => {
		render(<ReviewDetailDialog review={createReview()} open={true} />);
		expect(screen.getByText("Bague argent")).toBeInTheDocument();
	});

	it("shows user name", () => {
		render(<ReviewDetailDialog review={createReview()} open={true} />);
		expect(screen.getByText("Marie Dupont")).toBeInTheDocument();
	});

	it("shows user email", () => {
		render(<ReviewDetailDialog review={createReview()} open={true} />);
		expect(screen.getByText("marie@example.com")).toBeInTheDocument();
	});

	it("shows review content", () => {
		render(<ReviewDetailDialog review={createReview()} open={true} />);
		expect(screen.getByText("Très bien, je recommande.")).toBeInTheDocument();
	});

	it("shows review title when present", () => {
		render(<ReviewDetailDialog review={createReview({ title: "Belle bague" })} open={true} />);
		expect(screen.getByText("Belle bague")).toBeInTheDocument();
	});

	it("shows status badge with correct aria-label for PUBLISHED", () => {
		render(<ReviewDetailDialog review={createReview({ status: "PUBLISHED" })} open={true} />);
		const badge = screen.getByRole("status");
		expect(badge).toHaveAttribute("aria-label", "Statut : Publié");
	});

	it("shows status badge with correct aria-label for HIDDEN", () => {
		render(<ReviewDetailDialog review={createReview({ status: "HIDDEN" })} open={true} />);
		const badge = screen.getByRole("status");
		expect(badge).toHaveAttribute("aria-label", "Statut : Masqué");
	});

	it("renders photos section when medias are present", () => {
		const review = createReview({
			medias: [
				{ id: "m1", url: "https://example.com/photo.jpg", blurDataUrl: null, altText: null },
			],
		});
		render(<ReviewDetailDialog review={review} open={true} />);
		expect(screen.getByText("Photos jointes")).toBeInTheDocument();
	});

	it("does not render photos section when no medias", () => {
		render(<ReviewDetailDialog review={createReview({ medias: [] })} open={true} />);
		expect(screen.queryByText("Photos jointes")).toBeNull();
	});

	it("renders response form", () => {
		render(<ReviewDetailDialog review={createReview()} open={true} />);
		expect(screen.getByTestId("review-response-form")).toBeInTheDocument();
	});

	it("renders response form with existing response data when response exists", () => {
		const review = createReview({
			response: {
				id: "resp-1",
				content: "Merci pour votre avis !",
				authorId: "admin-1",
				authorName: "Synclune",
				createdAt: new Date("2026-01-20"),
				updatedAt: new Date("2026-01-20"),
			},
		});
		render(<ReviewDetailDialog review={review} open={true} />);
		expect(screen.getByText("Merci pour votre avis !")).toBeInTheDocument();
		expect(screen.getByTestId("review-response-form")).toBeInTheDocument();
	});

	it("renders trigger when provided", () => {
		render(
			<ReviewDetailDialog review={createReview()} open={true} trigger={<button>Open</button>} />,
		);
		expect(screen.getByTestId("dialog-trigger")).toBeInTheDocument();
	});
});
