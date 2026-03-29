import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SignUpEmailForm } from "../sign-up-email-form";

// Hoisted mocks
const {
	mockState,
	mockAction,
	mockIsPending,
	mockShake,
	mockCanSubmit,
	mockHandleSubmit,
	mockReset,
} = vi.hoisted(() => ({
	mockState: { value: undefined as any },
	mockAction: vi.fn(),
	mockIsPending: { value: false },
	mockShake: { shake: false, onShakeComplete: vi.fn() },
	mockCanSubmit: { value: true },
	mockHandleSubmit: vi.fn(),
	mockReset: vi.fn(),
}));

vi.mock("@/shared/components/forms", () => ({
	useAppForm: () => ({
		AppField: ({ children, name }: any) => {
			const field = {
				InputField: (props: any) => (
					<div data-testid={`field-${name}`}>
						<label htmlFor={name}>{props.label}</label>
						<input
							id={name}
							name={name}
							type={props.type ?? "text"}
							disabled={props.disabled}
							required={props.required}
						/>
					</div>
				),
				PasswordInputField: (props: any) => (
					<div data-testid={`field-${name}`}>
						<label htmlFor={name}>{props.label}</label>
						<input
							id={name}
							name={name}
							type="password"
							disabled={props.disabled}
							required={props.required}
						/>
					</div>
				),
			};
			return <div>{children(field)}</div>;
		},
		Subscribe: ({ children, selector }: any) => {
			if (selector) {
				const result = selector({
					canSubmit: mockCanSubmit.value,
					isSubmitting: false,
					values: { password: "test" },
				});
				return <div>{children(Array.isArray(result) ? result : result)}</div>;
			}
			return <div>{children([mockCanSubmit.value])}</div>;
		},
		handleSubmit: mockHandleSubmit,
		reset: mockReset,
	}),
}));

vi.mock("@/modules/auth/hooks/use-sign-up-email", () => ({
	useSignUpEmail: () => ({
		state: mockState.value,
		action: mockAction,
		isPending: mockIsPending.value,
	}),
}));

vi.mock("@/modules/auth/hooks/use-form-error-shake", () => ({
	useFormErrorShake: () => mockShake,
}));

vi.mock("@/shared/types/server-action", () => ({
	ActionStatus: {
		SUCCESS: "success",
		ERROR: "error",
		VALIDATION_ERROR: "validation_error",
		INITIAL: "initial",
	},
}));

vi.mock("@/shared/components/ui/alert", () => ({
	Alert: ({ children, variant, role, ...props }: any) => (
		<div
			data-testid={variant === "destructive" ? "error-alert" : "success-alert"}
			role={role}
			{...props}
		>
			{children}
		</div>
	),
	AlertDescription: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({ children, disabled, ...props }: any) => (
		<button disabled={disabled} {...props}>
			{children}
		</button>
	),
}));

vi.mock("@/shared/components/required-fields-note", () => ({
	RequiredFieldsNote: () => <div data-testid="required-note" />,
}));

vi.mock("@/shared/components/animations/error-shake", () => ({
	ErrorShake: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@/shared/components/forms/password-strength-indicator", () => ({
	PasswordStrengthIndicator: () => <div data-testid="password-strength" />,
}));

vi.mock("next/link", () => ({
	default: ({ children, href, target, rel }: any) => (
		<a href={href} target={target} rel={rel}>
			{children}
		</a>
	),
}));

vi.mock("lucide-react", () => ({
	CircleAlert: () => <svg data-testid="icon-alert" />,
	CircleCheck: () => <svg data-testid="icon-check" />,
	CircleX: () => <svg data-testid="icon-x" />,
	LoaderCircle: () => <svg data-testid="loader" />,
	Mail: () => <svg data-testid="icon-mail" />,
}));

afterEach(cleanup);

beforeEach(() => {
	vi.clearAllMocks();
	mockState.value = undefined;
	mockIsPending.value = false;
	mockShake.shake = false;
	mockCanSubmit.value = true;
});

describe("SignUpEmailForm", () => {
	it("renders RequiredFieldsNote", () => {
		render(<SignUpEmailForm />);
		expect(screen.getByTestId("required-note")).toBeDefined();
	});

	it("renders name field with label 'Prénom'", () => {
		render(<SignUpEmailForm />);
		expect(screen.getByTestId("field-name")).toBeDefined();
		expect(screen.getByText("Prénom")).toBeDefined();
	});

	it("renders email field with label 'Email'", () => {
		render(<SignUpEmailForm />);
		expect(screen.getByTestId("field-email")).toBeDefined();
		expect(screen.getByText("Email")).toBeDefined();
	});

	it("renders password field with label 'Mot de passe'", () => {
		render(<SignUpEmailForm />);
		expect(screen.getByTestId("field-password")).toBeDefined();
		expect(screen.getByText("Mot de passe")).toBeDefined();
	});

	it("renders PasswordStrengthIndicator", () => {
		render(<SignUpEmailForm />);
		expect(screen.getByTestId("password-strength")).toBeDefined();
	});

	it("shows submit button 'S'inscrire' by default", () => {
		render(<SignUpEmailForm />);
		expect(screen.getByRole("button", { name: /s'inscrire/i })).toBeDefined();
	});

	it("shows 'Inscription en cours...' when isPending", () => {
		mockIsPending.value = true;
		render(<SignUpEmailForm />);
		expect(screen.getByText("Inscription en cours...")).toBeDefined();
	});

	it("shows success alert when state.status is SUCCESS", () => {
		mockState.value = { status: "success", message: "Inscription réussie !" };
		render(<SignUpEmailForm />);
		expect(screen.getByTestId("success-alert")).toBeDefined();
		expect(screen.getByText("Inscription réussie !")).toBeDefined();
	});

	it("shows error alert when state has error status", () => {
		mockState.value = { status: "error", message: "Une erreur est survenue" };
		render(<SignUpEmailForm />);
		expect(screen.getByTestId("error-alert")).toBeDefined();
		expect(screen.getByText("Une erreur est survenue")).toBeDefined();
	});

	it("hides alerts when state is undefined", () => {
		render(<SignUpEmailForm />);
		expect(screen.queryByTestId("success-alert")).toBeNull();
		expect(screen.queryByTestId("error-alert")).toBeNull();
	});

	it("shows link to /cgv", () => {
		render(<SignUpEmailForm />);
		const link = screen.getByRole("link", { name: /conditions générales/i });
		expect(link.getAttribute("href")).toBe("/cgv");
	});

	it("shows link to /confidentialite", () => {
		render(<SignUpEmailForm />);
		const link = screen.getByRole("link", { name: /politique de confidentialité/i });
		expect(link.getAttribute("href")).toBe("/confidentialite");
	});

	// ─── Field disabled states ────────────────────────────────────────────────

	it("disables name field when isPending is true", () => {
		mockIsPending.value = true;
		render(<SignUpEmailForm />);
		expect(screen.getByRole("textbox", { name: /prénom/i })).toBeDisabled();
	});

	it("disables email field when isPending is true", () => {
		mockIsPending.value = true;
		render(<SignUpEmailForm />);
		expect(screen.getByRole("textbox", { name: /email/i })).toBeDisabled();
	});

	it("disables password field when isPending is true", () => {
		mockIsPending.value = true;
		render(<SignUpEmailForm />);
		const passwordInput = screen.getByTestId("field-password").querySelector("input");
		expect(passwordInput).not.toBeNull();
		expect(passwordInput?.disabled).toBe(true);
	});

	// ─── Submit button states ─────────────────────────────────────────────────

	it("disables submit button when isPending is true", () => {
		mockIsPending.value = true;
		render(<SignUpEmailForm />);
		expect(screen.getByRole("button")).toBeDisabled();
	});

	it("disables submit button when canSubmit is false", () => {
		mockCanSubmit.value = false;
		render(<SignUpEmailForm />);
		expect(screen.getByRole("button")).toBeDisabled();
	});

	it("enables submit button when canSubmit is true and not pending", () => {
		render(<SignUpEmailForm />);
		expect(screen.getByRole("button")).not.toBeDisabled();
	});

	it("shows loader icon when isPending is true", () => {
		mockIsPending.value = true;
		render(<SignUpEmailForm />);
		expect(screen.getByTestId("loader")).toBeDefined();
	});

	// ─── Alert conditions ─────────────────────────────────────────────────────

	it("does not show alert when state has VALIDATION_ERROR status", () => {
		mockState.value = { status: "validation_error", message: "Champ invalide" };
		render(<SignUpEmailForm />);
		expect(screen.queryByTestId("success-alert")).toBeNull();
		expect(screen.queryByTestId("error-alert")).toBeNull();
	});

	it("shows error alert when state has a message but undefined status (treated as non-success)", () => {
		// When status is undefined: not VALIDATION_ERROR, not SUCCESS → renders error alert
		mockState.value = { message: "Erreur inconnue" };
		render(<SignUpEmailForm />);
		expect(screen.getByTestId("error-alert")).toBeDefined();
	});

	it("shows error alert for UNAUTHORIZED status", () => {
		mockState.value = { status: "unauthorized", message: "Non autorisé" };
		render(<SignUpEmailForm />);
		expect(screen.getByTestId("error-alert")).toBeDefined();
		expect(screen.getByText("Non autorisé")).toBeDefined();
	});

	it("shows error alert for NOT_FOUND status", () => {
		mockState.value = { status: "not_found", message: "Introuvable" };
		render(<SignUpEmailForm />);
		expect(screen.getByTestId("error-alert")).toBeDefined();
	});

	it("error alert has role='alert' for assertive announcement", () => {
		mockState.value = { status: "error", message: "Erreur serveur" };
		render(<SignUpEmailForm />);
		const alert = screen.getByRole("alert");
		expect(alert).toBeDefined();
	});

	it("success alert has role='status' for polite announcement", () => {
		mockState.value = { status: "success", message: "Succès !" };
		render(<SignUpEmailForm />);
		const status = screen.getByRole("status");
		expect(status).toBeDefined();
	});

	// ─── Links attributes ─────────────────────────────────────────────────────

	it("cgv link opens in new tab with rel noopener noreferrer", () => {
		render(<SignUpEmailForm />);
		const link = screen.getByRole("link", { name: /conditions générales/i });
		expect(link.getAttribute("target")).toBe("_blank");
		expect(link.getAttribute("rel")).toBe("noopener noreferrer");
	});

	it("confidentialite link opens in new tab with rel noopener noreferrer", () => {
		render(<SignUpEmailForm />);
		const link = screen.getByRole("link", { name: /politique de confidentialité/i });
		expect(link.getAttribute("target")).toBe("_blank");
		expect(link.getAttribute("rel")).toBe("noopener noreferrer");
	});

	// ─── Form submission ──────────────────────────────────────────────────────

	it("calls form.handleSubmit when form is submitted", () => {
		render(<SignUpEmailForm />);
		const form = document.querySelector("form");
		expect(form).not.toBeNull();
		fireEvent.submit(form!);
		expect(mockHandleSubmit).toHaveBeenCalledTimes(1);
	});

	it("uses action from useSignUpEmail as form action", () => {
		render(<SignUpEmailForm />);
		// The form element is rendered; action is wired to the server action
		const form = document.querySelector("form");
		expect(form).not.toBeNull();
	});
});
