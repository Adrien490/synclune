import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

vi.mock("@/modules/customizations/actions/update-customization-status", () => ({
	updateCustomizationStatus: vi.fn(),
}));

vi.mock("@/shared/utils/with-callbacks", () => ({
	withCallbacks: (fn: unknown) => fn,
}));

vi.mock("@/shared/utils/create-toast-callbacks", () => ({
	createToastCallbacks: () => ({}),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		disabled,
		"aria-busy": ariaBusy,
		type,
		className,
	}: {
		children: React.ReactNode;
		disabled?: boolean;
		"aria-busy"?: boolean;
		type?: string;
		className?: string;
	}) => (
		<button
			type={type as "submit" | "button"}
			disabled={disabled}
			aria-busy={ariaBusy}
			className={className}
		>
			{children}
		</button>
	),
}));

vi.mock("@/shared/components/ui/select", () => ({
	Select: ({
		children,
		value,
		onValueChange: _onValueChange,
		disabled,
	}: {
		children: React.ReactNode;
		value?: string;
		onValueChange?: (value: string) => void;
		disabled?: boolean;
	}) => (
		<div data-testid="select" data-value={value} data-disabled={disabled}>
			{children}
		</div>
	),
	SelectTrigger: ({ children, id }: { children: React.ReactNode; id?: string }) => (
		<div id={id}>{children}</div>
	),
	SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
	SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
		<div data-value={value}>{children}</div>
	),
}));

vi.mock("@/shared/components/ui/label", () => ({
	Label: ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
		<label htmlFor={htmlFor}>{children}</label>
	),
}));

import { UpdateStatusForm } from "../update-status-form";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("UpdateStatusForm", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders the status label", () => {
		render(<UpdateStatusForm requestId="req-1" currentStatus="PENDING" />);
		expect(screen.getByText("Changer le statut")).toBeInTheDocument();
	});

	it("renders the submit button with 'Mettre à jour' text", () => {
		render(<UpdateStatusForm requestId="req-1" currentStatus="PENDING" />);
		expect(screen.getByRole("button", { name: "Mettre à jour" })).toBeInTheDocument();
	});

	it("disables submit button when selected status equals current status", () => {
		render(<UpdateStatusForm requestId="req-1" currentStatus="PENDING" />);
		const button = screen.getByRole("button", { name: "Mettre à jour" });
		expect(button).toBeDisabled();
	});

	it("renders available transition options for PENDING status", () => {
		render(<UpdateStatusForm requestId="req-1" currentStatus="PENDING" />);
		// PENDING can transition to IN_PROGRESS, COMPLETED, CANCELLED
		expect(screen.getByText("En cours")).toBeInTheDocument();
		expect(screen.getByText("Terminé")).toBeInTheDocument();
		expect(screen.getByText("Annulé")).toBeInTheDocument();
	});

	it("renders placeholder text in select", () => {
		render(<UpdateStatusForm requestId="req-1" currentStatus="PENDING" />);
		expect(screen.getByText("Sélectionner un statut")).toBeInTheDocument();
	});

	it("renders a form element", () => {
		const { container } = render(<UpdateStatusForm requestId="req-1" currentStatus="PENDING" />);
		expect(container.querySelector("form")).toBeInTheDocument();
	});
});
