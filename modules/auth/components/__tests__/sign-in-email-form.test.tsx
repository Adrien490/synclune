import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SignInEmailForm } from "../sign-in-email-form";

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
				const result = selector({ canSubmit: true, isSubmitting: false, values: { password: "" } });
				return <div>{children(Array.isArray(result) ? result : result)}</div>;
			}
			return <div>{children([true])}</div>;
		},
		handleSubmit: vi.fn(),
		reset: vi.fn(),
	}),
}));

vi.mock("@/modules/auth/hooks/use-sign-in-email", () => ({
	useSignInEmail: () => ({
		state: mockState.value,
		action: mockAction,
		isPending: mockIsPending.value,
	}),
}));

vi.mock("@/modules/auth/hooks/use-form-error-shake", () => ({
	useFormErrorShake: () => mockShake,
}));

vi.mock("@/modules/auth/constants/error-messages", () => ({
	AUTH_ERROR_CODES: { EMAIL_NOT_VERIFIED: "EMAIL_NOT_VERIFIED" },
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

describe("SignInEmailForm", () => {
	it("renders email field", () => {
		render(<SignInEmailForm callbackURL="/boutique" />);
		expect(screen.getByTestId("field-email")).toBeDefined();
		expect(screen.getByText("Email")).toBeDefined();
	});

	it("renders password field", () => {
		render(<SignInEmailForm callbackURL="/boutique" />);
		expect(screen.getByTestId("field-password")).toBeDefined();
		expect(screen.getByText("Mot de passe")).toBeDefined();
	});

	it("has hidden input with the provided callbackURL value", () => {
		render(<SignInEmailForm callbackURL="/boutique" />);
		const hidden = screen.getByDisplayValue("/boutique") as HTMLInputElement;
		expect(hidden.type).toBe("hidden");
		expect(hidden.name).toBe("callbackURL");
	});

	it("shows submit button 'Se connecter' by default", () => {
		render(<SignInEmailForm callbackURL="/" />);
		expect(screen.getByRole("button", { name: /se connecter/i })).toBeDefined();
	});

	it("shows 'Connexion...' when isPending", () => {
		mockIsPending.value = true;
		render(<SignInEmailForm callbackURL="/" />);
		expect(screen.getByText("Connexion...")).toBeDefined();
	});

	it("shows error alert when state has error", () => {
		mockState.value = { status: "error", message: "Identifiants invalides" };
		render(<SignInEmailForm callbackURL="/" />);
		expect(screen.getByTestId("error-alert")).toBeDefined();
		expect(screen.getByText("Identifiants invalides")).toBeDefined();
	});

	it("shows verification link when error is EMAIL_NOT_VERIFIED", () => {
		mockState.value = { status: "error", message: "EMAIL_NOT_VERIFIED" };
		render(<SignInEmailForm callbackURL="/" />);
		expect(screen.getByTestId("error-alert")).toBeDefined();
		const link = screen.getByRole("link", { name: /renvoyer l'email de vérification/i });
		expect(link.getAttribute("href")).toBe("/renvoyer-verification");
	});

	it("shows regular error message for other errors", () => {
		mockState.value = { status: "error", message: "Compte introuvable" };
		render(<SignInEmailForm callbackURL="/" />);
		expect(screen.getByTestId("error-alert")).toBeDefined();
		expect(screen.getByText("Compte introuvable")).toBeDefined();
		expect(screen.queryByRole("link", { name: /renvoyer/i })).toBeNull();
	});

	it("shows 'Mot de passe oublié ?' link to /mot-de-passe-oublie", () => {
		render(<SignInEmailForm callbackURL="/" />);
		const link = screen.getByRole("link", { name: /mot de passe oublié/i });
		expect(link.getAttribute("href")).toBe("/mot-de-passe-oublie");
	});

	it("hides error when state is undefined", () => {
		render(<SignInEmailForm callbackURL="/" />);
		expect(screen.queryByTestId("error-alert")).toBeNull();
	});
});
