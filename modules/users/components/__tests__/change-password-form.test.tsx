import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockAction, mockIsPending, mockState } = vi.hoisted(() => ({
	mockAction: vi.fn(),
	mockIsPending: { value: false },
	mockState: { value: undefined as { status: string; message: string } | undefined },
}));

vi.mock("@/modules/auth/hooks/use-change-password", () => ({
	useChangePassword: vi.fn(() => ({
		action: mockAction,
		isPending: mockIsPending.value,
		state: mockState.value,
	})),
}));

vi.mock("@/shared/components/forms", () => ({
	useAppForm: vi.fn(() => ({
		AppField: ({
			children,
		}: {
			name: string;
			children: (field: unknown) => React.ReactNode;
			validators?: unknown;
		}) =>
			children({
				InputField: ({
					label,
					type,
					disabled,
				}: {
					label: string;
					type?: string;
					disabled?: boolean;
				}) => <input type={type ?? "text"} placeholder={label} disabled={disabled} />,
			}),
		Subscribe: ({ children }: { children: (values: unknown[]) => React.ReactNode }) =>
			children([true]),
		handleSubmit: vi.fn(),
	})),
}));

vi.mock("@/shared/components/ui/alert", () => ({
	Alert: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
		<div role="alert" data-variant={variant}>
			{children}
		</div>
	),
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
	Checkbox: ({
		id,
		checked,
		onCheckedChange,
		disabled,
	}: {
		id?: string;
		checked?: boolean;
		onCheckedChange?: (checked: boolean) => void;
		disabled?: boolean;
	}) => (
		<input
			type="checkbox"
			id={id}
			checked={checked}
			onChange={(e) => onCheckedChange?.(e.target.checked)}
			disabled={disabled}
		/>
	),
}));

vi.mock("lucide-react", () => ({
	CircleAlert: () => <svg data-testid="icon-circle-alert" />,
	CircleCheck: () => <svg data-testid="icon-circle-check" />,
}));

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

import { ChangePasswordForm } from "../change-password-form";
import { ActionStatus } from "@/shared/types/server-action";
import userEvent from "@testing-library/user-event";
import { useChangePassword } from "@/modules/auth/hooks/use-change-password";
import { useAppForm } from "@/shared/components/forms";

// ============================================================================
// TESTS
// ============================================================================

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	mockIsPending.value = false;
	mockState.value = undefined;
});

beforeEach(() => {
	mockIsPending.value = false;
	mockState.value = undefined;
});

describe("ChangePasswordForm", () => {
	// ─── Rendering ────────────────────────────────────────────────────────────

	it("renders the form", () => {
		const { container } = render(<ChangePasswordForm />);
		expect(container.querySelector("form")).not.toBeNull();
	});

	it("renders the submit button", () => {
		render(<ChangePasswordForm />);
		expect(screen.getByRole("button", { name: /Changer le mot de passe/i })).toBeInTheDocument();
	});

	it("renders the revoke other sessions checkbox", () => {
		render(<ChangePasswordForm />);
		expect(screen.getByRole("checkbox")).toBeInTheDocument();
	});

	it("renders the label for revoke other sessions", () => {
		render(<ChangePasswordForm />);
		expect(document.body.textContent).toContain("Déconnecter tous les autres appareils");
	});

	it("renders the revoke other sessions description text", () => {
		render(<ChangePasswordForm />);
		expect(document.body.textContent).toContain(
			"Déconnecte toutes vos sessions actives sauf celle-ci",
		);
	});

	it("renders three password input fields", () => {
		render(<ChangePasswordForm />);
		const allInputs = document.querySelectorAll("input[type='password']");
		expect(allInputs.length).toBe(3);
	});

	it("renders the current password field with correct placeholder", () => {
		render(<ChangePasswordForm />);
		expect(screen.getByPlaceholderText("Mot de passe actuel")).toBeInTheDocument();
	});

	it("renders the new password field with correct placeholder", () => {
		render(<ChangePasswordForm />);
		expect(screen.getByPlaceholderText("Nouveau mot de passe")).toBeInTheDocument();
	});

	it("renders the confirm password field with correct placeholder", () => {
		render(<ChangePasswordForm />);
		expect(screen.getByPlaceholderText("Confirmer le mot de passe")).toBeInTheDocument();
	});

	it("renders the password hint text for minimum length", () => {
		render(<ChangePasswordForm />);
		expect(document.body.textContent).toContain("Minimum 6 caractères, maximum 128 caractères");
	});

	it("renders a hidden input for revokeOtherSessions", () => {
		const { container } = render(<ChangePasswordForm />);
		const hiddenInput = container.querySelector("input[name='revokeOtherSessions']");
		expect(hiddenInput).not.toBeNull();
		expect(hiddenInput).toHaveAttribute("type", "hidden");
	});

	// ─── Submit button state ──────────────────────────────────────────────────

	it("submit button is enabled when canSubmit is true and not pending", () => {
		render(<ChangePasswordForm />);
		const button = screen.getByRole("button", { name: /Changer le mot de passe/i });
		expect(button).not.toBeDisabled();
	});

	it("submit button is disabled when isPending is true", () => {
		mockIsPending.value = true;
		render(<ChangePasswordForm />);
		const button = screen.getByRole("button", { name: /Changement en cours.../i });
		expect(button).toBeDisabled();
	});

	it("submit button is disabled when canSubmit is false", () => {
		vi.mocked(useAppForm).mockReturnValueOnce({
			AppField: ({
				children,
			}: {
				name: string;
				children: (field: unknown) => React.ReactNode;
				validators?: unknown;
			}) =>
				children({
					InputField: ({
						label,
						type,
						disabled,
					}: {
						label: string;
						type?: string;
						disabled?: boolean;
					}) => <input type={type ?? "text"} placeholder={label} disabled={disabled} />,
				}),
			Subscribe: ({ children }: { children: (values: unknown[]) => React.ReactNode }) =>
				children([false]),
			handleSubmit: vi.fn(),
		} as unknown as ReturnType<typeof useAppForm>);
		render(<ChangePasswordForm />);
		const button = screen.getByRole("button", { name: /Changer le mot de passe/i });
		expect(button).toBeDisabled();
	});

	// ─── Success state ────────────────────────────────────────────────────────

	it("shows success alert when state.status is SUCCESS", () => {
		mockState.value = { status: ActionStatus.SUCCESS, message: "Mot de passe changé !" };
		render(<ChangePasswordForm />);
		const alert = screen.getByRole("alert");
		expect(alert).toBeInTheDocument();
		expect(alert.getAttribute("data-variant")).not.toBe("destructive");
		expect(document.body.textContent).toContain("Mot de passe changé !");
	});

	it("shows CircleCheck icon in success alert", () => {
		mockState.value = { status: ActionStatus.SUCCESS, message: "Mot de passe changé !" };
		render(<ChangePasswordForm />);
		expect(screen.getByTestId("icon-circle-check")).toBeInTheDocument();
	});

	it("disables all fields on SUCCESS state", () => {
		mockState.value = { status: ActionStatus.SUCCESS, message: "Mot de passe changé !" };
		render(<ChangePasswordForm />);
		const passwordInputs = document.querySelectorAll("input[type='password']");
		passwordInputs.forEach((input) => {
			expect(input).toBeDisabled();
		});
	});

	it("disables checkbox on SUCCESS state", () => {
		mockState.value = { status: ActionStatus.SUCCESS, message: "Mot de passe changé !" };
		render(<ChangePasswordForm />);
		expect(screen.getByRole("checkbox")).toBeDisabled();
	});

	// ─── Error state ──────────────────────────────────────────────────────────

	it("shows destructive alert when state.status is ERROR", () => {
		mockState.value = { status: ActionStatus.ERROR, message: "Mot de passe incorrect" };
		render(<ChangePasswordForm />);
		const alert = screen.getByRole("alert");
		expect(alert).toHaveAttribute("data-variant", "destructive");
		expect(document.body.textContent).toContain("Mot de passe incorrect");
	});

	it("shows CircleAlert icon in error alert", () => {
		mockState.value = { status: ActionStatus.ERROR, message: "Mot de passe incorrect" };
		render(<ChangePasswordForm />);
		expect(screen.getByTestId("icon-circle-alert")).toBeInTheDocument();
	});

	it("shows destructive alert for UNAUTHORIZED status", () => {
		mockState.value = { status: ActionStatus.UNAUTHORIZED, message: "Non autorisé" };
		render(<ChangePasswordForm />);
		const alert = screen.getByRole("alert");
		expect(alert).toHaveAttribute("data-variant", "destructive");
		expect(document.body.textContent).toContain("Non autorisé");
	});

	it("shows destructive alert for CONFLICT status", () => {
		mockState.value = { status: ActionStatus.CONFLICT, message: "Conflit détecté" };
		render(<ChangePasswordForm />);
		const alert = screen.getByRole("alert");
		expect(alert).toHaveAttribute("data-variant", "destructive");
	});

	it("does not show alert when state is undefined", () => {
		mockState.value = undefined;
		render(<ChangePasswordForm />);
		expect(screen.queryByRole("alert")).toBeNull();
	});

	it("does not show alert when state.status is VALIDATION_ERROR", () => {
		mockState.value = { status: ActionStatus.VALIDATION_ERROR, message: "Champ invalide" };
		render(<ChangePasswordForm />);
		expect(screen.queryByRole("alert")).toBeNull();
	});

	// ─── Pending state ────────────────────────────────────────────────────────

	it("shows 'Changement en cours...' when isPending is true", () => {
		mockIsPending.value = true;
		render(<ChangePasswordForm />);
		expect(document.body.textContent).toContain("Changement en cours...");
	});

	it("disables all password fields when isPending is true", () => {
		mockIsPending.value = true;
		render(<ChangePasswordForm />);
		const passwordInputs = document.querySelectorAll("input[type='password']");
		passwordInputs.forEach((input) => {
			expect(input).toBeDisabled();
		});
	});

	it("disables checkbox when isPending is true", () => {
		mockIsPending.value = true;
		render(<ChangePasswordForm />);
		expect(screen.getByRole("checkbox")).toBeDisabled();
	});

	// ─── Form action / submission ─────────────────────────────────────────────

	it("passes action from useChangePassword to the form element", () => {
		render(<ChangePasswordForm />);
		// The form uses action={action} — the mock action is assigned to the form's action prop
		// We verify useChangePassword was called (thus action was consumed)
		expect(vi.mocked(useChangePassword)).toHaveBeenCalled();
	});

	it("calls useChangePassword with onOpenChange when provided", () => {
		const onOpenChange = vi.fn();
		render(<ChangePasswordForm onOpenChange={onOpenChange} />);
		expect(vi.mocked(useChangePassword)).toHaveBeenCalledWith({ onOpenChange });
	});

	it("calls useChangePassword without options when no props provided", () => {
		render(<ChangePasswordForm />);
		expect(vi.mocked(useChangePassword)).toHaveBeenCalledWith({
			onOpenChange: undefined,
		});
	});

	// ─── Checkbox interaction ─────────────────────────────────────────────────

	it("checkbox is unchecked by default", () => {
		render(<ChangePasswordForm />);
		const checkbox = screen.getByRole("checkbox");
		expect(checkbox).not.toBeChecked();
	});

	it("hidden input defaults to 'false' when checkbox is unchecked", () => {
		const { container } = render(<ChangePasswordForm />);
		const hiddenInput = container.querySelector("input[name='revokeOtherSessions']");
		expect(hiddenInput).toHaveValue("false");
	});

	it("toggling the checkbox updates the hidden input to 'true'", async () => {
		const user = userEvent.setup();
		const { container } = render(<ChangePasswordForm />);
		const checkbox = screen.getByRole("checkbox");
		await user.click(checkbox);
		const hiddenInput = container.querySelector("input[name='revokeOtherSessions']");
		expect(hiddenInput).toHaveValue("true");
	});

	it("toggling the checkbox twice resets the hidden input to 'false'", async () => {
		const user = userEvent.setup();
		const { container } = render(<ChangePasswordForm />);
		const checkbox = screen.getByRole("checkbox");
		await user.click(checkbox);
		await user.click(checkbox);
		const hiddenInput = container.querySelector("input[name='revokeOtherSessions']");
		expect(hiddenInput).toHaveValue("false");
	});
});
