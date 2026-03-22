import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ActionStatus, type ActionState } from "@/shared/types/server-action";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockAction, mockIsPending, mockState, mockReset } = vi.hoisted(() => ({
	mockAction: vi.fn(),
	mockIsPending: { value: false },
	mockState: {
		value: undefined as ActionState | undefined,
	},
	mockReset: vi.fn(),
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/modules/newsletter/hooks/use-subscribe-to-newsletter", () => ({
	useSubscribeToNewsletter: vi.fn(() => ({
		action: mockAction,
		isPending: mockIsPending.value,
		state: mockState.value,
	})),
}));

vi.mock("@/shared/components/forms", () => ({
	useAppForm: vi.fn(() => ({
		reset: mockReset,
		handleSubmit: vi.fn(),
		AppField: ({
			children,
			name,
		}: {
			children: (field: Record<string, unknown>) => React.ReactNode;
			name: string;
		}) => (
			<div data-testid={`field-${name}`}>
				{children({
					name,
					InputField: ({
						type,
						"aria-label": ariaLabel,
						disabled,
						required,
						inputMode,
					}: {
						type?: string;
						"aria-label"?: string;
						disabled?: boolean;
						required?: boolean;
						inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
					}) => (
						<input
							data-testid={`input-${name}`}
							type={type}
							aria-label={ariaLabel}
							disabled={disabled}
							required={required}
							inputMode={inputMode}
						/>
					),
					CheckboxField: ({
						label,
						disabled,
					}: {
						label: React.ReactNode;
						"aria-label"?: string;
						disabled?: boolean;
						required?: boolean;
					}) => (
						<label>
							<input data-testid={`checkbox-${name}`} type="checkbox" disabled={disabled} />
							{label}
						</label>
					),
				})}
			</div>
		),
		Subscribe: ({
			children,
		}: {
			children: (values: unknown[]) => React.ReactNode;
			selector: (state: Record<string, unknown>) => unknown[];
		}) => <>{children([true])}</>,
	})),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		disabled,
		type,
		className,
	}: {
		children: React.ReactNode;
		disabled?: boolean;
		type?: string;
		className?: string;
	}) => (
		<button
			disabled={disabled}
			type={type as "submit" | "button" | "reset" | undefined}
			className={className}
		>
			{children}
		</button>
	),
}));

vi.mock("@/shared/components/ui/alert", () => ({
	Alert: ({
		children,
		role,
		variant,
	}: {
		children: React.ReactNode;
		role?: string;
		variant?: string;
	}) => (
		<div role={role} data-variant={variant} data-testid="alert">
			{children}
		</div>
	),
	AlertDescription: ({
		children,
		id,
		role,
	}: {
		children: React.ReactNode;
		id?: string;
		role?: string;
	}) => (
		<p id={id} role={role}>
			{children}
		</p>
	),
}));

vi.mock("@/shared/components/ui/field", () => ({
	FieldGroup: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<div className={className}>{children}</div>
	),
	FieldLabel: ({
		children,
		htmlFor,
		className,
	}: {
		children: React.ReactNode;
		htmlFor?: string;
		className?: string;
	}) => (
		<label htmlFor={htmlFor} className={className}>
			{children}
		</label>
	),
	FieldSet: ({ children }: { children: React.ReactNode }) => <fieldset>{children}</fieldset>,
}));

vi.mock("next/link", () => ({
	default: ({
		children,
		href,
		target,
		rel,
		"aria-label": ariaLabel,
	}: {
		children: React.ReactNode;
		href: string;
		target?: string;
		rel?: string;
		"aria-label"?: string;
	}) => (
		<a href={href} target={target} rel={rel} aria-label={ariaLabel}>
			{children}
		</a>
	),
}));

vi.mock("lucide-react", () => ({
	Sparkles: ({ className }: { className?: string }) => (
		<svg data-testid="sparkles-icon" className={className} />
	),
}));

vi.mock("@/shared/constants/validation", () => ({
	EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { NewsletterForm } from "../newsletter-form";
import { useSubscribeToNewsletter } from "@/modules/newsletter/hooks/use-subscribe-to-newsletter";

// ============================================================================
// HELPERS
// ============================================================================

beforeEach(() => {
	mockIsPending.value = false;
	mockState.value = undefined;
});

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

// ============================================================================
// TESTS
// ============================================================================

describe("NewsletterForm", () => {
	// ─── Structure ────────────────────────────────────────────────────────────

	it("renders the email input field", () => {
		render(<NewsletterForm />);
		expect(screen.getByTestId("input-email")).toBeInTheDocument();
	});

	it("renders the email input with type='email'", () => {
		render(<NewsletterForm />);
		expect(screen.getByTestId("input-email")).toHaveAttribute("type", "email");
	});

	it("renders the consent checkbox", () => {
		render(<NewsletterForm />);
		expect(screen.getByTestId("checkbox-consent")).toBeInTheDocument();
	});

	it("renders the submit button", () => {
		render(<NewsletterForm />);
		expect(screen.getByRole("button", { name: /s'inscrire/i })).toBeInTheDocument();
	});

	it("renders the submit button with type='submit'", () => {
		render(<NewsletterForm />);
		expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
	});

	it("renders an email address label", () => {
		render(<NewsletterForm />);
		expect(screen.getByText("Adresse email")).toBeInTheDocument();
	});

	it("renders email input with accessible aria-label", () => {
		render(<NewsletterForm />);
		expect(screen.getByTestId("input-email")).toHaveAttribute(
			"aria-label",
			"Votre adresse email pour la newsletter",
		);
	});

	it("renders the email field wrapper", () => {
		render(<NewsletterForm />);
		expect(screen.getByTestId("field-email")).toBeInTheDocument();
	});

	it("renders the consent field wrapper", () => {
		render(<NewsletterForm />);
		expect(screen.getByTestId("field-consent")).toBeInTheDocument();
	});

	it("renders the privacy policy link", () => {
		render(<NewsletterForm />);
		expect(screen.getByText("Politique de confidentialité")).toBeInTheDocument();
	});

	it("renders a fieldset with sr-only legend for accessibility", () => {
		const { container } = render(<NewsletterForm />);
		const legend = container.querySelector("legend");
		expect(legend).not.toBeNull();
		expect(legend?.textContent).toBe("Inscription à la newsletter");
	});

	// ─── Loading state ────────────────────────────────────────────────────────

	it("shows 'Inscription...' text when isPending is true", () => {
		vi.mocked(useSubscribeToNewsletter).mockReturnValue({
			action: mockAction,
			isPending: true,
			state: undefined,
		});
		render(<NewsletterForm />);
		expect(screen.getByRole("button")).toHaveTextContent("Inscription...");
	});

	it("disables email input when isPending is true", () => {
		vi.mocked(useSubscribeToNewsletter).mockReturnValue({
			action: mockAction,
			isPending: true,
			state: undefined,
		});
		render(<NewsletterForm />);
		expect(screen.getByTestId("input-email")).toBeDisabled();
	});

	it("disables consent checkbox when isPending is true", () => {
		vi.mocked(useSubscribeToNewsletter).mockReturnValue({
			action: mockAction,
			isPending: true,
			state: undefined,
		});
		render(<NewsletterForm />);
		expect(screen.getByTestId("checkbox-consent")).toBeDisabled();
	});

	// ─── Success state ────────────────────────────────────────────────────────

	it("shows 'Inscrit(e)' button text on successful submission", () => {
		vi.mocked(useSubscribeToNewsletter).mockReturnValue({
			action: mockAction,
			isPending: false,
			state: { status: ActionStatus.SUCCESS, message: "Inscription confirmée" },
		});
		render(<NewsletterForm />);
		expect(screen.getByRole("button")).toHaveTextContent("Inscrit(e)");
	});

	it("shows sparkles icon on successful submission", () => {
		vi.mocked(useSubscribeToNewsletter).mockReturnValue({
			action: mockAction,
			isPending: false,
			state: { status: ActionStatus.SUCCESS, message: "Inscription confirmée" },
		});
		render(<NewsletterForm />);
		expect(screen.getByTestId("sparkles-icon")).toBeInTheDocument();
	});

	it("shows success alert when state is SUCCESS and has a message", () => {
		vi.mocked(useSubscribeToNewsletter).mockReturnValue({
			action: mockAction,
			isPending: false,
			state: { status: ActionStatus.SUCCESS, message: "Inscription confirmée !" },
		});
		render(<NewsletterForm />);
		expect(screen.getByTestId("alert")).toBeInTheDocument();
		expect(screen.getByText("Inscription confirmée !")).toBeInTheDocument();
	});

	// ─── Error state ──────────────────────────────────────────────────────────

	it("shows error alert when state is ERROR", () => {
		vi.mocked(useSubscribeToNewsletter).mockReturnValue({
			action: mockAction,
			isPending: false,
			state: { status: ActionStatus.ERROR, message: "Email déjà inscrit" },
		});
		render(<NewsletterForm />);
		expect(screen.getByRole("alert")).toBeInTheDocument();
		expect(screen.getByText("Email déjà inscrit")).toBeInTheDocument();
	});

	it("shows error alert when state is CONFLICT", () => {
		vi.mocked(useSubscribeToNewsletter).mockReturnValue({
			action: mockAction,
			isPending: false,
			state: { status: ActionStatus.CONFLICT, message: "Adresse déjà utilisée" },
		});
		render(<NewsletterForm />);
		expect(screen.getByRole("alert")).toBeInTheDocument();
	});
});
