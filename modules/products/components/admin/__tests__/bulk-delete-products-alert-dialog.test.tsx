import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockDialog, mockBulkDeleteProducts, mockSelectionContext } = vi.hoisted(() => ({
	mockDialog: {
		isOpen: true,
		data: null as Record<string, unknown> | null,
		close: vi.fn(),
	},
	mockBulkDeleteProducts: {
		action: vi.fn(),
		isPending: false,
	},
	mockSelectionContext: {
		clearSelection: vi.fn(),
		isSelected: vi.fn(() => false),
		handleItemSelectionChange: vi.fn(),
		areAllSelected: vi.fn(() => false),
		areSomeSelected: vi.fn(() => false),
		handleSelectionChange: vi.fn(),
		getSelectedCount: vi.fn(() => 0),
		selectedItems: [] as string[],
		isPending: false,
		clearItems: vi.fn(),
	},
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/providers/alert-dialog-store-provider", () => ({
	useAlertDialog: () => mockDialog,
}));

vi.mock("@/modules/products/hooks/use-bulk-delete-products", () => ({
	useBulkDeleteProducts: () => mockBulkDeleteProducts,
}));

vi.mock("@/shared/contexts/selection-context", () => ({
	useSelectionContext: () => mockSelectionContext,
}));

vi.mock("@/shared/components/ui/alert-dialog", () => {
	const { createElement } = require("react");
	return {
		AlertDialog: ({
			children,
			open: _open,
			onOpenChange,
		}: {
			children: unknown;
			open?: boolean;
			onOpenChange?: (v: boolean) => void;
		}) =>
			createElement(
				"div",
				{
					"data-testid": "alert-dialog",
					"data-open": String(_open),
					onClick: () => onOpenChange?.(false),
				},
				children,
			),
		AlertDialogContent: ({ children }: { children?: unknown }) =>
			createElement("div", { "data-testid": "alert-dialog-content" }, children),
		AlertDialogHeader: ({ children }: { children?: unknown }) =>
			createElement("div", { "data-testid": "alert-dialog-header" }, children),
		AlertDialogFooter: ({ children }: { children?: unknown }) =>
			createElement("div", { "data-testid": "alert-dialog-footer" }, children),
		AlertDialogTitle: ({ children }: { children?: unknown }) =>
			createElement("div", { "data-testid": "alert-dialog-title" }, children),
		AlertDialogDescription: ({
			children,
			asChild: _asChild,
			...props
		}: Record<string, unknown> & { children?: unknown }) =>
			createElement("div", { "data-testid": "alert-dialog-description", ...props }, children),
		AlertDialogCancel: ({
			children,
			disabled,
			onClick,
			type: _type,
		}: {
			children?: unknown;
			disabled?: boolean;
			onClick?: () => void;
			type?: string;
		}) =>
			createElement(
				"button",
				{ "data-testid": "alert-dialog-cancel", disabled, onClick },
				children,
			),
		AlertDialogAction: ({
			children,
			disabled,
			"aria-busy": ariaBusy,
			type: _type,
		}: {
			children?: unknown;
			disabled?: boolean;
			"aria-busy"?: boolean;
			type?: string;
		}) =>
			createElement(
				"button",
				{ "data-testid": "alert-dialog-action", disabled, "aria-busy": String(ariaBusy) },
				children,
			),
	};
});

vi.mock("lucide-react", () => ({
	LoaderCircle: (props: Record<string, unknown>) => {
		const { createElement } = require("react");
		return createElement("svg", { "data-testid": "loader-circle", ...props });
	},
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { BulkDeleteProductsAlertDialog } from "../bulk-delete-products-alert-dialog";

// ============================================================================
// SETUP
// ============================================================================

beforeEach(() => {
	vi.resetAllMocks();
	mockDialog.isOpen = true;
	mockDialog.data = null;
	mockDialog.close = vi.fn();
	mockBulkDeleteProducts.action = vi.fn();
	mockBulkDeleteProducts.isPending = false;
	mockSelectionContext.clearSelection = vi.fn();
});

afterEach(cleanup);

// ============================================================================
// HELPERS
// ============================================================================

function renderDialog() {
	return render(<BulkDeleteProductsAlertDialog />);
}

// ============================================================================
// TESTS
// ============================================================================

describe("BulkDeleteProductsAlertDialog", () => {
	// --------------------------------------------------------------------------
	// Title
	// --------------------------------------------------------------------------

	describe("title", () => {
		it("renders default confirmation title", () => {
			renderDialog();

			expect(screen.getByTestId("alert-dialog-title")).toHaveTextContent(
				"Confirmer la suppression",
			);
		});
	});

	// --------------------------------------------------------------------------
	// Description — single product
	// --------------------------------------------------------------------------

	describe("description with single product", () => {
		beforeEach(() => {
			mockDialog.data = { productIds: ["prod-1"] };
		});

		it("shows count of 1 product in description", () => {
			renderDialog();

			expect(screen.getByTestId("alert-dialog-description")).toHaveTextContent("1 produit");
		});

		it("uses singular form 'produit' for one item", () => {
			renderDialog();

			// Should not have 'produits' (plural)
			const description = screen.getByTestId("alert-dialog-description");
			expect(description).toHaveTextContent("1 produit");
			expect(description.textContent).not.toContain("1 produits");
		});

		it("shows irreversible action warning", () => {
			renderDialog();

			expect(screen.getByTestId("alert-dialog-description")).toHaveTextContent(
				"Cette action est irréversible",
			);
		});

		it("mentions deletion of variants and images", () => {
			renderDialog();

			expect(screen.getByTestId("alert-dialog-description")).toHaveTextContent(
				"toutes les variantes et images associées",
			);
		});

		it("shows snapshot note", () => {
			renderDialog();

			expect(screen.getByTestId("alert-dialog-description")).toHaveTextContent(
				"Les commandes existantes conserveront les informations des produits",
			);
		});
	});

	// --------------------------------------------------------------------------
	// Description — multiple products
	// --------------------------------------------------------------------------

	describe("description with multiple products", () => {
		beforeEach(() => {
			mockDialog.data = { productIds: ["prod-1", "prod-2", "prod-3"] };
		});

		it("shows count of 3 products in description", () => {
			renderDialog();

			expect(screen.getByTestId("alert-dialog-description")).toHaveTextContent("3 produits");
		});

		it("uses plural form 'produits' for multiple items", () => {
			renderDialog();

			expect(screen.getByTestId("alert-dialog-description")).toHaveTextContent("3 produits");
		});
	});

	// --------------------------------------------------------------------------
	// Hidden field
	// --------------------------------------------------------------------------

	describe("hidden productIds field", () => {
		it("sets productIds hidden field as JSON array", () => {
			mockDialog.data = { productIds: ["prod-1", "prod-2"] };
			const { container } = renderDialog();

			const field = container.querySelector('input[name="productIds"]') as HTMLInputElement;
			expect(field).toBeInTheDocument();
			expect(field.value).toBe(JSON.stringify(["prod-1", "prod-2"]));
		});

		it("sets productIds to empty array when data is null", () => {
			mockDialog.data = null;
			const { container } = renderDialog();

			const field = container.querySelector('input[name="productIds"]') as HTMLInputElement;
			expect(field.value).toBe(JSON.stringify([]));
		});
	});

	// --------------------------------------------------------------------------
	// Pending state
	// --------------------------------------------------------------------------

	describe("pending state", () => {
		beforeEach(() => {
			mockDialog.data = { productIds: ["prod-1", "prod-2"] };
			mockBulkDeleteProducts.isPending = true;
		});

		it("shows 'Suppression...' label when pending", () => {
			renderDialog();

			expect(screen.getByTestId("alert-dialog-action")).toHaveTextContent("Suppression...");
		});

		it("shows loader icon when pending", () => {
			renderDialog();

			expect(screen.getByTestId("loader-circle")).toBeInTheDocument();
		});

		it("disables cancel button when pending", () => {
			renderDialog();

			expect(screen.getByTestId("alert-dialog-cancel")).toBeDisabled();
		});

		it("disables submit button when pending", () => {
			renderDialog();

			expect(screen.getByTestId("alert-dialog-action")).toBeDisabled();
		});

		it("sets aria-busy to true when pending", () => {
			renderDialog();

			expect(screen.getByTestId("alert-dialog-action")).toHaveAttribute("aria-busy", "true");
		});

		it("does not show loader icon when not pending", () => {
			mockBulkDeleteProducts.isPending = false;
			renderDialog();

			expect(screen.queryByTestId("loader-circle")).not.toBeInTheDocument();
		});

		it("sets aria-busy to false when not pending", () => {
			mockBulkDeleteProducts.isPending = false;
			renderDialog();

			expect(screen.getByTestId("alert-dialog-action")).toHaveAttribute("aria-busy", "false");
		});
	});

	// --------------------------------------------------------------------------
	// Submit button
	// --------------------------------------------------------------------------

	describe("submit button", () => {
		it("shows 'Supprimer' label when not pending", () => {
			renderDialog();

			expect(screen.getByTestId("alert-dialog-action")).toHaveTextContent("Supprimer");
		});

		it("is not disabled when not pending", () => {
			renderDialog();

			expect(screen.getByTestId("alert-dialog-action")).not.toBeDisabled();
		});
	});

	// --------------------------------------------------------------------------
	// Cancel button
	// --------------------------------------------------------------------------

	describe("cancel button", () => {
		it("renders 'Annuler' label", () => {
			renderDialog();

			expect(screen.getByTestId("alert-dialog-cancel")).toHaveTextContent("Annuler");
		});

		it("is not disabled when not pending", () => {
			renderDialog();

			expect(screen.getByTestId("alert-dialog-cancel")).not.toBeDisabled();
		});
	});

	// --------------------------------------------------------------------------
	// onOpenChange behavior
	// --------------------------------------------------------------------------

	describe("onOpenChange", () => {
		it("calls dialog.close() when closed and not pending", () => {
			renderDialog();

			fireEvent.click(screen.getByTestId("alert-dialog"));

			expect(mockDialog.close).toHaveBeenCalledTimes(1);
		});

		it("does NOT call dialog.close() when closed while pending", () => {
			mockBulkDeleteProducts.isPending = true;
			renderDialog();

			fireEvent.click(screen.getByTestId("alert-dialog"));

			expect(mockDialog.close).not.toHaveBeenCalled();
		});
	});

	// --------------------------------------------------------------------------
	// Null data fallback
	// --------------------------------------------------------------------------

	describe("null data fallback", () => {
		it("renders without crashing when data is null", () => {
			mockDialog.data = null;

			expect(() => renderDialog()).not.toThrow();
		});

		it("shows 0 products in description when data is null", () => {
			mockDialog.data = null;
			renderDialog();

			expect(screen.getByTestId("alert-dialog-description")).toHaveTextContent("0 produit");
		});
	});
});
