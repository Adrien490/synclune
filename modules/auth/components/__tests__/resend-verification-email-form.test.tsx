import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ResendVerificationEmailForm } from "../resend-verification-email-form";

// Hoisted mocks
const { mockState, mockAction, mockIsPending, mockShake } = vi.hoisted(() => ({
	mockState: { value: undefined as any },
	mockAction: vi.fn(),
	mockIsPending: { value: false },
	mockShake: { shake: false, onShakeComplete: vi.fn() },
}));

vi.mock("@/shared/components/forms", () => ({
	useAppForm: () => ({
		AppField: ({ children, name }: any) => {
			const field = {
				InputField: (props: any) => (
					<div data-testid={`field-${name}`}>
						<label>{props.label}</label>
						<input
							name={name}
							type={props.type ?? "text"}
							disabled={props.disabled}
							required={props.required}
							inputMode={props.inputMode}
							enterKeyHint={props.enterKeyHint}
							autoComplete={props.autoComplete}
							autoCapitalize={props.autoCapitalize}
							autoCorrect={props.autoCorrect}
							spellCheck={props.spellCheck}
						/>
					</div>
				),
				PasswordInputField: (props: any) => (
					<div data-testid={`field-${name}`}>
						<label>{props.label}</label>
						<input
							name={name}
							type="password"
							disabled={props.disabled}
							required={props.required}
							autoComplete={props.autoComplete}
							enterKeyHint={props.enterKeyHint}
						/>
					</div>
				),
			};
			return <div>{children(field)}</div>;
		},
		Subscribe: ({ children, selector }: any) => {
			if (selector) {
				const result = selector({ canSubmit: true, isSubmitting: false, values: { email: "" } });
				return <div>{children(Array.isArray(result) ? result : result)}</div>;
			}
			return <div>{children([true])}</div>;
		},
		handleSubmit: vi.fn(),
		reset: vi.fn(),
		state: { isValid: true, values: { email: "" } },
	}),
}));

vi.mock("@/modules/auth/hooks/use-resend-verification-email", () => ({
	useResendVerificationEmail: () => ({
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

vi.mock("@/shared/components/animations/error-shake", () => ({
	ErrorShake: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@/shared/components/ui/field", () => ({
	FieldSet: ({ children }: any) => <div>{children}</div>,
	FieldGroup: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@phosphor-icons/react/ssr", () => ({
	WarningCircleIcon: () => <svg data-testid="icon-alert" />,
	CheckCircleIcon: () => <svg data-testid="icon-check" />,
	XCircleIcon: () => <svg data-testid="icon-x" />,
	SpinnerIcon: () => <svg data-testid="loader" />,
	EnvelopeIcon: () => <svg data-testid="icon-mail" />,
}));

afterEach(cleanup);

beforeEach(() => {
	vi.clearAllMocks();
	mockState.value = undefined;
	mockIsPending.value = false;
	mockShake.shake = false;
});

describe("ResendVerificationEmailForm", () => {
	it("renders email field", () => {
		render(<ResendVerificationEmailForm />);
		expect(screen.getByTestId("field-email")).toBeDefined();
		expect(screen.getByText("Email")).toBeDefined();
	});

	it("shows 'Renvoyer l'email de vérification' button by default", () => {
		render(<ResendVerificationEmailForm />);
		expect(screen.getByRole("button", { name: /renvoyer l'email de vérification/i })).toBeDefined();
	});

	it("shows 'Envoi en cours…' when isPending", () => {
		mockIsPending.value = true;
		render(<ResendVerificationEmailForm />);
		expect(screen.getByText("Envoi en cours…")).toBeDefined();
	});

	it("shows 'Email envoyé' button text on SUCCESS", () => {
		mockState.value = { status: "success", message: "Email envoyé avec succès." };
		render(<ResendVerificationEmailForm />);
		expect(screen.getByRole("button", { name: /email envoyé/i })).toBeDefined();
	});

	it("shows success alert on SUCCESS", () => {
		mockState.value = { status: "success", message: "Email envoyé avec succès." };
		render(<ResendVerificationEmailForm />);
		expect(screen.getByTestId("success-alert")).toBeDefined();
		expect(screen.getByText("Email envoyé avec succès.")).toBeDefined();
	});

	it("shows error alert on error", () => {
		mockState.value = { status: "error", message: "Email introuvable" };
		render(<ResendVerificationEmailForm />);
		expect(screen.getByTestId("error-alert")).toBeDefined();
		expect(screen.getByText("Email introuvable")).toBeDefined();
	});

	it("shows Mail icon when idle", () => {
		render(<ResendVerificationEmailForm />);
		expect(screen.getByTestId("icon-mail")).toBeDefined();
		expect(screen.queryByTestId("loader")).toBeNull();
	});

	it("shows loader icon when isPending", () => {
		mockIsPending.value = true;
		render(<ResendVerificationEmailForm />);
		expect(screen.getByTestId("loader")).toBeDefined();
		expect(screen.queryByTestId("icon-mail")).toBeNull();
	});

	it("hides alerts when state is undefined", () => {
		render(<ResendVerificationEmailForm />);
		expect(screen.queryByTestId("success-alert")).toBeNull();
		expect(screen.queryByTestId("error-alert")).toBeNull();
	});

	// ─── Mobile native 2026 attributes ────────────────────────────────────────

	it("email input has mobile keyboard attributes (enterKeyHint='send')", () => {
		render(<ResendVerificationEmailForm />);
		const emailInput = screen.getByTestId("field-email").querySelector("input")!;
		expect(emailInput.getAttribute("inputMode")).toBe("email");
		expect(emailInput.getAttribute("enterKeyHint")).toBe("send");
		expect(emailInput.getAttribute("autoComplete")).toBe("email");
	});

	it("submit button has aria-busy when pending", () => {
		mockIsPending.value = true;
		render(<ResendVerificationEmailForm />);
		const button = screen.getByRole("button");
		expect(button.getAttribute("aria-busy")).toBe("true");
	});

	it("success alert has role='status' with aria-live='polite'", () => {
		mockState.value = { status: "success", message: "Email envoyé" };
		render(<ResendVerificationEmailForm />);
		const alert = screen.getByTestId("success-alert");
		expect(alert.getAttribute("role")).toBe("status");
		expect(alert.getAttribute("aria-live")).toBe("polite");
	});

	it("error alert has role='alert' with aria-live='assertive'", () => {
		mockState.value = { status: "error", message: "Impossible d'envoyer" };
		render(<ResendVerificationEmailForm />);
		const alert = screen.getByTestId("error-alert");
		expect(alert.getAttribute("role")).toBe("alert");
		expect(alert.getAttribute("aria-live")).toBe("assertive");
	});
});
