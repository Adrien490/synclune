import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockClose, mockClearSelection, mockDeleteOrders } = vi.hoisted(() => ({
	mockClose: vi.fn(),
	mockClearSelection: vi.fn(),
	mockDeleteOrders: vi.fn(),
}));

let mockDialogState = {
	isOpen: true,
	close: mockClose,
	data: {
		orderIds: ["order_1", "order_2", "order_3"],
	} as Record<string, unknown> | null,
};

let mockIsPending = false;

vi.mock("@/shared/providers/alert-dialog-store-provider", () => ({
	useAlertDialog: () => mockDialogState,
}));

vi.mock("@/shared/contexts/selection-context", () => ({
	useSelectionContext: () => ({ clearSelection: mockClearSelection }),
}));

vi.mock("@/modules/orders/hooks/use-bulk-delete-orders", () => ({
	useBulkDeleteOrders: ({ onSuccess }: { onSuccess?: () => void } = {}) => ({
		deleteOrders: mockDeleteOrders,
		isPending: mockIsPending,
		onSuccess,
	}),
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
		<button
			data-testid="cancel-button"
			disabled={disabled}
			type={type as "button" | "submit" | undefined}
		>
			{children}
		</button>
	),
	AlertDialogAction: ({
		children,
		disabled,
		onClick,
		"aria-busy": ariaBusy,
	}: {
		children: React.ReactNode;
		disabled?: boolean;
		onClick?: () => void;
		"aria-busy"?: boolean;
	}) => (
		<button data-testid="submit-button" disabled={disabled} onClick={onClick} aria-busy={ariaBusy}>
			{children}
		</button>
	),
}));

vi.mock("lucide-react", () => ({
	LoaderCircle: ({ className }: { className?: string }) => (
		<span data-testid="loader" className={className} />
	),
}));

import { BulkDeleteOrdersAlertDialog } from "../bulk-delete-orders-alert-dialog";

// ============================================================================
// TESTS
// ============================================================================

describe("BulkDeleteOrdersAlertDialog", () => {
	beforeEach(() => {
		cleanup();
		vi.clearAllMocks();
		mockIsPending = false;
		mockDialogState = {
			isOpen: true,
			close: mockClose,
			data: {
				orderIds: ["order_1", "order_2", "order_3"],
			},
		};
	});

	// ─── Visibility ───────────────────────────────────────────────────────────

	it("does not render content when dialog is closed", () => {
		mockDialogState = { ...mockDialogState, isOpen: false };

		render(<BulkDeleteOrdersAlertDialog />);

		expect(screen.queryByTestId("alert-dialog")).not.toBeInTheDocument();
	});

	it("renders title when dialog is open", () => {
		render(<BulkDeleteOrdersAlertDialog />);

		expect(screen.getByText("Confirmer la suppression")).toBeInTheDocument();
	});

	// ─── Count display ────────────────────────────────────────────────────────

	it("shows singular 'commande' for a count of 1", () => {
		mockDialogState = {
			...mockDialogState,
			data: { orderIds: ["order_1"] },
		};

		render(<BulkDeleteOrdersAlertDialog />);

		expect(screen.getByText("1 commande")).toBeInTheDocument();
	});

	it("shows plural 'commandes' for a count of 3", () => {
		render(<BulkDeleteOrdersAlertDialog />);

		expect(screen.getByText("3 commandes")).toBeInTheDocument();
	});

	// ─── Description ──────────────────────────────────────────────────────────

	it("shows irreversible warning", () => {
		render(<BulkDeleteOrdersAlertDialog />);

		expect(screen.getByText("Cette action est irréversible.")).toBeInTheDocument();
	});

	// ─── Pending state ────────────────────────────────────────────────────────

	it("shows 'Suppression...' on submit button when isPending is true", () => {
		mockIsPending = true;

		render(<BulkDeleteOrdersAlertDialog />);

		expect(screen.getByText("Suppression...")).toBeInTheDocument();
	});

	it("disables cancel button when isPending is true", () => {
		mockIsPending = true;

		render(<BulkDeleteOrdersAlertDialog />);

		expect(screen.getByTestId("cancel-button")).toBeDisabled();
	});
});
