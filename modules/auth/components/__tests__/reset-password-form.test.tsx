import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ResetPasswordForm } from "../reset-password-form";

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
							type={props.type || "text"}
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
					canSubmit: true,
					isSubmitting: false,
					values: { password: "test123" },
				});
				return <div>{children(Array.isArray(result) ? result : result)}</div>;
			}
			return <div>{children([true])}</div>;
		},
		handleSubmit: vi.fn(),
		reset: vi.fn(),
	}),
}));

vi.mock("@/modules/auth/hooks/use-reset-password", () => ({
	useResetPassword: () => ({
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

vi.mock("@/shared/components/ui/field", () => ({
	FieldSet: ({ children }: any) => <div>{children}</div>,
	FieldGroup: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("next/link", () => ({
	default: ({ children, href }: any) => <a href={href}>{children}</a>,
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
});

describe("ResetPasswordForm", () => {
	it("renders password field with label 'Nouveau mot de passe'", () => {
		render(<ResetPasswordForm token="abc123" />);
		expect(screen.getByTestId("field-password")).toBeDefined();
		expect(screen.getByText("Nouveau mot de passe")).toBeDefined();
	});

	it("renders confirm password field with label 'Confirmer le mot de passe'", () => {
		render(<ResetPasswordForm token="abc123" />);
		expect(screen.getByTestId("field-confirmPassword")).toBeDefined();
		expect(screen.getByText("Confirmer le mot de passe")).toBeDefined();
	});

	it("has hidden token input with the provided token value", () => {
		render(<ResetPasswordForm token="abc123" />);
		const hidden = screen.getByDisplayValue("abc123") as HTMLInputElement;
		expect(hidden.type).toBe("hidden");
		expect(hidden.name).toBe("token");
	});

	it("renders PasswordStrengthIndicator", () => {
		render(<ResetPasswordForm token="abc123" />);
		expect(screen.getByTestId("password-strength")).toBeDefined();
	});

	it("shows submit button 'Réinitialiser mon mot de passe' by default", () => {
		render(<ResetPasswordForm token="abc123" />);
		expect(screen.getByRole("button", { name: /réinitialiser mon mot de passe/i })).toBeDefined();
	});

	it("shows success alert when state.status is SUCCESS", () => {
		mockState.value = { status: "success", message: "Mot de passe mis à jour avec succès." };
		render(<ResetPasswordForm token="abc123" />);
		expect(screen.getByTestId("success-alert")).toBeDefined();
		expect(screen.getByText("Mot de passe mis à jour avec succès.")).toBeDefined();
	});

	it("shows 'Se connecter maintenant' link to /connexion in success state", () => {
		mockState.value = { status: "success", message: "Succès" };
		render(<ResetPasswordForm token="abc123" />);
		const link = screen.getByRole("link", { name: /se connecter maintenant/i });
		expect(link.getAttribute("href")).toBe("/connexion");
	});

	it("shows 'Mot de passe réinitialisé' button text on success", () => {
		mockState.value = { status: "success", message: "Succès" };
		render(<ResetPasswordForm token="abc123" />);
		expect(screen.getByRole("button", { name: /mot de passe réinitialisé/i })).toBeDefined();
	});

	it("shows error alert on error", () => {
		mockState.value = { status: "error", message: "Token invalide ou expiré" };
		render(<ResetPasswordForm token="abc123" />);
		expect(screen.getByTestId("error-alert")).toBeDefined();
		expect(screen.getByText("Token invalide ou expiré")).toBeDefined();
	});

	it("hides alerts when state is undefined", () => {
		render(<ResetPasswordForm token="abc123" />);
		expect(screen.queryByTestId("success-alert")).toBeNull();
		expect(screen.queryByTestId("error-alert")).toBeNull();
	});
});
