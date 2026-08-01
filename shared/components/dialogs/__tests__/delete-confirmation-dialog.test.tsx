import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockDialog } = vi.hoisted(() => ({
	mockDialog: {
		isOpen: true,
		data: null as Record<string, unknown> | null,
		close: vi.fn(),
	},
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/providers/alert-dialog-store-provider", () => ({
	useAlertDialog: () => mockDialog,
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
	Loader2Icon: (props: Record<string, unknown>) => {
		const { createElement } = require("react");
		return createElement("svg", { "data-testid": "loader-circle", ...props });
	},
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { DeleteConfirmationDialog } from "../delete-confirmation-dialog";

// ============================================================================
// SETUP
// ============================================================================

beforeEach(() => {
	vi.clearAllMocks();
	mockDialog.isOpen = true;
	mockDialog.data = null;
	mockDialog.close = vi.fn();
});

afterEach(cleanup);

// ============================================================================
// HELPERS
// ============================================================================

function renderDialog(props: Partial<Parameters<typeof DeleteConfirmationDialog>[0]> = {}) {
	return render(
		<DeleteConfirmationDialog
			dialogId="test-dialog"
			description="Are you sure?"
			action={vi.fn()}
			isPending={false}
			hiddenFields={[]}
			{...props}
		/>,
	);
}

// ============================================================================
// TESTS
// ============================================================================

describe("DeleteConfirmationDialog", () => {
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
			renderDialog({ title: "Supprimer le produit" });

			expect(screen.getByTestId("alert-dialog-title")).toHaveTextContent("Supprimer le produit");
		});
	});

	// ============================================================================
	// DESCRIPTION
	// ============================================================================

	describe("description", () => {
		it("renders string description", () => {
			renderDialog({ description: "Êtes-vous sûr de vouloir supprimer cet élément ?" });

			expect(screen.getByTestId("alert-dialog-description")).toHaveTextContent(
				"Êtes-vous sûr de vouloir supprimer cet élément ?",
			);
		});

		it("renders function description with dialog data", () => {
			mockDialog.data = { colorName: "Rouge" };
			renderDialog({
				description: (data) => (
					<span>Supprimer {(data as { colorName: string } | null)?.colorName}</span>
				),
			});

			expect(screen.getByTestId("alert-dialog-description")).toHaveTextContent("Supprimer Rouge");
		});
	});

	// ============================================================================
	// HIDDEN FIELDS
	// ============================================================================

	describe("hidden fields", () => {
		it("populates hidden fields from dialog data", () => {
			mockDialog.data = { colorId: "abc-123", colorName: "Bleu" };
			const { container } = renderDialog({
				hiddenFields: [
					{ name: "id", dataKey: "colorId" },
					{ name: "name", dataKey: "colorName" },
				],
			});

			const idField = container.querySelector('input[name="id"]') as HTMLInputElement;
			const nameField = container.querySelector('input[name="name"]') as HTMLInputElement;

			expect(idField).toBeInTheDocument();
			expect(idField.value).toBe("abc-123");
			expect(nameField).toBeInTheDocument();
			expect(nameField.value).toBe("Bleu");
		});

		it("uses empty string for hidden field value when data is null", () => {
			mockDialog.data = null;
			const { container } = renderDialog({
				hiddenFields: [{ name: "id", dataKey: "colorId" }],
			});

			const idField = container.querySelector('input[name="id"]') as HTMLInputElement;
			expect(idField.value).toBe("");
		});
	});

	// ============================================================================
	// CANCEL BUTTON
	// ============================================================================

	describe("cancel button", () => {
		it("calls dialog.close() when cancel button is clicked and not pending", () => {
			renderDialog({ isPending: false });

			fireEvent.click(screen.getByTestId("alert-dialog-cancel"));

			expect(mockDialog.close).toHaveBeenCalledTimes(1);
		});

		it("does NOT call dialog.close() when cancel button is clicked and isPending", () => {
			renderDialog({ isPending: true });

			fireEvent.click(screen.getByTestId("alert-dialog-cancel"));

			expect(mockDialog.close).not.toHaveBeenCalled();
		});

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
		it("shows submitLabel when not pending", () => {
			renderDialog({ submitLabel: "Supprimer", isPending: false });

			expect(screen.getByTestId("alert-dialog-action")).toHaveTextContent("Supprimer");
		});

		it("shows default submitLabel 'Supprimer' when not pending and no label provided", () => {
			renderDialog({ isPending: false });

			expect(screen.getByTestId("alert-dialog-action")).toHaveTextContent("Supprimer");
		});

		it("shows pendingLabel when isPending", () => {
			renderDialog({ pendingLabel: "Suppression…", isPending: true });

			expect(screen.getByTestId("alert-dialog-action")).toHaveTextContent("Suppression…");
		});

		it("shows loader icon when isPending", () => {
			renderDialog({ isPending: true });

			expect(screen.getByTestId("loader-circle")).toBeInTheDocument();
		});

		it("does not show loader icon when not pending", () => {
			renderDialog({ isPending: false });

			expect(screen.queryByTestId("loader-circle")).not.toBeInTheDocument();
		});

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
	});

	// ============================================================================
	// OPEN CHANGE
	// ============================================================================

	describe("onOpenChange", () => {
		it("calls dialog.close() when onOpenChange fires with false and not pending", () => {
			renderDialog({ isPending: false });

			// Trigger onOpenChange(false) via the mock AlertDialog click handler
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
