import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockSelectedItems,
	mockClearSelection,
	mockBulkDeleteDialog,
	mockDeliveredDialog,
	mockCancelDialog,
	mockDeliveredAction,
	mockCancelAction,
} = vi.hoisted(() => ({
	mockSelectedItems: { value: [] as string[] },
	mockClearSelection: vi.fn(),
	mockBulkDeleteDialog: { isOpen: false, data: null, open: vi.fn(), close: vi.fn() },
	mockDeliveredDialog: { isOpen: false, data: null, open: vi.fn(), close: vi.fn() },
	mockCancelDialog: { isOpen: false, data: null, open: vi.fn(), close: vi.fn() },
	mockDeliveredAction: vi.fn(),
	mockCancelAction: vi.fn(),
}));

vi.mock("@/shared/contexts/selection-context", () => ({
	useSelectionContext: () => ({
		selectedItems: mockSelectedItems.value,
		clearSelection: mockClearSelection,
	}),
}));

vi.mock("@/shared/providers/alert-dialog-store-provider", () => ({
	useAlertDialog: () => mockBulkDeleteDialog,
}));

vi.mock("@/shared/providers/dialog-store-provider", () => ({
	useDialog: (id: string) =>
		id === "bulk-mark-delivered" ? mockDeliveredDialog : mockCancelDialog,
}));

vi.mock("@/modules/orders/hooks/use-bulk-mark-as-delivered", () => ({
	useBulkMarkAsDelivered: () => ({ action: mockDeliveredAction, isPending: false }),
}));

vi.mock("@/modules/orders/hooks/use-bulk-cancel-orders", () => ({
	useBulkCancelOrders: () => ({ action: mockCancelAction, isPending: false }),
}));

vi.mock("../bulk-delete-orders-alert-dialog", () => ({
	BULK_DELETE_ORDERS_DIALOG_ID: "bulk-delete-orders",
}));

vi.mock("@/shared/components/ui/dropdown-menu", () => ({
	DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	DropdownMenuTrigger: ({ children }: { children: React.ReactNode; asChild?: boolean }) => (
		<div data-testid="dropdown-trigger">{children}</div>
	),
	DropdownMenuContent: ({
		children,
	}: {
		children: React.ReactNode;
		align?: string;
		className?: string;
	}) => <div data-testid="dropdown-content">{children}</div>,
	DropdownMenuSeparator: () => <hr data-testid="dropdown-separator" />,
	DropdownMenuItem: ({
		children,
		onClick,
		variant,
	}: {
		children: React.ReactNode;
		onClick?: () => void;
		variant?: string;
	}) => (
		<button role="menuitem" onClick={onClick} data-variant={variant}>
			{children}
		</button>
	),
}));

vi.mock("@/shared/components/ui/alert-dialog", () => ({
	AlertDialog: ({
		children,
		open,
	}: {
		children: React.ReactNode;
		open: boolean;
		onOpenChange?: (open: boolean) => void;
	}) => (open ? <div data-testid="inline-dialog">{children}</div> : null),
	AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
	AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	AlertDialogCancel: ({
		children,
		...props
	}: {
		children: React.ReactNode;
		[key: string]: unknown;
	}) => <button {...props}>{children}</button>,
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
		<button {...(props as Record<string, unknown>)}>{children}</button>
	),
}));

vi.mock("lucide-react", () => ({
	CircleCheck: () => <svg data-testid="icon-check" />,
	CircleX: () => <svg data-testid="icon-x" />,
	LoaderCircle: () => <svg data-testid="loader" />,
	EllipsisVertical: () => <svg data-testid="icon-more" />,
	Trash2: () => <svg data-testid="icon-trash" />,
}));

import { OrderSelectionActions } from "../order-selection-actions";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("OrderSelectionActions", () => {
	describe("visibility", () => {
		it("returns null when no items are selected", () => {
			mockSelectedItems.value = [];
			const { container } = render(<OrderSelectionActions />);
			expect(container.firstChild).toBeNull();
		});

		it("renders when items are selected", () => {
			mockSelectedItems.value = ["order-1", "order-2"];
			render(<OrderSelectionActions />);
			expect(screen.getByTestId("dropdown-trigger")).toBeInTheDocument();
		});
	});

	describe("dropdown menu items", () => {
		it("shows 'Marquer livrées' menu item", () => {
			mockSelectedItems.value = ["order-1"];
			render(<OrderSelectionActions />);
			expect(screen.getByText("Marquer livrées")).toBeInTheDocument();
		});

		it("shows 'Annuler' menu item", () => {
			mockSelectedItems.value = ["order-1"];
			render(<OrderSelectionActions />);
			expect(screen.getByText("Annuler")).toBeInTheDocument();
		});

		it("shows 'Supprimer' menu item", () => {
			mockSelectedItems.value = ["order-1"];
			render(<OrderSelectionActions />);
			expect(screen.getByText("Supprimer")).toBeInTheDocument();
		});
	});

	describe("sr-only trigger text", () => {
		it("shows sr-only text 'Ouvrir le menu'", () => {
			mockSelectedItems.value = ["order-1"];
			render(<OrderSelectionActions />);
			expect(screen.getByText("Ouvrir le menu")).toBeInTheDocument();
		});
	});

	describe("delivered dialog content", () => {
		beforeEach(() => {
			mockDeliveredDialog.isOpen = true;
		});

		afterEach(() => {
			mockDeliveredDialog.isOpen = false;
		});

		it("shows singular count '1 commande' when 1 item selected", () => {
			mockSelectedItems.value = ["order-1"];
			render(<OrderSelectionActions />);
			expect(screen.getByText("1 commande")).toBeInTheDocument();
		});

		it("shows plural count '3 commandes' when 3 items selected", () => {
			mockSelectedItems.value = ["order-1", "order-2", "order-3"];
			render(<OrderSelectionActions />);
			// Both dialogs may be open; check at least one match
			const matches = screen.getAllByText("3 commandes");
			expect(matches.length).toBeGreaterThan(0);
		});

		it("hidden input contains JSON stringified selectedItems", () => {
			mockSelectedItems.value = ["order-1", "order-2"];
			const { container } = render(<OrderSelectionActions />);
			const input = container.querySelector('input[name="ids"]') as HTMLInputElement | null;
			expect(input).not.toBeNull();
			expect(input?.value).toBe(JSON.stringify(["order-1", "order-2"]));
		});
	});

	describe("cancel dialog content", () => {
		beforeEach(() => {
			mockCancelDialog.isOpen = true;
		});

		afterEach(() => {
			mockCancelDialog.isOpen = false;
		});

		it("shows cancel dialog title 'Annuler les commandes'", () => {
			mockSelectedItems.value = ["order-1"];
			render(<OrderSelectionActions />);
			expect(screen.getByRole("heading", { name: "Annuler les commandes" })).toBeInTheDocument();
		});
	});
});
