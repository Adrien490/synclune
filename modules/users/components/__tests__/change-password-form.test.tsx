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

	it("renders three password input fields", () => {
		render(<ChangePasswordForm />);
		const allInputs = document.querySelectorAll("input[type='password']");
		expect(allInputs.length).toBe(3);
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

	// ─── Error state ──────────────────────────────────────────────────────────

	it("shows destructive alert when state.status is ERROR", () => {
		mockState.value = { status: ActionStatus.ERROR, message: "Mot de passe incorrect" };
		render(<ChangePasswordForm />);
		const alert = screen.getByRole("alert");
		expect(alert).toHaveAttribute("data-variant", "destructive");
		expect(document.body.textContent).toContain("Mot de passe incorrect");
	});

	it("does not show alert when state is undefined", () => {
		mockState.value = undefined;
		render(<ChangePasswordForm />);
		expect(screen.queryByRole("alert")).toBeNull();
	});

	// ─── Pending state ────────────────────────────────────────────────────────

	it("shows 'Changement en cours...' when isPending is true", () => {
		mockIsPending.value = true;
		render(<ChangePasswordForm />);
		expect(document.body.textContent).toContain("Changement en cours...");
	});
});
