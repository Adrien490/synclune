import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockDialog, mockDuplicateProduct } = vi.hoisted(() => ({
	mockDialog: {
		isOpen: true,
		data: null as Record<string, unknown> | null,
		close: vi.fn(),
	},
	mockDuplicateProduct: {
		action: vi.fn(),
		isPending: false,
	},
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/providers/alert-dialog-store-provider", () => ({
	useAlertDialog: () => mockDialog,
}));

vi.mock("@/modules/products/hooks/use-duplicate-product", () => ({
	useDuplicateProduct: () => mockDuplicateProduct,
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

import { DuplicateProductAlertDialog } from "../duplicate-product-alert-dialog";

// ============================================================================
// SETUP
// ============================================================================

beforeEach(() => {
	vi.resetAllMocks();
	mockDialog.isOpen = true;
	mockDialog.data = null;
	mockDialog.close = vi.fn();
	mockDuplicateProduct.action = vi.fn();
	mockDuplicateProduct.isPending = false;
});

afterEach(cleanup);

// ============================================================================
// HELPERS
// ============================================================================

function renderDialog() {
	return render(<DuplicateProductAlertDialog />);
}

// ============================================================================
// TESTS
// ============================================================================

describe("DuplicateProductAlertDialog", () => {
	// --------------------------------------------------------------------------
	// Title
	// --------------------------------------------------------------------------

	describe("title", () => {
		it("renders 'Dupliquer ce bijou' title", () => {
			renderDialog();

			expect(screen.getByTestId("alert-dialog-title")).toHaveTextContent("Dupliquer ce bijou");
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

		it("shows duplication confirmation text", () => {
			renderDialog();

			expect(screen.getByTestId("alert-dialog-description")).toHaveTextContent(
				"Êtes-vous sûr de vouloir dupliquer le bijou",
			);
		});

		it("mentions 'Copie de' prefix for the title", () => {
			renderDialog();

			expect(screen.getByTestId("alert-dialog-description")).toHaveTextContent(
				'Le titre préfixé par "Copie de"',
			);
		});

		it("mentions variants and images are copied", () => {
			renderDialog();

			expect(screen.getByTestId("alert-dialog-description")).toHaveTextContent(
				"Toutes les variantes et leurs images",
			);
		});

		it("mentions the status will be set to Brouillon", () => {
			renderDialog();

			expect(screen.getByTestId("alert-dialog-description")).toHaveTextContent(
				'Le statut mis en "Brouillon"',
			);
		});

		it("shows the edit suggestion note", () => {
			renderDialog();

			expect(screen.getByTestId("alert-dialog-description")).toHaveTextContent(
				"Vous pourrez ensuite modifier le bijou dupliqué",
			);
		});

		it("sets productId hidden field from dialog data", () => {
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
		it("shows 'Dupliquer' label when not pending", () => {
			renderDialog();

			expect(screen.getByTestId("alert-dialog-action")).toHaveTextContent("Dupliquer");
		});

		it("shows 'Duplication...' label when pending", () => {
			mockDuplicateProduct.isPending = true;
			renderDialog();

			expect(screen.getByTestId("alert-dialog-action")).toHaveTextContent("Duplication...");
		});

		it("shows loader icon when pending", () => {
			mockDuplicateProduct.isPending = true;
			renderDialog();

			expect(screen.getByTestId("loader-circle")).toBeInTheDocument();
		});

		it("does not show loader icon when not pending", () => {
			renderDialog();

			expect(screen.queryByTestId("loader-circle")).not.toBeInTheDocument();
		});

		it("is disabled when pending", () => {
			mockDuplicateProduct.isPending = true;
			renderDialog();

			expect(screen.getByTestId("alert-dialog-action")).toBeDisabled();
		});

		it("is not disabled when not pending", () => {
			renderDialog();

			expect(screen.getByTestId("alert-dialog-action")).not.toBeDisabled();
		});

		it("sets aria-busy to true when pending", () => {
			mockDuplicateProduct.isPending = true;
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
			mockDuplicateProduct.isPending = true;
			renderDialog();

			expect(screen.getByTestId("alert-dialog-cancel")).toBeDisabled();
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
			mockDuplicateProduct.isPending = true;
			renderDialog();

			fireEvent.click(screen.getByTestId("alert-dialog"));

			expect(mockDialog.close).not.toHaveBeenCalled();
		});
	});
});
