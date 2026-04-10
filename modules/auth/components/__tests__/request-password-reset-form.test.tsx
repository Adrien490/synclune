import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RequestPasswordResetForm } from "../request-password-reset-form";

// Hoisted mocks
const { mockState, mockAction, mockIsPending, mockShake, mockCanSubmit, mockHandleSubmit } =
	vi.hoisted(() => ({
		mockState: { value: undefined as any },
		mockAction: vi.fn(),
		mockIsPending: { value: false },
		mockShake: { shake: false, onShakeComplete: vi.fn() },
		mockCanSubmit: { value: true },
		mockHandleSubmit: vi.fn(),
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
					values: { email: "" },
				});
				return <div>{children(Array.isArray(result) ? result : result)}</div>;
			}
			return <div>{children([mockCanSubmit.value])}</div>;
		},
		handleSubmit: mockHandleSubmit,
		reset: vi.fn(),
	}),
}));

vi.mock("@/modules/auth/hooks/use-request-password-reset", () => ({
	useRequestPasswordReset: () => ({
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

vi.mock("@/shared/components/ui/field", () => ({
	FieldSet: ({ children }: any) => <div>{children}</div>,
	FieldGroup: ({ children }: any) => <div>{children}</div>,
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

describe("RequestPasswordResetForm", () => {
	it("renders email field", () => {
		render(<RequestPasswordResetForm />);
		expect(screen.getByTestId("field-email")).toBeDefined();
		expect(screen.getByText("Email")).toBeDefined();
	});

	it("shows 'Envoyer le lien de réinitialisation' button by default", () => {
		render(<RequestPasswordResetForm />);
		expect(
			screen.getByRole("button", { name: /envoyer le lien de réinitialisation/i }),
		).toBeDefined();
	});

	it("shows 'Envoi en cours...' when isPending", () => {
		mockIsPending.value = true;
		render(<RequestPasswordResetForm />);
		expect(screen.getByText("Envoi en cours...")).toBeDefined();
	});

	it("shows loader icon when isPending", () => {
		mockIsPending.value = true;
		render(<RequestPasswordResetForm />);
		expect(screen.getByTestId("loader")).toBeDefined();
	});

	it("shows 'Email envoyé' button text on SUCCESS", () => {
		mockState.value = { status: "success", message: "Email envoyé avec succès." };
		render(<RequestPasswordResetForm />);
		expect(screen.getByRole("button", { name: /email envoyé/i })).toBeDefined();
	});

	it("shows success alert on SUCCESS", () => {
		mockState.value = { status: "success", message: "Email envoyé avec succès." };
		render(<RequestPasswordResetForm />);
		expect(screen.getByTestId("success-alert")).toBeDefined();
		expect(screen.getByText("Email envoyé avec succès.")).toBeDefined();
	});

	it("shows error alert on error", () => {
		mockState.value = { status: "error", message: "Adresse email introuvable" };
		render(<RequestPasswordResetForm />);
		expect(screen.getByTestId("error-alert")).toBeDefined();
		expect(screen.getByText("Adresse email introuvable")).toBeDefined();
	});

	it("hides alerts when state is undefined", () => {
		render(<RequestPasswordResetForm />);
		expect(screen.queryByTestId("success-alert")).toBeNull();
		expect(screen.queryByTestId("error-alert")).toBeNull();
	});

	it("renders RequiredFieldsNote", () => {
		render(<RequestPasswordResetForm />);
		expect(screen.getByTestId("required-note")).toBeDefined();
	});

	// ─── Disabled states on SUCCESS ───────────────────────────────────────────

	it("disables email field when state is SUCCESS", () => {
		mockState.value = { status: "success", message: "Email envoyé avec succès." };
		render(<RequestPasswordResetForm />);
		expect(screen.getByTestId("field-email").querySelector("input")).toBeDisabled();
	});

	it("disables submit button when state is SUCCESS", () => {
		mockState.value = { status: "success", message: "Email envoyé avec succès." };
		render(<RequestPasswordResetForm />);
		expect(screen.getByRole("button", { name: /email envoyé/i })).toBeDisabled();
	});

	// ─── VALIDATION_ERROR and INITIAL filters ─────────────────────────────────

	it("does not show error alert for VALIDATION_ERROR status", () => {
		mockState.value = { status: "validation_error", message: "Champ invalide" };
		render(<RequestPasswordResetForm />);
		expect(screen.queryByTestId("error-alert")).toBeNull();
		expect(screen.queryByTestId("success-alert")).toBeNull();
	});

	it("does not show error alert for INITIAL status", () => {
		mockState.value = { status: "initial", message: "Chargement..." };
		render(<RequestPasswordResetForm />);
		expect(screen.queryByTestId("error-alert")).toBeNull();
	});

	// ─── canSubmit ────────────────────────────────────────────────────────────

	it("disables submit button when canSubmit is false", () => {
		mockCanSubmit.value = false;
		render(<RequestPasswordResetForm />);
		expect(screen.getByRole("button")).toBeDisabled();
	});

	it("disables email field when isPending", () => {
		mockIsPending.value = true;
		render(<RequestPasswordResetForm />);
		expect(screen.getByTestId("field-email").querySelector("input")).toBeDisabled();
	});

	// ─── Accessibility ────────────────────────────────────────────────────────

	it("success alert has role='status' for polite announcement", () => {
		mockState.value = { status: "success", message: "Email envoyé avec succès." };
		render(<RequestPasswordResetForm />);
		expect(screen.getByRole("status")).toBeDefined();
	});

	it("error alert has role='alert' for assertive announcement", () => {
		mockState.value = { status: "error", message: "Adresse email introuvable" };
		render(<RequestPasswordResetForm />);
		expect(screen.getByRole("alert")).toBeDefined();
	});

	// ─── Form submission ──────────────────────────────────────────────────────

	it("calls form.handleSubmit when form is submitted", () => {
		render(<RequestPasswordResetForm />);
		const form = document.querySelector("form");
		expect(form).not.toBeNull();
		fireEvent.submit(form!);
		expect(mockHandleSubmit).toHaveBeenCalledTimes(1);
	});
});
