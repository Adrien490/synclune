import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

vi.mock("@/modules/auth/hooks/use-change-password", () => ({
	useChangePassword: vi.fn(() => ({
		action: vi.fn(),
		isPending: false,
		state: undefined,
	})),
}));

vi.mock("@/shared/components/forms", () => ({
	useAppForm: vi.fn(() => ({
		AppField: ({ children }: { name: string; children: (f: unknown) => React.ReactNode }) =>
			children({
				InputField: ({ label }: { label: string }) => <input aria-label={label} />,
				PasswordInputField: ({ label }: { label: string }) => (
					<input type="password" aria-label={label} />
				),
				CheckboxField: ({ label }: { label: React.ReactNode }) => (
					<div>
						<input type="checkbox" />
						<label>{label}</label>
					</div>
				),
			}),
		Subscribe: ({ children }: { children: (v: unknown) => React.ReactNode }) => children([true]),
		handleSubmit: vi.fn(),
	})),
}));

vi.mock("@/shared/components/forms/password-strength-indicator", () => ({
	PasswordStrengthIndicator: () => <div data-testid="password-strength" />,
}));

vi.mock("@/shared/components/ui/alert", () => ({
	Alert: ({ children }: { children: React.ReactNode }) => <div role="alert">{children}</div>,
	AlertDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		disabled,
		type,
	}: {
		children: React.ReactNode;
		disabled?: boolean;
		type?: string;
	}) => (
		<button disabled={disabled} type={type as "button" | "submit" | "reset" | undefined}>
			{children}
		</button>
	),
}));

vi.mock("@/shared/components/ui/checkbox", () => ({
	Checkbox: ({ id }: { id?: string }) => <input type="checkbox" id={id} />,
}));

vi.mock("@/shared/components/responsive-dialog", () => ({
	ResponsiveDialog: ({
		children,
		open,
	}: {
		children: React.ReactNode;
		open: boolean;
		onOpenChange: (v: boolean) => void;
	}) => (open ? <div data-testid="responsive-dialog">{children}</div> : null),
	ResponsiveDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	ResponsiveDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	ResponsiveDialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
	ResponsiveDialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

vi.mock("lucide-react", () => ({
	CircleAlert: () => <svg data-testid="icon-circle-alert" />,
	CircleCheck: () => <svg data-testid="icon-circle-check" />,
}));

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

import { ChangePasswordDialog } from "../change-password-dialog";

// ============================================================================
// TESTS
// ============================================================================

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

beforeEach(() => {
	vi.clearAllMocks();
});

describe("ChangePasswordDialog", () => {
	// ─── Rendering when closed ────────────────────────────────────────────────

	it("renders nothing when open is false", () => {
		render(<ChangePasswordDialog open={false} onOpenChange={vi.fn()} />);
		expect(screen.queryByTestId("responsive-dialog")).toBeNull();
	});

	// ─── Rendering when open ──────────────────────────────────────────────────

	it("renders the dialog when open is true", () => {
		render(<ChangePasswordDialog open={true} onOpenChange={vi.fn()} />);
		expect(screen.getByTestId("responsive-dialog")).toBeInTheDocument();
	});

	it("renders the dialog title 'Changer le mot de passe'", () => {
		render(<ChangePasswordDialog open={true} onOpenChange={vi.fn()} />);
		expect(screen.getByRole("heading", { name: /Changer le mot de passe/i })).toBeInTheDocument();
	});

	it("renders the dialog description mentioning 8 characters minimum", () => {
		render(<ChangePasswordDialog open={true} onOpenChange={vi.fn()} />);
		expect(document.body.textContent).toContain("8 caractères");
	});

	it("renders the ChangePasswordForm inside the dialog", () => {
		render(<ChangePasswordDialog open={true} onOpenChange={vi.fn()} />);
		// ChangePasswordForm renders a submit button
		expect(screen.getByRole("button", { name: /Changer le mot de passe/i })).toBeInTheDocument();
	});
});
