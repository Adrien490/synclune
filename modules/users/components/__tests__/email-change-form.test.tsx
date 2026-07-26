import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockAction, mockIsPending } = vi.hoisted(() => ({
	mockAction: vi.fn(),
	mockIsPending: { value: false },
}));

vi.mock("@/modules/users/hooks/use-request-email-change", () => ({
	useRequestEmailChange: vi.fn(() => ({
		state: undefined,
		action: mockAction,
		isPending: mockIsPending.value,
	})),
}));

vi.mock("@tanstack/react-form-nextjs", () => ({
	mergeForm: vi.fn((form: unknown) => form),
	useTransform: vi.fn((fn: unknown) => fn),
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
					placeholder,
				}: {
					label: string;
					type?: string;
					disabled?: boolean;
					placeholder?: string;
				}) => (
					<input
						type={type ?? "text"}
						placeholder={placeholder ?? label}
						disabled={disabled}
						aria-label={label}
					/>
				),
			}),
		Subscribe: ({ children }: { children: (values: unknown[]) => React.ReactNode }) =>
			children([true]),
		handleSubmit: vi.fn(),
		// Le formulaire rend `<form.AppForm><form.SubmitButton …/></form.AppForm>`
		// depuis l'adoption du bouton partagé : sans ces entrées le rendu échoue en
		// « Element type is invalid ». On reproduit son contrat (disabled + aria-busy).
		AppForm: ({ children }: { children: React.ReactNode }) => <>{children}</>,
		SubmitButton: ({
			isPending,
			idleLabel,
			pendingLabel,
		}: {
			isPending?: boolean;
			idleLabel: string;
			pendingLabel: string;
		}) => (
			<button type="submit" disabled={isPending ?? false} aria-busy={isPending ?? false}>
				{isPending ? pendingLabel : idleLabel}
			</button>
		),
	})),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		disabled,
		type,
		variant,
		size,
	}: {
		children: React.ReactNode;
		disabled?: boolean;
		type?: string;
		variant?: string;
		size?: string;
	}) => (
		<button
			disabled={disabled}
			type={type as "button" | "submit" | "reset" | undefined}
			data-variant={variant}
			data-size={size}
		>
			{children}
		</button>
	),
}));

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

import { EmailChangeForm } from "../email-change-form";

// ============================================================================
// TESTS
// ============================================================================

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	mockIsPending.value = false;
});

beforeEach(() => {
	mockIsPending.value = false;
});

describe("EmailChangeForm", () => {
	// ─── Rendering ────────────────────────────────────────────────────────────

	it("renders a form", () => {
		const { container } = render(<EmailChangeForm />);
		expect(container.querySelector("form")).not.toBeNull();
	});

	it("renders an email input field", () => {
		render(<EmailChangeForm />);
		const input = document.querySelector("input[type='email']");
		expect(input).not.toBeNull();
	});

	it("renders the submit button with 'Modifier l'email' label", () => {
		render(<EmailChangeForm />);
		expect(screen.getByRole("button").textContent).toContain("Modifier l");
	});

	it("button is enabled when not pending", () => {
		render(<EmailChangeForm />);
		expect(screen.getByRole("button")).not.toBeDisabled();
	});

	// ─── Pending state ────────────────────────────────────────────────────────

	it("shows 'Envoi…' when isPending is true", () => {
		mockIsPending.value = true;
		render(<EmailChangeForm />);
		expect(screen.getByRole("button").textContent).toContain("Envoi…");
	});

	it("disables button when isPending is true", () => {
		mockIsPending.value = true;
		render(<EmailChangeForm />);
		expect(screen.getByRole("button")).toBeDisabled();
	});

	it("disables email input when isPending is true", () => {
		mockIsPending.value = true;
		render(<EmailChangeForm />);
		const input = document.querySelector("input[type='email']");
		expect(input).toHaveAttribute("disabled");
	});
});
