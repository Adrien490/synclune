import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockDialog, mockSelectionContext } = vi.hoisted(() => ({
	mockDialog: {
		isOpen: true,
		data: null as Record<string, unknown> | null,
		close: vi.fn(),
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
				{ "data-testid": "alert-dialog", onClick: () => onOpenChange?.(false) },
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

import { BulkDeleteDialog } from "../bulk-delete-dialog";

// ============================================================================
// SETUP
// ============================================================================

beforeEach(() => {
	vi.clearAllMocks();
	mockDialog.isOpen = true;
	mockDialog.data = null;
	mockDialog.close = vi.fn();
	mockSelectionContext.clearSelection = vi.fn();
});

afterEach(cleanup);

// ============================================================================
// HELPERS
// ============================================================================

function renderDialog(props: Partial<Parameters<typeof BulkDeleteDialog>[0]> = {}) {
	return render(
		<BulkDeleteDialog
			dialogId="test-bulk-dialog"
			description="Confirmer la suppression groupée"
			action={vi.fn()}
			isPending={false}
			{...props}
		/>,
	);
}

// ============================================================================
// TESTS
// ============================================================================

describe("BulkDeleteDialog", () => {
	// ============================================================================
	// TITLE
	// ============================================================================

	describe("title", () => {
		it("renders default title 'Confirmer la suppression'", () => {
			renderDialog();

			expect(screen.getByTestId("alert-dialog-title")).toHaveTextContent(
				"Confirmer la suppression",
			);
		});

		it("renders custom title when provided", () => {
			renderDialog({ title: "Supprimer les produits sélectionnés" });

			expect(screen.getByTestId("alert-dialog-title")).toHaveTextContent(
				"Supprimer les produits sélectionnés",
			);
		});
	});

	// ============================================================================
	// DESCRIPTION
	// ============================================================================

	describe("description", () => {
		it("renders string description", () => {
			renderDialog({ description: "Supprimer tous les éléments sélectionnés ?" });

			expect(screen.getByTestId("alert-dialog-description")).toHaveTextContent(
				"Supprimer tous les éléments sélectionnés ?",
			);
		});

		it("renders function description receiving count of ids", () => {
			mockDialog.data = { ids: ["id-1", "id-2", "id-3"] };
			renderDialog({
				description: (count) => <span>{count} éléments à supprimer</span>,
			});

			expect(screen.getByTestId("alert-dialog-description")).toHaveTextContent(
				"3 éléments à supprimer",
			);
		});

		it("renders function description with count 0 when data is null", () => {
			mockDialog.data = null;
			renderDialog({
				description: (count) => <span>{count} éléments</span>,
			});

			expect(screen.getByTestId("alert-dialog-description")).toHaveTextContent("0 éléments");
		});
	});

	// ============================================================================
	// HIDDEN FIELD
	// ============================================================================

	describe("hidden ids field", () => {
		it("hidden field contains JSON.stringify of ids from dialog data", () => {
			mockDialog.data = { ids: ["id-1", "id-2"] };
			const { container } = renderDialog();

			const field = container.querySelector('input[name="ids"]') as HTMLInputElement;
			expect(field).toBeInTheDocument();
			expect(field.value).toBe(JSON.stringify(["id-1", "id-2"]));
		});

		it("uses custom idsFieldName for the hidden input name", () => {
			mockDialog.data = { productIds: ["p-1"] };
			const { container } = renderDialog({ idsFieldName: "productIds", idsDataKey: "productIds" });

			const field = container.querySelector('input[name="productIds"]') as HTMLInputElement;
			expect(field).toBeInTheDocument();
			expect(field.value).toBe(JSON.stringify(["p-1"]));
		});

		it("uses custom idsDataKey to read ids from dialog data", () => {
			mockDialog.data = { productIds: ["p-a", "p-b"] };
			const { container } = renderDialog({ idsFieldName: "productIds", idsDataKey: "productIds" });

			const field = container.querySelector('input[name="productIds"]') as HTMLInputElement;
			expect(field.value).toBe(JSON.stringify(["p-a", "p-b"]));
		});

		it("uses empty array when data is null", () => {
			mockDialog.data = null;
			const { container } = renderDialog();

			const field = container.querySelector('input[name="ids"]') as HTMLInputElement;
			expect(field.value).toBe(JSON.stringify([]));
		});
	});

	// ============================================================================
	// CANCEL BUTTON
	// ============================================================================

	describe("cancel button", () => {
		it("cancel button is disabled when isPending", () => {
			renderDialog({ isPending: true });

			expect(screen.getByTestId("alert-dialog-cancel")).toBeDisabled();
		});

		it("cancel button is not disabled when not pending", () => {
			renderDialog({ isPending: false });

			expect(screen.getByTestId("alert-dialog-cancel")).not.toBeDisabled();
		});
	});

	// ============================================================================
	// SUBMIT BUTTON
	// ============================================================================

	describe("submit button", () => {
		it("submit button is disabled when isPending", () => {
			renderDialog({ isPending: true });

			expect(screen.getByTestId("alert-dialog-action")).toBeDisabled();
		});

		it("submit button has aria-busy='true' when isPending", () => {
			renderDialog({ isPending: true });

			expect(screen.getByTestId("alert-dialog-action")).toHaveAttribute("aria-busy", "true");
		});

		it("submit button has aria-busy='false' when not pending", () => {
			renderDialog({ isPending: false });

			expect(screen.getByTestId("alert-dialog-action")).toHaveAttribute("aria-busy", "false");
		});

		it("shows loader icon when isPending", () => {
			renderDialog({ isPending: true });

			expect(screen.getByTestId("loader-circle")).toBeInTheDocument();
		});

		it("does not show loader icon when not pending", () => {
			renderDialog({ isPending: false });

			expect(screen.queryByTestId("loader-circle")).not.toBeInTheDocument();
		});

		it("shows pendingLabel when isPending", () => {
			renderDialog({ isPending: true, pendingLabel: "Suppression en cours..." });

			expect(screen.getByTestId("alert-dialog-action")).toHaveTextContent(
				"Suppression en cours...",
			);
		});

		it("shows submitLabel when not pending", () => {
			renderDialog({ isPending: false, submitLabel: "Tout supprimer" });

			expect(screen.getByTestId("alert-dialog-action")).toHaveTextContent("Tout supprimer");
		});
	});

	// ============================================================================
	// OPEN CHANGE
	// ============================================================================

	describe("onOpenChange", () => {
		it("calls dialog.close() when onOpenChange fires with false and not pending", () => {
			renderDialog({ isPending: false });

			fireEvent.click(screen.getByTestId("alert-dialog"));

			expect(mockDialog.close).toHaveBeenCalledTimes(1);
		});

		it("does NOT call dialog.close() when onOpenChange fires with false and isPending", () => {
			renderDialog({ isPending: true });

			fireEvent.click(screen.getByTestId("alert-dialog"));

			expect(mockDialog.close).not.toHaveBeenCalled();
		});
	});
});
