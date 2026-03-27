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

vi.mock("@/modules/refunds/hooks/use-process-refund", () => ({
	useProcessRefund: ({ onSuccess }: { onSuccess?: () => void } = {}) => ({
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

import { ProcessRefundAlertDialog, PROCESS_REFUND_DIALOG_ID } from "../process-refund-alert-dialog";

// ============================================================================
// TESTS
// ============================================================================

describe("ProcessRefundAlertDialog", () => {
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

		render(<ProcessRefundAlertDialog />);

		expect(screen.queryByTestId("alert-dialog")).not.toBeInTheDocument();
	});

	it("renders dialog content when dialog is open", () => {
		render(<ProcessRefundAlertDialog />);

		expect(screen.getByTestId("alert-dialog")).toBeInTheDocument();
	});

	// ─── Title ────────────────────────────────────────────────────────────────

	it("renders the dialog title", () => {
		render(<ProcessRefundAlertDialog />);

		expect(screen.getByRole("heading", { name: "Traiter le remboursement" })).toBeInTheDocument();
	});

	// ─── Amount ───────────────────────────────────────────────────────────────

	it("displays amount formatted from cents to euros", () => {
		render(<ProcessRefundAlertDialog />);

		expect(screen.getByText(/25\.00 €/)).toBeInTheDocument();
	});

	// ─── Order number ─────────────────────────────────────────────────────────

	it("displays the order number", () => {
		render(<ProcessRefundAlertDialog />);

		expect(screen.getByText(/CMD-2026-0042/)).toBeInTheDocument();
	});

	// ─── Warnings ─────────────────────────────────────────────────────────────

	it("shows amber warning about Stripe processing delay", () => {
		render(<ProcessRefundAlertDialog />);

		expect(screen.getByText(/5-10 jours ouvrés/)).toBeInTheDocument();
	});

	it("shows info about automatic stock restoration", () => {
		render(<ProcessRefundAlertDialog />);

		expect(screen.getByText(/stock sera automatiquement restauré/)).toBeInTheDocument();
	});

	// ─── Hidden input ─────────────────────────────────────────────────────────

	it("hidden input id contains the refundId", () => {
		render(<ProcessRefundAlertDialog />);

		const input = document.querySelector('input[name="id"]') as HTMLInputElement;
		expect(input).toBeTruthy();
		expect(input.value).toBe("refund_1");
	});

	// ─── Error state ──────────────────────────────────────────────────────────

	it("shows error message when state has a non-SUCCESS status", () => {
		mockState = { status: "error", message: "Une erreur est survenue" };

		render(<ProcessRefundAlertDialog />);

		expect(screen.getByText("Une erreur est survenue")).toBeInTheDocument();
	});

	it("does not show error message when state is undefined", () => {
		mockState = undefined;

		render(<ProcessRefundAlertDialog />);

		expect(screen.queryByText("Une erreur est survenue")).not.toBeInTheDocument();
	});

	it("does not show error message when state has SUCCESS status", () => {
		mockState = { status: "success", message: "Remboursement traité" };

		render(<ProcessRefundAlertDialog />);

		expect(screen.queryByText("Remboursement traité")).not.toBeInTheDocument();
	});

	// ─── Pending state ────────────────────────────────────────────────────────

	it("shows pending label on submit button when isPending is true", () => {
		mockIsPending = true;

		render(<ProcessRefundAlertDialog />);

		expect(screen.getByText("Traitement...")).toBeInTheDocument();
	});

	it("shows loader icon when isPending is true", () => {
		mockIsPending = true;

		render(<ProcessRefundAlertDialog />);

		expect(screen.getByTestId("loader-circle")).toBeInTheDocument();
	});

	it("shows default submit label when not pending", () => {
		render(<ProcessRefundAlertDialog />);

		const submitButton = screen.getByRole("button", { name: /Traiter le remboursement/ });
		expect(submitButton).toBeInTheDocument();
	});

	it("disables cancel button when isPending is true", () => {
		mockIsPending = true;

		render(<ProcessRefundAlertDialog />);

		expect(screen.getByText("Annuler")).toBeDisabled();
	});

	it("disables submit button when isPending is true", () => {
		mockIsPending = true;

		render(<ProcessRefundAlertDialog />);

		expect(screen.getByText("Traitement...")).toBeDisabled();
	});

	// ─── Constants ────────────────────────────────────────────────────────────

	it("exports the correct PROCESS_REFUND_DIALOG_ID constant", () => {
		expect(PROCESS_REFUND_DIALOG_ID).toBe("process-refund");
	});
});
