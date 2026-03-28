import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockAction } = vi.hoisted(() => ({
	mockAction: vi.fn(),
}));

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({}));

vi.mock("@/modules/reviews/hooks/use-update-review-form", () => ({
	useUpdateReviewForm: () => ({
		form: {
			AppField: ({ children }: { children: (field: unknown) => React.ReactNode; name: string }) =>
				children({
					RatingField: ({ label }: { label: string }) => (
						<div data-testid="rating-field" data-label={label} />
					),
					InputField: ({ label, placeholder }: { label: string; placeholder?: string }) => (
						<div data-testid="input-field" data-label={label} data-placeholder={placeholder} />
					),
					TextareaField: ({ label }: { label: string }) => (
						<div data-testid="textarea-field" data-label={label} />
					),
				}),
			Field: ({ children }: { children: () => React.ReactNode; name: string }) => children(),
		},
		action: mockAction,
		isPending: false,
	}),
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		type,
		onClick,
		disabled,
		variant,
	}: {
		children: React.ReactNode;
		type?: "button" | "submit" | "reset";
		onClick?: () => void;
		disabled?: boolean;
		variant?: string;
	}) => (
		<button type={type} onClick={onClick} disabled={disabled} data-variant={variant}>
			{children}
		</button>
	),
}));

vi.mock("lucide-react", () => ({
	Send: () => <svg data-testid="icon-send" />,
}));

vi.mock("../review-media-field", () => ({
	ReviewMediaField: ({ label }: { label?: string; disabled?: boolean }) => (
		<div data-testid="review-media-field" data-label={label} />
	),
}));

import { UpdateReviewForm } from "../update-review-form";
import type { ReviewUser } from "@/modules/reviews/types/review.types";

// ============================================================================
// HELPERS
// ============================================================================

function createReview(overrides: Partial<ReviewUser> = {}): ReviewUser {
	return {
		id: "rev-1",
		rating: 4,
		title: "Super produit",
		content: "Très bien",
		status: "PUBLISHED",
		createdAt: new Date("2026-01-15"),
		updatedAt: new Date("2026-01-15"),
		product: {
			id: "prod-1",
			title: "Bague argent",
			slug: "bague-argent",
			skus: [],
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

describe("UpdateReviewForm", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders the form", () => {
		render(<UpdateReviewForm review={createReview()} />);
		expect(document.querySelector("form")).toBeTruthy();
	});

	it("renders hidden ID input with review id", () => {
		render(<UpdateReviewForm review={createReview({ id: "rev-42" })} />);
		const input = document.querySelector('input[name="id"]') as HTMLInputElement;
		expect(input?.value).toBe("rev-42");
	});

	it("renders the rating field", () => {
		render(<UpdateReviewForm review={createReview()} />);
		expect(screen.getByTestId("rating-field")).toBeInTheDocument();
	});

	it("renders the title input field", () => {
		render(<UpdateReviewForm review={createReview()} />);
		expect(screen.getByTestId("input-field")).toBeInTheDocument();
	});

	it("renders the content textarea field", () => {
		render(<UpdateReviewForm review={createReview()} />);
		expect(screen.getByTestId("textarea-field")).toBeInTheDocument();
	});

	it("renders the media field", () => {
		render(<UpdateReviewForm review={createReview()} />);
		expect(screen.getByTestId("review-media-field")).toBeInTheDocument();
	});

	it("renders 'Enregistrer les modifications' submit button", () => {
		render(<UpdateReviewForm review={createReview()} />);
		expect(screen.getByText("Enregistrer les modifications")).toBeInTheDocument();
	});

	it("renders 'Annuler' button when onCancel is provided", () => {
		const onCancel = vi.fn();
		render(<UpdateReviewForm review={createReview()} onCancel={onCancel} />);
		expect(screen.getByText("Annuler")).toBeInTheDocument();
	});

	it("does not render 'Annuler' button when onCancel is not provided", () => {
		render(<UpdateReviewForm review={createReview()} />);
		expect(screen.queryByText("Annuler")).toBeNull();
	});
});
