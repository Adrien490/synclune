import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockCreateResponse, mockEditResponse, mockRemoveResponse } = vi.hoisted(() => ({
	mockCreateResponse: vi.fn(),
	mockEditResponse: vi.fn(),
	mockRemoveResponse: vi.fn(),
}));

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({}));

vi.mock("@/modules/reviews/hooks/use-review-response-form", () => ({
	useReviewResponseForm: () => ({
		createResponse: mockCreateResponse,
		editResponse: mockEditResponse,
		removeResponse: mockRemoveResponse,
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
		"aria-label": ariaLabel,
		variant,
		size,
	}: {
		children: React.ReactNode;
		type?: "button" | "submit" | "reset";
		onClick?: () => void;
		disabled?: boolean;
		"aria-label"?: string;
		variant?: string;
		size?: string;
	}) => (
		<button
			type={type}
			onClick={onClick}
			disabled={disabled}
			aria-label={ariaLabel}
			data-variant={variant}
			data-size={size}
		>
			{children}
		</button>
	),
}));

vi.mock("@/shared/components/ui/textarea", () => ({
	Textarea: ({
		id,
		value,
		onChange,
		placeholder,
		disabled,
		"aria-invalid": ariaInvalid,
		"aria-describedby": ariaDescribedby,
	}: {
		id?: string;
		value?: string;
		onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
		placeholder?: string;
		disabled?: boolean;
		"aria-invalid"?: boolean;
		"aria-describedby"?: string;
		rows?: number;
		maxLength?: number;
	}) => (
		<textarea
			id={id}
			value={value}
			onChange={onChange}
			placeholder={placeholder}
			disabled={disabled}
			aria-invalid={ariaInvalid}
			aria-describedby={ariaDescribedby}
		/>
	),
}));

vi.mock("@/shared/components/ui/label", () => ({
	Label: ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
		<label htmlFor={htmlFor}>{children}</label>
	),
}));

vi.mock("@/shared/components/ui/alert-dialog", () => ({
	AlertDialog: ({
		children,
		open,
	}: {
		children: React.ReactNode;
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
	}) => (open ? <div data-testid="alert-dialog">{children}</div> : <div>{children}</div>),
	AlertDialogTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) =>
		asChild ? (
			<div data-testid="alert-dialog-trigger">{children}</div>
		) : (
			<button data-testid="alert-dialog-trigger">{children}</button>
		),
	AlertDialogContent: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="alert-dialog-content">{children}</div>
	),
	AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
	AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
	AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	AlertDialogCancel: ({ children }: { children: React.ReactNode }) => (
		<button data-testid="alert-dialog-cancel">{children}</button>
	),
	AlertDialogAction: ({
		children,
		onClick,
		className,
	}: {
		children: React.ReactNode;
		onClick?: () => void;
		className?: string;
	}) => (
		<button data-testid="alert-dialog-action" onClick={onClick} className={className}>
			{children}
		</button>
	),
}));

vi.mock("lucide-react", () => ({
	Send: () => <svg data-testid="icon-send" />,
	Trash2: () => <svg data-testid="icon-trash" />,
	LoaderCircle: () => <svg data-testid="icon-loader" />,
}));

import { ReviewResponseForm } from "../review-response-form";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("ReviewResponseForm", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders the form", () => {
		render(<ReviewResponseForm reviewId="rev-1" />);
		expect(document.querySelector("form")).toBeTruthy();
	});

	it("shows 'Répondre à cet avis' label when no existing response", () => {
		render(<ReviewResponseForm reviewId="rev-1" />);
		expect(screen.getByText("Répondre à cet avis")).toBeInTheDocument();
	});

	it("shows 'Modifier votre réponse' label when existing response", () => {
		render(
			<ReviewResponseForm
				reviewId="rev-1"
				existingResponse={{ id: "resp-1", content: "Merci !" }}
			/>,
		);
		expect(screen.getByText("Modifier votre réponse")).toBeInTheDocument();
	});

	it("shows 'Envoyer' button when no existing response", () => {
		render(<ReviewResponseForm reviewId="rev-1" />);
		expect(screen.getByText("Envoyer")).toBeInTheDocument();
	});

	it("shows 'Modifier' button when existing response", () => {
		render(
			<ReviewResponseForm
				reviewId="rev-1"
				existingResponse={{ id: "resp-1", content: "Merci !" }}
			/>,
		);
		expect(screen.getByText("Modifier")).toBeInTheDocument();
	});

	it("pre-fills the textarea with existing response content", () => {
		render(
			<ReviewResponseForm
				reviewId="rev-1"
				existingResponse={{ id: "resp-1", content: "Contenu existant" }}
			/>,
		);
		const textarea = screen.getByRole("textbox");
		expect(textarea).toHaveValue("Contenu existant");
	});

	it("renders delete button when existing response", () => {
		render(
			<ReviewResponseForm
				reviewId="rev-1"
				existingResponse={{ id: "resp-1", content: "Merci !" }}
			/>,
		);
		expect(screen.getByRole("button", { name: "Supprimer la réponse" })).toBeInTheDocument();
	});

	it("does not render delete button when no existing response", () => {
		render(<ReviewResponseForm reviewId="rev-1" />);
		expect(screen.queryByRole("button", { name: "Supprimer la réponse" })).toBeNull();
	});

	it("renders character counter", () => {
		render(<ReviewResponseForm reviewId="rev-1" />);
		expect(screen.getByText(/\/1000/)).toBeInTheDocument();
	});

	it("renders the textarea with placeholder", () => {
		render(<ReviewResponseForm reviewId="rev-1" />);
		expect(screen.getByPlaceholderText("Écrivez votre réponse...")).toBeInTheDocument();
	});
});
