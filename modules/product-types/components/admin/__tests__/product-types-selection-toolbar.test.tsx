import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockSelectedItems,
	mockClearSelection,
	mockBulkDeleteDialog,
	mockActivate,
	mockDeactivate,
} = vi.hoisted(() => ({
	mockSelectedItems: { value: [] as string[] },
	mockClearSelection: vi.fn(),
	mockBulkDeleteDialog: { isOpen: false, data: null, open: vi.fn(), close: vi.fn() },
	mockActivate: vi.fn(),
	mockDeactivate: vi.fn(),
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

vi.mock("@/modules/product-types/hooks/use-bulk-activate-product-types", () => ({
	useBulkActivateProductTypes: ({ onSuccess }: { onSuccess?: () => void } = {}) => ({
		activateProductTypes: mockActivate,
		isPending: false,
		onSuccess,
	}),
}));

vi.mock("@/modules/product-types/hooks/use-bulk-deactivate-product-types", () => ({
	useBulkDeactivateProductTypes: ({ onSuccess }: { onSuccess?: () => void } = {}) => ({
		deactivateProductTypes: mockDeactivate,
		isPending: false,
		onSuccess,
	}),
}));

vi.mock("@/modules/product-types/components/admin/bulk-delete-product-types-alert-dialog", () => ({
	BULK_DELETE_PRODUCT_TYPES_DIALOG_ID: "bulk-delete-product-types",
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
		...rest
	}: {
		children: React.ReactNode;
		disabled?: boolean;
		[key: string]: unknown;
	}) => (
		<button disabled={disabled} {...rest}>
			{children}
		</button>
	),
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
		disabled,
	}: {
		children: React.ReactNode;
		onClick?: () => void;
		variant?: string;
		disabled?: boolean;
	}) => (
		<button role="menuitem" onClick={onClick} data-variant={variant} aria-disabled={disabled}>
			{children}
		</button>
	),
}));

vi.mock("lucide-react", () => ({
	CircleCheck: () => <svg data-testid="icon-circle-check" />,
	CircleX: () => <svg data-testid="icon-circle-x" />,
	EllipsisVertical: () => <svg data-testid="icon-ellipsis" />,
	Trash2: () => <svg data-testid="icon-trash" />,
}));

vi.mock("sonner", () => ({
	toast: { error: vi.fn() },
}));

import { ProductTypesSelectionToolbar } from "../product-types-selection-toolbar";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("ProductTypesSelectionToolbar", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSelectedItems.value = [];
	});

	// ─── Visibility ───────────────────────────────────────────────────────────

	it("returns null when no items are selected", () => {
		mockSelectedItems.value = [];
		const { container } = render(<ProductTypesSelectionToolbar />);
		expect(container.firstChild).toBeNull();
	});

	it("renders toolbar when items are selected", () => {
		mockSelectedItems.value = ["pt-1"];
		render(<ProductTypesSelectionToolbar />);
		expect(screen.getByTestId("selection-toolbar")).toBeInTheDocument();
	});

	// ─── Count display ────────────────────────────────────────────────────────

	it("shows singular 'type sélectionné' for 1 item", () => {
		mockSelectedItems.value = ["pt-1"];
		render(<ProductTypesSelectionToolbar />);
		expect(screen.getByText(/1 type sélectionné$/)).toBeInTheDocument();
	});

	it("shows plural 'types sélectionnés' for multiple items", () => {
		mockSelectedItems.value = ["pt-1", "pt-2", "pt-3"];
		render(<ProductTypesSelectionToolbar />);
		expect(screen.getByText(/3 types sélectionnés/)).toBeInTheDocument();
	});

	// ─── Menu items ───────────────────────────────────────────────────────────

	it("shows 'Activer' menu item", () => {
		mockSelectedItems.value = ["pt-1"];
		render(<ProductTypesSelectionToolbar />);
		expect(screen.getByText("Activer")).toBeInTheDocument();
	});

	it("shows 'Désactiver' menu item", () => {
		mockSelectedItems.value = ["pt-1"];
		render(<ProductTypesSelectionToolbar />);
		expect(screen.getByText("Désactiver")).toBeInTheDocument();
	});

	it("shows 'Supprimer' menu item", () => {
		mockSelectedItems.value = ["pt-1"];
		render(<ProductTypesSelectionToolbar />);
		expect(screen.getByText("Supprimer")).toBeInTheDocument();
	});

	it("shows sr-only text 'Ouvrir le menu'", () => {
		mockSelectedItems.value = ["pt-1"];
		render(<ProductTypesSelectionToolbar />);
		expect(screen.getByText("Ouvrir le menu")).toBeInTheDocument();
	});

	// ─── Click interactions ───────────────────────────────────────────────────

	it("clicking 'Activer' calls activateProductTypes", async () => {
		mockSelectedItems.value = ["pt-1", "pt-2"];
		render(<ProductTypesSelectionToolbar />);
		await userEvent.click(screen.getByText("Activer"));
		expect(mockActivate).toHaveBeenCalledWith(["pt-1", "pt-2"]);
	});

	it("clicking 'Désactiver' calls deactivateProductTypes", async () => {
		mockSelectedItems.value = ["pt-1", "pt-2"];
		render(<ProductTypesSelectionToolbar />);
		await userEvent.click(screen.getByText("Désactiver"));
		expect(mockDeactivate).toHaveBeenCalledWith(["pt-1", "pt-2"]);
	});

	it("clicking 'Supprimer' opens delete dialog", async () => {
		mockSelectedItems.value = ["pt-1"];
		render(<ProductTypesSelectionToolbar />);
		await userEvent.click(screen.getByText("Supprimer"));
		expect(mockBulkDeleteDialog.open).toHaveBeenCalled();
	});

	it("'Supprimer' has destructive variant", () => {
		mockSelectedItems.value = ["pt-1"];
		render(<ProductTypesSelectionToolbar />);
		const deleteBtn = screen.getByText("Supprimer").closest("button");
		expect(deleteBtn).toHaveAttribute("data-variant", "destructive");
	});
});
