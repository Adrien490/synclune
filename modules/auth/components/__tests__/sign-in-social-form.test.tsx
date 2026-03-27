import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockState, mockAction, mockIsPending } = vi.hoisted(() => ({
	mockState: { value: undefined as any },
	mockAction: vi.fn(),
	mockIsPending: { value: false },
}));

vi.mock("@/modules/auth/hooks/use-sign-in-social", () => ({
	useSignInSocial: () => ({
		state: mockState.value,
		action: mockAction,
		isPending: mockIsPending.value,
	}),
}));

vi.mock("@/shared/components/icons", () => ({
	GoogleIcon: () => <svg data-testid="google-icon" />,
}));

vi.mock("@/shared/types/server-action", () => ({
	ActionStatus: { SUCCESS: "SUCCESS", ERROR: "ERROR" },
}));

vi.mock("@/shared/components/ui/alert", () => ({
	Alert: ({ children, variant }: any) => (
		<div data-testid={variant === "destructive" ? "error-alert" : "alert"}>{children}</div>
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

vi.mock("lucide-react", () => ({
	LoaderCircle: () => <svg data-testid="loader" />,
	CircleX: () => <svg />,
}));

import { SignInSocialForm } from "../sign-in-social-form";

// ============================================================================
// TESTS
// ============================================================================

describe("SignInSocialForm", () => {
	beforeEach(() => {
		mockState.value = undefined;
		mockIsPending.value = false;
	});

	afterEach(cleanup);

	// ─── Rendering ────────────────────────────────────────────────────────────

	it("should render 'Continuer avec Google' text", () => {
		render(<SignInSocialForm callbackURL="/boutique" />);

		expect(screen.getByText("Continuer avec Google")).toBeInTheDocument();
	});

	it("should have hidden provider input with value 'google'", () => {
		render(<SignInSocialForm callbackURL="/boutique" />);

		const input = document.querySelector('input[name="provider"]') as HTMLInputElement;
		expect(input).toBeTruthy();
		expect(input.value).toBe("google");
	});

	it("should have hidden callbackURL input with correct value", () => {
		render(<SignInSocialForm callbackURL="/boutique" />);

		const input = document.querySelector('input[name="callbackURL"]') as HTMLInputElement;
		expect(input).toBeTruthy();
		expect(input.value).toBe("/boutique");
	});

	// ─── Error state ──────────────────────────────────────────────────────────

	it("should show error alert when state has error", () => {
		mockState.value = { status: "ERROR", message: "Connexion échouée" };

		render(<SignInSocialForm callbackURL="/boutique" />);

		expect(screen.getByTestId("error-alert")).toBeInTheDocument();
		expect(screen.getByText("Connexion échouée")).toBeInTheDocument();
	});

	// ─── Pending state ────────────────────────────────────────────────────────

	it("should show loader when isPending", () => {
		mockIsPending.value = true;

		render(<SignInSocialForm callbackURL="/boutique" />);

		expect(screen.getByTestId("loader")).toBeInTheDocument();
	});

	it("should disable button when isPending", () => {
		mockIsPending.value = true;

		render(<SignInSocialForm callbackURL="/boutique" />);

		const button = screen.getByRole("button");
		expect(button).toBeDisabled();
	});
});
