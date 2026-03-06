import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockUseCreateReviewForm } = vi.hoisted(() => ({
	mockUseCreateReviewForm: vi.fn(),
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("../../hooks/use-create-review-form", () => ({
	useCreateReviewForm: mockUseCreateReviewForm,
}));

vi.mock("../review-media-field", () => ({
	ReviewMediaField: ({ label }: { label: string }) => (
		<div data-testid="review-media-field">{label}</div>
	),
}));

vi.mock("../../constants/review.constants", () => ({
	REVIEW_CONFIG: {
		MAX_TITLE_LENGTH: 150,
		MAX_CONTENT_LENGTH: 2000,
	},
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		type,
		disabled,
		className,
	}: {
		children: React.ReactNode;
		type?: string;
		disabled?: boolean;
		className?: string;
	}) => (
		<button type={type as "submit" | "button" | "reset"} disabled={disabled} className={className}>
			{children}
		</button>
	),
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("lucide-react", () => ({
	Send: () => <svg data-testid="send-icon" />,
}));

import { CreateReviewForm } from "../create-review-form";

afterEach(cleanup);

// ============================================================================
// DEFAULT MOCK SETUP
// ============================================================================

function setupMockForm({
	isPending = false,
}: {
	isPending?: boolean;
} = {}) {
	const mockAction = vi.fn();

	const mockField = {
		RatingField: ({ label }: { label: string }) => <div data-testid="rating-field">{label}</div>,
		InputField: ({ label }: { label: string }) => <div data-testid="input-field">{label}</div>,
		TextareaField: ({ label }: { label: string }) => (
			<div data-testid="textarea-field">{label}</div>
		),
	};

	const mockForm = {
		AppField: ({
			children,
		}: {
			name: string;
			children: (field: typeof mockField) => React.ReactNode;
		}) => <>{children(mockField)}</>,
		Field: ({ children }: { name: string; children: () => React.ReactNode }) => <>{children()}</>,
	};

	mockUseCreateReviewForm.mockReturnValue({
		form: mockForm,
		state: undefined,
		action: mockAction,
		isPending,
		formErrors: [],
	});

	return { mockAction };
}

// ============================================================================
// TESTS
// ============================================================================

describe("CreateReviewForm", () => {
	it("renders the form element", () => {
		setupMockForm();
		const { container } = render(<CreateReviewForm productId="prod-1" orderItemId="item-1" />);
		expect(container.querySelector("form")).toBeInTheDocument();
	});

	it("renders hidden productId and orderItemId inputs", () => {
		setupMockForm();
		render(<CreateReviewForm productId="prod-42" orderItemId="item-99" />);

		const productInput = document.querySelector('input[name="productId"]') as HTMLInputElement;
		const orderItemInput = document.querySelector('input[name="orderItemId"]') as HTMLInputElement;

		expect(productInput?.value).toBe("prod-42");
		expect(orderItemInput?.value).toBe("item-99");
	});

	it("renders product title when provided", () => {
		setupMockForm();
		render(
			<CreateReviewForm productId="prod-1" orderItemId="item-1" productTitle="Bague Étoile" />,
		);
		expect(screen.getByText("Bague Étoile")).toBeInTheDocument();
	});

	it("does not render product title section when not provided", () => {
		setupMockForm();
		render(<CreateReviewForm productId="prod-1" orderItemId="item-1" />);
		expect(screen.queryByText("Donnez votre avis sur")).toBeNull();
	});

	it("renders the rating field", () => {
		setupMockForm();
		render(<CreateReviewForm productId="prod-1" orderItemId="item-1" />);
		expect(screen.getByTestId("rating-field")).toBeInTheDocument();
	});

	it("renders the textarea field for review content", () => {
		setupMockForm();
		render(<CreateReviewForm productId="prod-1" orderItemId="item-1" />);
		expect(screen.getByTestId("textarea-field")).toBeInTheDocument();
	});

	it("renders the media upload field", () => {
		setupMockForm();
		render(<CreateReviewForm productId="prod-1" orderItemId="item-1" />);
		expect(screen.getByTestId("review-media-field")).toBeInTheDocument();
	});

	it("renders 'Publier mon avis' submit button when not pending", () => {
		setupMockForm({ isPending: false });
		render(<CreateReviewForm productId="prod-1" orderItemId="item-1" />);
		expect(screen.getByRole("button", { name: /Publier mon avis/ })).toBeInTheDocument();
	});

	it("renders 'Envoi en cours...' when pending", () => {
		setupMockForm({ isPending: true });
		render(<CreateReviewForm productId="prod-1" orderItemId="item-1" />);
		expect(screen.getByRole("button", { name: /Envoi en cours/ })).toBeInTheDocument();
	});

	it("disables submit button when pending", () => {
		setupMockForm({ isPending: true });
		render(<CreateReviewForm productId="prod-1" orderItemId="item-1" />);
		expect(screen.getByRole("button")).toBeDisabled();
	});

	it("passes productId and orderItemId to the hook", () => {
		setupMockForm();
		render(<CreateReviewForm productId="prod-abc" orderItemId="item-xyz" />);
		expect(mockUseCreateReviewForm).toHaveBeenCalledWith(
			expect.objectContaining({ productId: "prod-abc", orderItemId: "item-xyz" }),
		);
	});
});
