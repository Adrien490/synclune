import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockOpenDialog, mockCloseDialog, mockClearSelection, mockAction } = vi.hoisted(() => ({
	mockOpenDialog: vi.fn(),
	mockCloseDialog: vi.fn(),
	mockClearSelection: vi.fn(),
	mockAction: vi.fn(),
}));

// selectedItems is mutable so tests can set it before render
let mockSelectedItems: string[] = ["req-1", "req-2"];

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

vi.mock("@/shared/providers/dialog-store-provider", () => ({
	useDialog: () => ({
		open: mockOpenDialog,
		close: mockCloseDialog,
		isOpen: false,
		data: null,
	}),
}));

vi.mock("@/shared/contexts/selection-context", () => ({
	useSelectionContext: () => ({
		selectedItems: mockSelectedItems,
		clearSelection: mockClearSelection,
	}),
}));

vi.mock("@/modules/customizations/hooks/use-bulk-update-customization-status", () => ({
	useBulkUpdateCustomizationStatus: () => ({ action: mockAction, isPending: false }),
}));

vi.mock("@/modules/customizations/hooks/use-bulk-delete-customization-requests", () => ({
	useBulkDeleteCustomizationRequests: () => ({ action: mockAction, isPending: false }),
}));

vi.mock("@/shared/components/selection-toolbar", () => ({
	SelectionToolbar: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="selection-toolbar">{children}</div>
	),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		disabled,
		"aria-busy": ariaBusy,
		type,
	}: {
		children: React.ReactNode;
		disabled?: boolean;
		"aria-busy"?: boolean;
		type?: string;
	}) => (
		<button type={type as "submit" | "button"} disabled={disabled} aria-busy={ariaBusy}>
			{children}
		</button>
	),
}));

vi.mock("@/shared/components/ui/dropdown-menu", () => ({
	DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	DropdownMenuTrigger: ({ children }: { children: React.ReactNode; asChild?: boolean }) => (
		<div>{children}</div>
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
		className,
	}: {
		children: React.ReactNode;
		onClick?: () => void;
		className?: string;
	}) => (
		<button role="menuitem" onClick={onClick} className={className}>
			{children}
		</button>
	),
}));

vi.mock("@/shared/components/ui/alert-dialog", () => ({
	AlertDialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
		open ? <div data-testid="alert-dialog">{children}</div> : null,
	AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
	AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
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
		<button type={type as "submit" | "button"} disabled={disabled}>
			{children}
		</button>
	),
}));

vi.mock("lucide-react", () => ({
	CircleCheck: () => <svg data-testid="icon-circle-check" />,
	Clock: () => <svg data-testid="icon-clock" />,
	LoaderCircle: () => <svg data-testid="icon-loader" />,
	EllipsisVertical: () => <svg data-testid="icon-ellipsis" />,
	CircleX: () => <svg data-testid="icon-circle-x" />,
	Trash2: () => <svg data-testid="icon-trash2" />,
}));

import { CustomizationSelectionToolbar } from "../customization-selection-toolbar";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("CustomizationSelectionToolbar", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSelectedItems = ["req-1", "req-2"];
	});

	it("renders the toolbar when items are selected", () => {
		render(<CustomizationSelectionToolbar />);
		expect(screen.getByTestId("selection-toolbar")).toBeInTheDocument();
	});

	it("shows the count of selected items", () => {
		render(<CustomizationSelectionToolbar />);
		expect(screen.getByText(/2 demandes sélectionnées/)).toBeInTheDocument();
	});

	it("shows bulk action menu items", () => {
		render(<CustomizationSelectionToolbar />);
		expect(screen.getByText("Marquer en cours")).toBeInTheDocument();
		expect(screen.getByText("Marquer terminées")).toBeInTheDocument();
		expect(screen.getByText("Remettre en attente")).toBeInTheDocument();
		expect(screen.getByText("Annuler")).toBeInTheDocument();
	});

	it("applies destructive class to Annuler item", () => {
		render(<CustomizationSelectionToolbar />);
		const cancelItem = screen.getByText("Annuler").closest("[role='menuitem']");
		expect(cancelItem?.className).toContain("text-destructive");
	});

	it("renders separator between action groups", () => {
		render(<CustomizationSelectionToolbar />);
		expect(screen.getAllByTestId("dropdown-separator").length).toBeGreaterThanOrEqual(1);
	});

	it("returns null when no items are selected", () => {
		mockSelectedItems = [];
		const { container } = render(<CustomizationSelectionToolbar />);
		expect(container.firstChild).toBeNull();
	});

	it("shows singular form for a single selected item", () => {
		mockSelectedItems = ["req-1"];
		render(<CustomizationSelectionToolbar />);
		expect(screen.getByText(/1 demande sélectionnée/)).toBeInTheDocument();
	});

	// ─── Click interactions ───────────────────────────────────────────────────

	it("clicking 'Marquer en cours' opens dialog with IN_PROGRESS", async () => {
		render(<CustomizationSelectionToolbar />);
		await userEvent.click(screen.getByText("Marquer en cours"));
		expect(mockOpenDialog).toHaveBeenCalledWith({ targetStatus: "IN_PROGRESS" });
	});

	it("clicking 'Marquer terminées' opens dialog with COMPLETED", async () => {
		render(<CustomizationSelectionToolbar />);
		await userEvent.click(screen.getByText("Marquer terminées"));
		expect(mockOpenDialog).toHaveBeenCalledWith({ targetStatus: "COMPLETED" });
	});

	it("clicking 'Remettre en attente' opens dialog with PENDING", async () => {
		render(<CustomizationSelectionToolbar />);
		await userEvent.click(screen.getByText("Remettre en attente"));
		expect(mockOpenDialog).toHaveBeenCalledWith({ targetStatus: "PENDING" });
	});

	it("clicking 'Annuler' opens dialog with CANCELLED", async () => {
		render(<CustomizationSelectionToolbar />);
		await userEvent.click(screen.getByText("Annuler"));
		expect(mockOpenDialog).toHaveBeenCalledWith({ targetStatus: "CANCELLED" });
	});
});
