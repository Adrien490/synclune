import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockEditOpen, mockDeleteOpen } = vi.hoisted(() => ({
	mockEditOpen: vi.fn(),
	mockDeleteOpen: vi.fn(),
}));

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({}));

vi.mock("@/shared/providers/dialog-store-provider", () => ({
	useDialog: () => ({ open: mockEditOpen }),
}));

vi.mock("@/shared/providers/alert-dialog-store-provider", () => ({
	useAlertDialog: () => ({ open: mockDeleteOpen }),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		onClick,
		variant,
		size,
		"aria-label": ariaLabel,
		className,
	}: {
		children: React.ReactNode;
		onClick?: () => void;
		variant?: string;
		size?: string;
		"aria-label"?: string;
		className?: string;
	}) => (
		<button
			onClick={onClick}
			data-variant={variant}
			data-size={size}
			aria-label={ariaLabel}
			className={className}
		>
			{children}
		</button>
	),
}));

vi.mock("lucide-react", () => ({
	PenLine: () => <svg data-testid="icon-pen-line" />,
	Trash2: () => <svg data-testid="icon-trash" />,
}));

import { UserReviewCardActions } from "../user-review-card-actions";
import type { ReviewUser } from "@/modules/reviews/types/review.types";

// ============================================================================
// HELPERS
// ============================================================================

function createReview(overrides: Partial<ReviewUser> = {}): ReviewUser {
	return {
		id: "rev-1",
		rating: 4,
		title: null,
		content: "Très bien",
		status: "PUBLISHED",
		createdAt: new Date("2026-01-01"),
		updatedAt: new Date("2026-01-01"),
		product: { id: "p1", title: "Bague argent", slug: "bague", skus: [] },
		medias: [],
		response: null,
		...overrides,
	};
}

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("UserReviewCardActions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders 'Modifier' button", () => {
		render(<UserReviewCardActions review={createReview()} />);
		expect(screen.getByText("Modifier")).toBeInTheDocument();
	});

	it("renders 'Supprimer' button", () => {
		render(<UserReviewCardActions review={createReview()} />);
		expect(screen.getByText("Supprimer")).toBeInTheDocument();
	});

	it("renders 'Modifier' button with contextual aria-label", () => {
		render(
			<UserReviewCardActions
				review={createReview({ product: { id: "p1", title: "Bague argent", slug: "b", skus: [] } })}
			/>,
		);
		expect(
			screen.getByRole("button", { name: "Modifier l'avis sur Bague argent" }),
		).toBeInTheDocument();
	});

	it("renders 'Supprimer' button with contextual aria-label", () => {
		render(
			<UserReviewCardActions
				review={createReview({ product: { id: "p1", title: "Bague argent", slug: "b", skus: [] } })}
			/>,
		);
		expect(
			screen.getByRole("button", { name: "Supprimer l'avis sur Bague argent" }),
		).toBeInTheDocument();
	});

	it("renders group container with role and aria-label", () => {
		render(<UserReviewCardActions review={createReview()} />);
		expect(screen.getByRole("group", { name: "Actions sur l'avis" })).toBeInTheDocument();
	});
});
