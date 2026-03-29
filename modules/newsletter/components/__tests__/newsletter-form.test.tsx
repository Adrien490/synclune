import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ActionStatus, type ActionState } from "@/shared/types/server-action";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockAction, mockIsPending, mockState, mockReset, mockCanSubmit } = vi.hoisted(() => ({
	mockAction: vi.fn(),
	mockIsPending: { value: false },
	mockState: {
		value: undefined as ActionState | undefined,
	},
	mockReset: vi.fn(),
	mockCanSubmit: { value: true },
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
						"aria-invalid": ariaInvalid,
						"aria-describedby": ariaDescribedby,
						disabled,
						required,
						inputMode,
					}: {
						type?: string;
						"aria-label"?: string;
						"aria-invalid"?: boolean | "true" | "false";
						"aria-describedby"?: string;
						disabled?: boolean;
						required?: boolean;
						inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
					}) => (
						<input
							data-testid={`input-${name}`}
							type={type}
							aria-label={ariaLabel}
							aria-invalid={ariaInvalid}
							aria-describedby={ariaDescribedby}
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
		}) => <>{children([mockCanSubmit.value])}</>,
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
	mockCanSubmit.value = true;
	vi.mocked(useSubscribeToNewsletter).mockReturnValue({
		action: mockAction,
		isPending: false,
		state: undefined,
	});
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

	// ─── No alert edge cases ──────────────────────────────────────────────────

	it("does not show any alert when state is undefined", () => {
		render(<NewsletterForm />);
		expect(screen.queryByTestId("alert")).not.toBeInTheDocument();
	});

	it("does not show success alert when SUCCESS state has no message", () => {
		vi.mocked(useSubscribeToNewsletter).mockReturnValue({
			action: mockAction,
			isPending: false,
			state: { status: ActionStatus.SUCCESS, message: "" },
		});
		render(<NewsletterForm />);
		// Alert only renders when state.message is truthy
		expect(screen.queryByTestId("alert")).not.toBeInTheDocument();
	});

	it("does not show error alert for VALIDATION_ERROR status", () => {
		vi.mocked(useSubscribeToNewsletter).mockReturnValue({
			action: mockAction,
			isPending: false,
			state: { status: ActionStatus.VALIDATION_ERROR, message: "Champ invalide" },
		});
		render(<NewsletterForm />);
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
	});

	// ─── Submit button disabled states ────────────────────────────────────────

	it("disables submit button when canSubmit is false", () => {
		mockCanSubmit.value = false;
		render(<NewsletterForm />);
		expect(screen.getByRole("button")).toBeDisabled();
	});

	it("disables submit button when isPending is true", () => {
		vi.mocked(useSubscribeToNewsletter).mockReturnValue({
			action: mockAction,
			isPending: true,
			state: undefined,
		});
		render(<NewsletterForm />);
		expect(screen.getByRole("button")).toBeDisabled();
	});

	it("disables submit button when isSuccess is true (SUCCESS state)", () => {
		vi.mocked(useSubscribeToNewsletter).mockReturnValue({
			action: mockAction,
			isPending: false,
			state: { status: ActionStatus.SUCCESS, message: "Bienvenue !" },
		});
		render(<NewsletterForm />);
		expect(screen.getByRole("button")).toBeDisabled();
	});

	it("enables submit button when canSubmit is true and not pending or successful", () => {
		render(<NewsletterForm />);
		expect(screen.getByRole("button")).not.toBeDisabled();
	});

	// ─── Field disabled on success ────────────────────────────────────────────

	it("disables email input when isSuccess is true (SUCCESS state)", () => {
		vi.mocked(useSubscribeToNewsletter).mockReturnValue({
			action: mockAction,
			isPending: false,
			state: { status: ActionStatus.SUCCESS, message: "Bienvenue !" },
		});
		render(<NewsletterForm />);
		expect(screen.getByTestId("input-email")).toBeDisabled();
	});

	it("disables consent checkbox when isSuccess is true (SUCCESS state)", () => {
		vi.mocked(useSubscribeToNewsletter).mockReturnValue({
			action: mockAction,
			isPending: false,
			state: { status: ActionStatus.SUCCESS, message: "Bienvenue !" },
		});
		render(<NewsletterForm />);
		expect(screen.getByTestId("checkbox-consent")).toBeDisabled();
	});

	// ─── Form element attributes ──────────────────────────────────────────────

	it("sets aria-busy='true' on form when isPending is true", () => {
		vi.mocked(useSubscribeToNewsletter).mockReturnValue({
			action: mockAction,
			isPending: true,
			state: undefined,
		});
		const { container } = render(<NewsletterForm />);
		const form = container.querySelector("form");
		expect(form?.getAttribute("aria-busy")).toBe("true");
	});

	it("sets aria-busy='false' on form when not pending", () => {
		const { container } = render(<NewsletterForm />);
		const form = container.querySelector("form");
		expect(form?.getAttribute("aria-busy")).toBe("false");
	});

	it("sets data-pending attribute on form when isPending is true", () => {
		vi.mocked(useSubscribeToNewsletter).mockReturnValue({
			action: mockAction,
			isPending: true,
			state: undefined,
		});
		const { container } = render(<NewsletterForm />);
		const form = container.querySelector("form");
		expect(form?.hasAttribute("data-pending")).toBe(true);
	});

	it("does not set data-pending attribute when not pending", () => {
		const { container } = render(<NewsletterForm />);
		const form = container.querySelector("form");
		expect(form?.hasAttribute("data-pending")).toBe(false);
	});

	// ─── Error aria attributes on email input ─────────────────────────────────

	it("sets aria-invalid on email input when server error is present", () => {
		vi.mocked(useSubscribeToNewsletter).mockReturnValue({
			action: mockAction,
			isPending: false,
			state: { status: ActionStatus.ERROR, message: "Email déjà inscrit" },
		});
		render(<NewsletterForm />);
		expect(screen.getByTestId("input-email")).toHaveAttribute("aria-invalid", "true");
	});

	it("sets aria-describedby on email input when server error is present", () => {
		vi.mocked(useSubscribeToNewsletter).mockReturnValue({
			action: mockAction,
			isPending: false,
			state: { status: ActionStatus.ERROR, message: "Email déjà inscrit" },
		});
		render(<NewsletterForm />);
		expect(screen.getByTestId("input-email")).toHaveAttribute(
			"aria-describedby",
			"newsletter-server-error",
		);
	});

	it("does not set aria-invalid on email input when no server error", () => {
		render(<NewsletterForm />);
		expect(screen.getByTestId("input-email")).not.toHaveAttribute("aria-invalid");
	});

	// ─── Privacy policy link ──────────────────────────────────────────────────

	it("privacy policy link points to /confidentialite", () => {
		render(<NewsletterForm />);
		const link = screen.getByRole("link", { name: /politique de confidentialité/i });
		expect(link.getAttribute("href")).toBe("/confidentialite");
	});

	it("privacy policy link opens in new tab", () => {
		render(<NewsletterForm />);
		const link = screen.getByRole("link", { name: /politique de confidentialité/i });
		expect(link.getAttribute("target")).toBe("_blank");
	});

	it("privacy policy link has rel='noopener noreferrer'", () => {
		render(<NewsletterForm />);
		const link = screen.getByRole("link", { name: /politique de confidentialité/i });
		expect(link.getAttribute("rel")).toBe("noopener noreferrer");
	});

	it("privacy policy link has descriptive aria-label for screen readers", () => {
		render(<NewsletterForm />);
		const link = screen.getByRole("link", { name: /politique de confidentialité/i });
		expect(link.getAttribute("aria-label")).toBeTruthy();
	});

	// ─── Email input attributes ───────────────────────────────────────────────

	it("renders email input with inputMode='email'", () => {
		render(<NewsletterForm />);
		expect(screen.getByTestId("input-email")).toHaveAttribute("inputmode", "email");
	});

	it("renders email input as required", () => {
		render(<NewsletterForm />);
		expect(screen.getByTestId("input-email")).toHaveAttribute("required");
	});
});
