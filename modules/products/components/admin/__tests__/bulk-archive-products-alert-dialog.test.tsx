import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockDialog, mockBulkArchiveProducts, mockSelectionContext } = vi.hoisted(() => ({
	mockDialog: {
		isOpen: true,
		data: null as Record<string, unknown> | null,
		close: vi.fn(),
	},
	mockBulkArchiveProducts: {
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

vi.mock("@/modules/products/hooks/use-bulk-archive-products", () => ({
	useBulkArchiveProducts: () => mockBulkArchiveProducts,
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
			className,
		}: {
			children?: unknown;
			disabled?: boolean;
			"aria-busy"?: boolean;
			type?: string;
			className?: string;
		}) =>
			createElement(
				"button",
				{
					"data-testid": "alert-dialog-action",
					disabled,
					"aria-busy": String(ariaBusy),
					className,
				},
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

import { BulkArchiveProductsAlertDialog } from "../bulk-archive-products-alert-dialog";

// ============================================================================
// SETUP
// ============================================================================

beforeEach(() => {
	vi.resetAllMocks();
	mockDialog.isOpen = true;
	mockDialog.data = null;
	mockDialog.close = vi.fn();
	mockBulkArchiveProducts.action = vi.fn();
	mockBulkArchiveProducts.isPending = false;
	mockSelectionContext.clearSelection = vi.fn();
});

afterEach(cleanup);

// ============================================================================
// HELPERS
// ============================================================================

function renderDialog() {
	return render(<BulkArchiveProductsAlertDialog />);
}

// ============================================================================
// TESTS
// ============================================================================

describe("BulkArchiveProductsAlertDialog", () => {
	// --------------------------------------------------------------------------
	// Bulk archiving mode
	// --------------------------------------------------------------------------

	describe("archiving mode (targetStatus = ARCHIVED)", () => {
		beforeEach(() => {
			mockDialog.data = {
				productIds: ["prod-1", "prod-2", "prod-3"],
				targetStatus: "ARCHIVED",
			};
		});

		it("renders title with singular form for one product", () => {
			mockDialog.data = { productIds: ["prod-1"], targetStatus: "ARCHIVED" };
			renderDialog();

			expect(screen.getByTestId("alert-dialog-title")).toHaveTextContent("Archiver 1 bijou");
		});

		it("renders title with plural form for multiple products", () => {
			renderDialog();

			expect(screen.getByTestId("alert-dialog-title")).toHaveTextContent("Archiver 3 bijoux");
		});

		it("shows archiving confirmation text with product count", () => {
			renderDialog();

			expect(screen.getByTestId("alert-dialog-description")).toHaveTextContent(
				"Êtes-vous sûr de vouloir archiver",
			);
			expect(screen.getByTestId("alert-dialog-description")).toHaveTextContent("3 bijoux");
		});

		it("shows plural visibility message for multiple products", () => {
			renderDialog();

			expect(screen.getByTestId("alert-dialog-description")).toHaveTextContent(
				"Ces bijoux ne seront",
			);
		});

		it("shows singular visibility message for one product", () => {
			mockDialog.data = { productIds: ["prod-1"], targetStatus: "ARCHIVED" };
			renderDialog();

			expect(screen.getByTestId("alert-dialog-description")).toHaveTextContent("Ce bijou ne sera");
		});

		it("shows restore hint message", () => {
			renderDialog();

			expect(screen.getByTestId("alert-dialog-description")).toHaveTextContent(
				"Vous pourrez les restaurer à tout moment.",
			);
		});

		it("renders submit button with 'Archiver' label", () => {
			renderDialog();

			expect(screen.getByTestId("alert-dialog-action")).toHaveTextContent("Archiver");
		});

		it("submit button has orange styling when archiving", () => {
			renderDialog();

			expect(screen.getByTestId("alert-dialog-action")).toHaveClass("bg-orange-600");
		});

		it("sets productIds hidden field as JSON array", () => {
			const { container } = renderDialog();

			const field = container.querySelector('input[name="productIds"]') as HTMLInputElement;
			expect(field.value).toBe(JSON.stringify(["prod-1", "prod-2", "prod-3"]));
		});

		it("sets targetStatus hidden field to ARCHIVED", () => {
			const { container } = renderDialog();

			const field = container.querySelector('input[name="targetStatus"]') as HTMLInputElement;
			expect(field.value).toBe("ARCHIVED");
		});
	});

	// --------------------------------------------------------------------------
	// Bulk restore mode
	// --------------------------------------------------------------------------

	describe("restore mode (targetStatus = PUBLIC)", () => {
		beforeEach(() => {
			mockDialog.data = {
				productIds: ["prod-1", "prod-2"],
				targetStatus: "PUBLIC",
			};
		});

		it("renders title with plural form for multiple products", () => {
			renderDialog();

			expect(screen.getByTestId("alert-dialog-title")).toHaveTextContent("Restaurer 2 bijoux");
		});

		it("renders title with singular form for one product", () => {
			mockDialog.data = { productIds: ["prod-1"], targetStatus: "PUBLIC" };
			renderDialog();

			expect(screen.getByTestId("alert-dialog-title")).toHaveTextContent("Restaurer 1 bijou");
		});

		it("shows restore confirmation text", () => {
			renderDialog();

			expect(screen.getByTestId("alert-dialog-description")).toHaveTextContent(
				"Êtes-vous sûr de vouloir restaurer",
			);
		});

		it("shows plural restore message for multiple products", () => {
			renderDialog();

			expect(screen.getByTestId("alert-dialog-description")).toHaveTextContent(
				"Ces bijoux seront remis",
			);
		});

		it("shows singular restore message for one product", () => {
			mockDialog.data = { productIds: ["prod-1"], targetStatus: "PUBLIC" };
			renderDialog();

			expect(screen.getByTestId("alert-dialog-description")).toHaveTextContent(
				"Ce bijou sera remis",
			);
		});

		it("renders submit button with 'Restaurer' label", () => {
			renderDialog();

			expect(screen.getByTestId("alert-dialog-action")).toHaveTextContent("Restaurer");
		});

		it("sets targetStatus hidden field to PUBLIC", () => {
			const { container } = renderDialog();

			const field = container.querySelector('input[name="targetStatus"]') as HTMLInputElement;
			expect(field.value).toBe("PUBLIC");
		});
	});

	// --------------------------------------------------------------------------
	// Pending state
	// --------------------------------------------------------------------------

	describe("pending state", () => {
		beforeEach(() => {
			mockDialog.data = {
				productIds: ["prod-1", "prod-2"],
				targetStatus: "ARCHIVED",
			};
			mockBulkArchiveProducts.isPending = true;
		});

		it("shows 'Archivage...' when pending in archive mode", () => {
			renderDialog();

			expect(screen.getByTestId("alert-dialog-action")).toHaveTextContent("Archivage...");
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

		it("shows 'Restauration...' when pending in restore mode", () => {
			mockDialog.data = { productIds: ["prod-1"], targetStatus: "PUBLIC" };
			renderDialog();

			expect(screen.getByTestId("alert-dialog-action")).toHaveTextContent("Restauration...");
		});
	});

	// --------------------------------------------------------------------------
	// Cancel button
	// --------------------------------------------------------------------------

	describe("cancel button", () => {
		beforeEach(() => {
			mockDialog.data = {
				productIds: ["prod-1"],
				targetStatus: "ARCHIVED",
			};
		});

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
		beforeEach(() => {
			mockDialog.data = {
				productIds: ["prod-1"],
				targetStatus: "ARCHIVED",
			};
		});

		it("calls dialog.close() when closed and not pending", () => {
			renderDialog();

			fireEvent.click(screen.getByTestId("alert-dialog"));

			expect(mockDialog.close).toHaveBeenCalledTimes(1);
		});

		it("does NOT call dialog.close() when closed while pending", () => {
			mockBulkArchiveProducts.isPending = true;
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

		it("shows 0 count in title when data is null", () => {
			mockDialog.data = null;
			renderDialog();

			// When data is null, targetStatus is undefined (not === "ARCHIVED"), so isArchiving = false → "Restaurer"
			expect(screen.getByTestId("alert-dialog-title")).toHaveTextContent("Restaurer 0 bijou");
		});
	});
});
