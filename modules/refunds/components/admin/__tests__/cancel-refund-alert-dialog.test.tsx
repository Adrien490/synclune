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
		refundId: "refund_1",
		amount: 2500,
		orderNumber: "CMD-2026-0042",
	},
};

let mockIsPending = false;
let mockState: { status: string; message: string } | undefined = undefined;

vi.mock("@/shared/providers/alert-dialog-store-provider", () => ({
	useAlertDialog: () => mockDialogState,
}));

vi.mock("@/modules/refunds/hooks/use-cancel-refund", () => ({
	useCancelRefund: ({ onSuccess }: { onSuccess?: () => void } = {}) => ({
		state: mockState,
		action: mockAction,
		isPending: mockIsPending,
		onSuccess,
	}),
}));

vi.mock("@/shared/types/server-action", () => ({
	ActionStatus: {
		SUCCESS: "success",
		ERROR: "error",
		WARNING: "warning",
		UNAUTHORIZED: "unauthorized",
		VALIDATION_ERROR: "validation_error",
		NOT_FOUND: "not_found",
		CONFLICT: "conflict",
		FORBIDDEN: "forbidden",
		INITIAL: "initial",
	},
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
	}: {
		children: React.ReactNode;
		disabled?: boolean;
		type?: string;
		"aria-busy"?: boolean;
	}) => (
		<button disabled={disabled} type={type as "button" | "submit" | undefined} aria-busy={ariaBusy}>
			{children}
		</button>
	),
}));

vi.mock("lucide-react", () => ({
	LoaderCircle: ({ className }: { className?: string }) => (
		<svg data-testid="loader-circle" className={className} />
	),
}));

import { CancelRefundAlertDialog, CANCEL_REFUND_DIALOG_ID } from "../cancel-refund-alert-dialog";

// ============================================================================
// TESTS
// ============================================================================

describe("CancelRefundAlertDialog", () => {
	beforeEach(() => {
		cleanup();
		vi.clearAllMocks();
		mockIsPending = false;
		mockState = undefined;
		mockDialogState = {
			isOpen: true,
			close: mockClose,
			data: {
				refundId: "refund_1",
				amount: 2500,
				orderNumber: "CMD-2026-0042",
			},
		};
	});

	// ─── Visibility ───────────────────────────────────────────────────────────

	it("renders nothing when dialog is closed", () => {
		mockDialogState = { ...mockDialogState, isOpen: false };

		render(<CancelRefundAlertDialog />);

		expect(screen.queryByTestId("alert-dialog")).not.toBeInTheDocument();
	});

	it("renders dialog content when dialog is open", () => {
		render(<CancelRefundAlertDialog />);

		expect(screen.getByTestId("alert-dialog")).toBeInTheDocument();
	});

	// ─── Title ────────────────────────────────────────────────────────────────

	it("renders the dialog title", () => {
		render(<CancelRefundAlertDialog />);

		expect(screen.getByText("Annuler la demande de remboursement")).toBeInTheDocument();
	});

	// ─── Amount ───────────────────────────────────────────────────────────────

	it("displays amount formatted from cents to euros", () => {
		render(<CancelRefundAlertDialog />);

		expect(screen.getByText(/25\.00 €/)).toBeInTheDocument();
	});

	// ─── Order number ─────────────────────────────────────────────────────────

	it("displays the order number", () => {
		render(<CancelRefundAlertDialog />);

		expect(screen.getByText(/CMD-2026-0042/)).toBeInTheDocument();
	});

	// ─── Hidden input ─────────────────────────────────────────────────────────

	it("hidden input id contains the refundId", () => {
		render(<CancelRefundAlertDialog />);

		const input = document.querySelector('input[name="id"]') as HTMLInputElement;
		expect(input).toBeTruthy();
		expect(input.value).toBe("refund_1");
	});

	// ─── Error state ──────────────────────────────────────────────────────────

	it("shows error message when state has a non-SUCCESS status", () => {
		mockState = { status: "error", message: "Une erreur est survenue" };

		render(<CancelRefundAlertDialog />);

		expect(screen.getByText("Une erreur est survenue")).toBeInTheDocument();
	});

	it("does not show error message when state is undefined", () => {
		mockState = undefined;

		render(<CancelRefundAlertDialog />);

		expect(screen.queryByText("Une erreur est survenue")).not.toBeInTheDocument();
	});

	it("does not show error message when state has SUCCESS status", () => {
		mockState = { status: "success", message: "Demande annulée" };

		render(<CancelRefundAlertDialog />);

		expect(screen.queryByText("Demande annulée")).not.toBeInTheDocument();
	});

	// ─── Pending state ────────────────────────────────────────────────────────

	it("shows pending label on submit button when isPending is true", () => {
		mockIsPending = true;

		render(<CancelRefundAlertDialog />);

		expect(screen.getByText("Annulation...")).toBeInTheDocument();
	});

	it("shows loader icon when isPending is true", () => {
		mockIsPending = true;

		render(<CancelRefundAlertDialog />);

		expect(screen.getByTestId("loader-circle")).toBeInTheDocument();
	});

	it("shows default submit label when not pending", () => {
		render(<CancelRefundAlertDialog />);

		expect(screen.getByText("Annuler la demande")).toBeInTheDocument();
	});

	it("disables close button when isPending is true", () => {
		mockIsPending = true;

		render(<CancelRefundAlertDialog />);

		expect(screen.getByText("Fermer")).toBeDisabled();
	});

	it("disables submit button when isPending is true", () => {
		mockIsPending = true;

		render(<CancelRefundAlertDialog />);

		expect(screen.getByText("Annulation...")).toBeDisabled();
	});

	// ─── Constants ────────────────────────────────────────────────────────────

	it("exports the correct CANCEL_REFUND_DIALOG_ID constant", () => {
		expect(CANCEL_REFUND_DIALOG_ID).toBe("cancel-refund");
	});
});
