import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockClose, mockAction } = vi.hoisted(() => ({
	mockClose: vi.fn(),
	mockAction: vi.fn(),
}));

let mockDialogState = {
	isOpen: true,
	close: mockClose,
	data: {
		isClosed: true,
		closureMessage: "Nous sommes en vacances !",
		reopensAt: "2026-04-01T10:00:00.000Z",
	},
};

let mockIsPending = false;

vi.mock("@/shared/providers/alert-dialog-store-provider", () => ({
	useAlertDialog: () => mockDialogState,
}));

vi.mock("@/shared/components/ui/alert-dialog", () => ({
	AlertDialog: ({
		children,
		open,
	}: {
		children: React.ReactNode;
		open: boolean;
		onOpenChange?: (open: boolean) => void;
	}) => (open ? <div data-testid="alert-dialog">{children}</div> : null),
	AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
	AlertDialogDescription: ({ children }: { children: React.ReactNode; asChild?: boolean }) => (
		<div>{children}</div>
	),
	AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	AlertDialogCancel: ({
		children,
		disabled,
		type,
	}: {
		children: React.ReactNode;
		disabled?: boolean;
		type?: string;
	}) => (
		<button disabled={disabled} type={type as "button" | "submit" | undefined}>
			{children}
		</button>
	),
	AlertDialogAction: ({
		children,
		disabled,
		type,
		"aria-busy": ariaBusy,
		className,
	}: {
		children: React.ReactNode;
		disabled?: boolean;
		type?: string;
		"aria-busy"?: boolean;
		className?: string;
	}) => (
		<button
			disabled={disabled}
			type={type as "button" | "submit" | undefined}
			aria-busy={ariaBusy}
			className={className}
		>
			{children}
		</button>
	),
}));

vi.mock("@/shared/components/ui/button", () => ({
	buttonVariants: ({ variant }: { variant?: string }) => `btn-${variant ?? "default"}`,
}));

vi.mock("lucide-react", () => ({
	LoaderCircle: ({ className }: { className?: string }) => (
		<span data-testid="loader" className={className} />
	),
}));

import { ToggleStoreClosureAlertDialog } from "../toggle-store-closure-alert-dialog";

// ============================================================================
// TESTS
// ============================================================================

describe("ToggleStoreClosureAlertDialog", () => {
	beforeEach(() => {
		cleanup();
		vi.clearAllMocks();
		mockIsPending = false;
		mockDialogState = {
			isOpen: true,
			close: mockClose,
			data: {
				isClosed: true,
				closureMessage: "Nous sommes en vacances !",
				reopensAt: "2026-04-01T10:00:00.000Z",
			},
		};
	});

	// ─── Visibility ───────────────────────────────────────────────────────

	it("does not render content when dialog is not open", () => {
		mockDialogState = { ...mockDialogState, isOpen: false };

		render(<ToggleStoreClosureAlertDialog action={mockAction} isPending={mockIsPending} />);

		expect(screen.queryByTestId("alert-dialog")).not.toBeInTheDocument();
	});

	it("renders when dialog is open", () => {
		render(<ToggleStoreClosureAlertDialog action={mockAction} isPending={mockIsPending} />);

		expect(screen.getByTestId("alert-dialog")).toBeInTheDocument();
	});

	// ─── Title ────────────────────────────────────────────────────────────

	it("renders closing title when isClosed is true", () => {
		mockDialogState = {
			...mockDialogState,
			data: { ...mockDialogState.data, isClosed: true },
		};

		render(<ToggleStoreClosureAlertDialog action={mockAction} isPending={mockIsPending} />);

		expect(screen.getByText("Confirmer la fermeture")).toBeInTheDocument();
	});

	it("renders reopening title when isClosed is false", () => {
		mockDialogState = {
			...mockDialogState,
			data: { ...mockDialogState.data, isClosed: false },
		};

		render(<ToggleStoreClosureAlertDialog action={mockAction} isPending={mockIsPending} />);

		expect(screen.getByText("Confirmer la réouverture")).toBeInTheDocument();
	});

	// ─── Pending state ────────────────────────────────────────────────────

	it("shows spinner when isPending is true", () => {
		mockIsPending = true;

		render(<ToggleStoreClosureAlertDialog action={mockAction} isPending={mockIsPending} />);

		expect(screen.getByTestId("loader")).toBeInTheDocument();
	});

	it("shows pending label when isPending is true", () => {
		mockIsPending = true;

		render(<ToggleStoreClosureAlertDialog action={mockAction} isPending={mockIsPending} />);

		expect(screen.getByText("Enregistrement...")).toBeInTheDocument();
	});

	it("disables cancel button when isPending is true", () => {
		mockIsPending = true;

		render(<ToggleStoreClosureAlertDialog action={mockAction} isPending={mockIsPending} />);

		expect(screen.getByText("Annuler")).toBeDisabled();
	});

	it("disables submit button when isPending is true", () => {
		mockIsPending = true;

		render(<ToggleStoreClosureAlertDialog action={mockAction} isPending={mockIsPending} />);

		expect(screen.getByText("Enregistrement...")).toBeDisabled();
	});

	// ─── Hidden inputs ────────────────────────────────────────────────────

	it("hidden input isClosed contains correct value", () => {
		render(<ToggleStoreClosureAlertDialog action={mockAction} isPending={mockIsPending} />);

		const input = document.querySelector('input[name="isClosed"]') as HTMLInputElement;
		expect(input).toBeTruthy();
		expect(input.value).toBe("true");
	});

	it("hidden input closureMessage contains correct value", () => {
		render(<ToggleStoreClosureAlertDialog action={mockAction} isPending={mockIsPending} />);

		const input = document.querySelector('input[name="closureMessage"]') as HTMLInputElement;
		expect(input).toBeTruthy();
		expect(input.value).toBe("Nous sommes en vacances !");
	});

	it("hidden input reopensAt contains correct value", () => {
		render(<ToggleStoreClosureAlertDialog action={mockAction} isPending={mockIsPending} />);

		const input = document.querySelector('input[name="reopensAt"]') as HTMLInputElement;
		expect(input).toBeTruthy();
		expect(input.value).toBe("2026-04-01T10:00:00.000Z");
	});
});
