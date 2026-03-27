import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockDialog, mockToggleProductStatus } = vi.hoisted(() => ({
	mockDialog: {
		isOpen: true,
		data: null as Record<string, unknown> | null,
		close: vi.fn(),
	},
	mockToggleProductStatus: {
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

vi.mock("@/modules/products/hooks/use-toggle-product-status", () => ({
	useToggleProductStatus: () => mockToggleProductStatus,
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

import { ArchiveProductAlertDialog } from "../archive-product-alert-dialog";

// ============================================================================
// SETUP
// ============================================================================

beforeEach(() => {
	vi.resetAllMocks();
	mockDialog.isOpen = true;
	mockDialog.data = null;
	mockDialog.close = vi.fn();
	mockToggleProductStatus.action = vi.fn();
	mockToggleProductStatus.isPending = false;
});

afterEach(cleanup);

// ============================================================================
// HELPERS
// ============================================================================

function renderDialog() {
	return render(<ArchiveProductAlertDialog />);
}

// ============================================================================
// TESTS
// ============================================================================

describe("ArchiveProductAlertDialog", () => {
	// --------------------------------------------------------------------------
	// Archiving mode (status !== "ARCHIVED")
	// --------------------------------------------------------------------------

	describe("archiving mode", () => {
		beforeEach(() => {
			mockDialog.data = {
				productId: "prod-1",
				productTitle: "Bague Lune",
				productStatus: "PUBLIC",
			};
		});

		it("renders the archive title", () => {
			renderDialog();

			expect(screen.getByTestId("alert-dialog-title")).toHaveTextContent("Archiver le bijou");
		});

		it("displays the product title in the description", () => {
			renderDialog();

			expect(screen.getByTestId("alert-dialog-description")).toHaveTextContent("Bague Lune");
		});

		it("shows archiving confirmation text", () => {
			renderDialog();

			expect(screen.getByTestId("alert-dialog-description")).toHaveTextContent(
				"Êtes-vous sûr de vouloir archiver le bijou",
			);
		});

		it("shows visibility warning message", () => {
			renderDialog();

			expect(screen.getByTestId("alert-dialog-description")).toHaveTextContent(
				"Le bijou ne sera plus visible sur la boutique",
			);
		});

		it("shows restore hint message", () => {
			renderDialog();

			expect(screen.getByTestId("alert-dialog-description")).toHaveTextContent(
				"Vous pourrez le restaurer à tout moment.",
			);
		});

		it("renders submit button with 'Archiver' label", () => {
			renderDialog();

			expect(screen.getByTestId("alert-dialog-action")).toHaveTextContent("Archiver");
		});

		it("submit button has orange styling for archiving", () => {
			renderDialog();

			expect(screen.getByTestId("alert-dialog-action")).toHaveClass("bg-orange-600");
		});

		it("sets targetStatus hidden field to ARCHIVED", () => {
			const { container } = renderDialog();

			const targetStatusField = container.querySelector(
				'input[name="targetStatus"]',
			) as HTMLInputElement;
			expect(targetStatusField.value).toBe("ARCHIVED");
		});

		it("sets productId hidden field from dialog data", () => {
			const { container } = renderDialog();

			const productIdField = container.querySelector('input[name="productId"]') as HTMLInputElement;
			expect(productIdField.value).toBe("prod-1");
		});

		it("sets currentStatus hidden field from dialog data", () => {
			const { container } = renderDialog();

			const currentStatusField = container.querySelector(
				'input[name="currentStatus"]',
			) as HTMLInputElement;
			expect(currentStatusField.value).toBe("PUBLIC");
		});
	});

	// --------------------------------------------------------------------------
	// Unarchiving mode (status === "ARCHIVED")
	// --------------------------------------------------------------------------

	describe("unarchiving mode", () => {
		beforeEach(() => {
			mockDialog.data = {
				productId: "prod-2",
				productTitle: "Collier Étoile",
				productStatus: "ARCHIVED",
			};
		});

		it("renders the unarchive title", () => {
			renderDialog();

			expect(screen.getByTestId("alert-dialog-title")).toHaveTextContent("Désarchiver le bijou");
		});

		it("displays the product title in the description", () => {
			renderDialog();

			expect(screen.getByTestId("alert-dialog-description")).toHaveTextContent("Collier Étoile");
		});

		it("shows unarchiving confirmation text", () => {
			renderDialog();

			expect(screen.getByTestId("alert-dialog-description")).toHaveTextContent(
				"Êtes-vous sûr de vouloir désarchiver le bijou",
			);
		});

		it("shows 'Public' restore message", () => {
			renderDialog();

			expect(screen.getByTestId("alert-dialog-description")).toHaveTextContent(
				'remis en statut "Public"',
			);
		});

		it("renders submit button with 'Désarchiver' label", () => {
			renderDialog();

			expect(screen.getByTestId("alert-dialog-action")).toHaveTextContent("Désarchiver");
		});

		it("sets targetStatus hidden field to PUBLIC", () => {
			const { container } = renderDialog();

			const targetStatusField = container.querySelector(
				'input[name="targetStatus"]',
			) as HTMLInputElement;
			expect(targetStatusField.value).toBe("PUBLIC");
		});
	});

	// --------------------------------------------------------------------------
	// Pending state
	// --------------------------------------------------------------------------

	describe("pending state", () => {
		beforeEach(() => {
			mockDialog.data = {
				productId: "prod-1",
				productTitle: "Bague Lune",
				productStatus: "PUBLIC",
			};
			mockToggleProductStatus.isPending = true;
		});

		it("shows 'Archivage...' label when pending in archive mode", () => {
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

		it("shows 'Restauration...' label when pending in unarchive mode", () => {
			mockDialog.data = {
				productId: "prod-2",
				productTitle: "Collier Étoile",
				productStatus: "ARCHIVED",
			};
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
				productId: "prod-1",
				productTitle: "Bague Lune",
				productStatus: "PUBLIC",
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
				productId: "prod-1",
				productTitle: "Bague Lune",
				productStatus: "PUBLIC",
			};
		});

		it("calls dialog.close() when dialog is closed and not pending", () => {
			renderDialog();

			fireEvent.click(screen.getByTestId("alert-dialog"));

			expect(mockDialog.close).toHaveBeenCalledTimes(1);
		});

		it("does NOT call dialog.close() when dialog is closed while pending", () => {
			mockToggleProductStatus.isPending = true;
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

		it("defaults to archiving mode when data is null", () => {
			mockDialog.data = null;
			renderDialog();

			expect(screen.getByTestId("alert-dialog-title")).toHaveTextContent("Archiver le bijou");
		});
	});
});
