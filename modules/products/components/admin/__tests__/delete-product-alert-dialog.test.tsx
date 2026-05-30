import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockDialog, mockDeleteProduct } = vi.hoisted(() => ({
	mockDialog: {
		isOpen: true,
		data: null as Record<string, unknown> | null,
		close: vi.fn(),
	},
	mockDeleteProduct: {
		action: vi.fn(),
		isPending: false,
	},
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/hooks/use-back-to-list-on-delete", () => ({
	useBackToListOnDelete: () => vi.fn(),
}));

vi.mock("@/shared/providers/alert-dialog-store-provider", () => ({
	useAlertDialog: () => mockDialog,
}));

vi.mock("@/modules/products/hooks/use-delete-product", () => ({
	useDeleteProduct: () => mockDeleteProduct,
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

vi.mock("lucide-react", async (importOriginal) => ({
	...((await importOriginal()) as Record<string, unknown>),
	LoaderCircle: (props: Record<string, unknown>) => {
		const { createElement } = require("react");
		return createElement("svg", { "data-testid": "loader-circle", ...props });
	},
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { DeleteProductAlertDialog } from "../delete-product-alert-dialog";

// ============================================================================
// SETUP
// ============================================================================

beforeEach(() => {
	vi.resetAllMocks();
	mockDialog.isOpen = true;
	mockDialog.data = null;
	mockDialog.close = vi.fn();
	mockDeleteProduct.action = vi.fn();
	mockDeleteProduct.isPending = false;
});

afterEach(cleanup);

// ============================================================================
// HELPERS
// ============================================================================

function renderDialog() {
	return render(<DeleteProductAlertDialog />);
}

// ============================================================================
// TESTS
// ============================================================================

describe("DeleteProductAlertDialog", () => {
	// --------------------------------------------------------------------------
	// Title
	// --------------------------------------------------------------------------

	describe("title", () => {
		it("renders default delete confirmation title", () => {
			renderDialog();

			expect(screen.getByTestId("alert-dialog-title")).toHaveTextContent(
				"Confirmer la suppression",
			);
		});
	});

	// --------------------------------------------------------------------------
	// Description with product data
	// --------------------------------------------------------------------------

	describe("description", () => {
		beforeEach(() => {
			mockDialog.data = {
				productId: "prod-1",
				productTitle: "Bague Lune",
			};
		});

		it("displays the product title in the description", () => {
			renderDialog();

			expect(screen.getByTestId("alert-dialog-description")).toHaveTextContent("Bague Lune");
		});

		it("shows the deletion confirmation text", () => {
			renderDialog();

			expect(screen.getByTestId("alert-dialog-description")).toHaveTextContent(
				"Êtes-vous sûr de vouloir supprimer le bijou",
			);
		});

		it("shows irreversible action warning", () => {
			renderDialog();

			expect(screen.getByTestId("alert-dialog-description")).toHaveTextContent(
				"Cette action est irréversible",
			);
		});

		it("mentions variants and images deletion", () => {
			renderDialog();

			expect(screen.getByTestId("alert-dialog-description")).toHaveTextContent(
				"toutes les variantes et images associées",
			);
		});

		it("shows snapshot note about existing orders", () => {
			renderDialog();

			expect(screen.getByTestId("alert-dialog-description")).toHaveTextContent(
				"Les commandes existantes conserveront les informations du bijou",
			);
		});

		it("populates hidden productId field from productId data key", () => {
			const { container } = renderDialog();

			const field = container.querySelector('input[name="productId"]') as HTMLInputElement;
			expect(field.value).toBe("prod-1");
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

		it("uses empty string for hidden productId when data is null", () => {
			mockDialog.data = null;
			const { container } = renderDialog();

			const field = container.querySelector('input[name="productId"]') as HTMLInputElement;
			expect(field.value).toBe("");
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

		it("shows 'Suppression…' label when pending", () => {
			mockDeleteProduct.isPending = true;
			renderDialog();

			expect(screen.getByTestId("alert-dialog-action")).toHaveTextContent("Suppression…");
		});

		it("shows loader icon when pending", () => {
			mockDeleteProduct.isPending = true;
			renderDialog();

			expect(screen.getByTestId("loader-circle")).toBeInTheDocument();
		});

		it("does not show loader icon when not pending", () => {
			renderDialog();

			expect(screen.queryByTestId("loader-circle")).not.toBeInTheDocument();
		});

		it("is disabled when pending", () => {
			mockDeleteProduct.isPending = true;
			renderDialog();

			expect(screen.getByTestId("alert-dialog-action")).toBeDisabled();
		});

		it("is not disabled when not pending", () => {
			renderDialog();

			expect(screen.getByTestId("alert-dialog-action")).not.toBeDisabled();
		});

		it("sets aria-busy to true when pending", () => {
			mockDeleteProduct.isPending = true;
			renderDialog();

			expect(screen.getByTestId("alert-dialog-action")).toHaveAttribute("aria-busy", "true");
		});

		it("sets aria-busy to false when not pending", () => {
			renderDialog();

			expect(screen.getByTestId("alert-dialog-action")).toHaveAttribute("aria-busy", "false");
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

		it("is disabled when pending", () => {
			mockDeleteProduct.isPending = true;
			renderDialog();

			expect(screen.getByTestId("alert-dialog-cancel")).toBeDisabled();
		});

		it("is not disabled when not pending", () => {
			renderDialog();

			expect(screen.getByTestId("alert-dialog-cancel")).not.toBeDisabled();
		});

		it("calls dialog.close() when clicked and not pending", () => {
			renderDialog();

			fireEvent.click(screen.getByTestId("alert-dialog-cancel"));

			expect(mockDialog.close).toHaveBeenCalledTimes(1);
		});

		it("does NOT call dialog.close() when clicked while pending", () => {
			mockDeleteProduct.isPending = true;
			renderDialog();

			fireEvent.click(screen.getByTestId("alert-dialog-cancel"));

			expect(mockDialog.close).not.toHaveBeenCalled();
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
			mockDeleteProduct.isPending = true;
			renderDialog();

			fireEvent.click(screen.getByTestId("alert-dialog"));

			expect(mockDialog.close).not.toHaveBeenCalled();
		});
	});
});
