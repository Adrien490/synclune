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

vi.mock("@/shared/utils/cn", () => ({
	cn: (...classes: (string | undefined)[]) => classes.filter(Boolean).join(" "),
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

import { ChangeProductStatusAlertDialog } from "../change-product-status-alert-dialog";

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
	return render(<ChangeProductStatusAlertDialog />);
}

// ============================================================================
// TESTS
// ============================================================================

describe("ChangeProductStatusAlertDialog", () => {
	// --------------------------------------------------------------------------
	// Changing to DRAFT
	// --------------------------------------------------------------------------

	describe("changing to DRAFT", () => {
		beforeEach(() => {
			mockDialog.data = {
				productId: "prod-1",
				productTitle: "Bague Lune",
				currentStatus: "PUBLIC",
				targetStatus: "DRAFT",
			};
		});

		it("renders title with 'Brouillon' label", () => {
			renderDialog();

			expect(screen.getByTestId("alert-dialog-title")).toHaveTextContent(
				'Changer le statut en "Brouillon"',
			);
		});

		it("displays product title in description", () => {
			renderDialog();

			expect(screen.getByTestId("alert-dialog-description")).toHaveTextContent("Bague Lune");
		});

		it("shows current status 'Public' and target status 'Brouillon'", () => {
			renderDialog();

			expect(screen.getByTestId("alert-dialog-description")).toHaveTextContent("Public");
			expect(screen.getByTestId("alert-dialog-description")).toHaveTextContent("Brouillon");
		});

		it("shows DRAFT status description", () => {
			renderDialog();

			expect(screen.getByTestId("alert-dialog-description")).toHaveTextContent(
				"Le bijou sera sauvegardé comme brouillon",
			);
		});

		it("shows significant change warning when going from PUBLIC to non-PUBLIC", () => {
			renderDialog();

			expect(screen.getByTestId("alert-dialog-description")).toHaveTextContent(
				"Le bijou ne sera plus visible sur la boutique.",
			);
		});

		it("renders submit button with 'Changer en Brouillon' label", () => {
			renderDialog();

			expect(screen.getByTestId("alert-dialog-action")).toHaveTextContent("Changer en Brouillon");
		});

		it("submit button has neutral tone for DRAFT (no bg override)", () => {
			renderDialog();

			const actionBtn = screen.getByTestId("alert-dialog-action");
			expect(actionBtn.className).not.toContain("bg-emerald-600");
			expect(actionBtn.className).not.toContain("bg-amber-600");
		});

		it("sets targetStatus hidden field to DRAFT", () => {
			const { container } = renderDialog();

			const field = container.querySelector('input[name="targetStatus"]') as HTMLInputElement;
			expect(field.value).toBe("DRAFT");
		});

		it("sets productId hidden field from dialog data", () => {
			const { container } = renderDialog();

			const field = container.querySelector('input[name="productId"]') as HTMLInputElement;
			expect(field.value).toBe("prod-1");
		});

		it("sets currentStatus hidden field from dialog data", () => {
			const { container } = renderDialog();

			const field = container.querySelector('input[name="currentStatus"]') as HTMLInputElement;
			expect(field.value).toBe("PUBLIC");
		});
	});

	// --------------------------------------------------------------------------
	// Changing to PUBLIC
	// --------------------------------------------------------------------------

	describe("changing to PUBLIC", () => {
		beforeEach(() => {
			mockDialog.data = {
				productId: "prod-1",
				productTitle: "Bague Lune",
				currentStatus: "DRAFT",
				targetStatus: "PUBLIC",
			};
		});

		it("renders title with 'Public' label", () => {
			renderDialog();

			expect(screen.getByTestId("alert-dialog-title")).toHaveTextContent(
				'Changer le statut en "Public"',
			);
		});

		it("shows PUBLIC status description", () => {
			renderDialog();

			expect(screen.getByTestId("alert-dialog-description")).toHaveTextContent(
				"Le bijou sera publié sur la boutique",
			);
		});

		it("shows significant change warning when going to PUBLIC", () => {
			renderDialog();

			expect(screen.getByTestId("alert-dialog-description")).toHaveTextContent(
				"Le bijou deviendra visible par tous les visiteurs de la boutique.",
			);
		});

		it("renders submit button with 'Changer en Public' label", () => {
			renderDialog();

			expect(screen.getByTestId("alert-dialog-action")).toHaveTextContent("Changer en Public");
		});

		it("submit button has emerald success tone for PUBLIC", () => {
			renderDialog();

			const actionBtn = screen.getByTestId("alert-dialog-action");
			expect(actionBtn.className).toContain("bg-emerald-600");
		});
	});

	// --------------------------------------------------------------------------
	// Changing to ARCHIVED
	// --------------------------------------------------------------------------

	describe("changing to ARCHIVED", () => {
		beforeEach(() => {
			mockDialog.data = {
				productId: "prod-1",
				productTitle: "Bague Lune",
				currentStatus: "PUBLIC",
				targetStatus: "ARCHIVED",
			};
		});

		it("renders title with 'Archivé' label", () => {
			renderDialog();

			expect(screen.getByTestId("alert-dialog-title")).toHaveTextContent(
				'Changer le statut en "Archivé"',
			);
		});

		it("shows ARCHIVED status description", () => {
			renderDialog();

			expect(screen.getByTestId("alert-dialog-description")).toHaveTextContent(
				"Le bijou sera archivé",
			);
		});

		it("submit button has amber warning tone for ARCHIVED", () => {
			renderDialog();

			const actionBtn = screen.getByTestId("alert-dialog-action");
			expect(actionBtn.className).toContain("bg-amber-600");
		});

		it("renders submit button with 'Changer en Archivé' label", () => {
			renderDialog();

			expect(screen.getByTestId("alert-dialog-action")).toHaveTextContent("Changer en Archivé");
		});
	});

	// --------------------------------------------------------------------------
	// Non-significant change (DRAFT → ARCHIVED, no PUBLIC involved)
	// --------------------------------------------------------------------------

	describe("non-significant change", () => {
		it("does not show warning when changing between non-PUBLIC statuses", () => {
			mockDialog.data = {
				productId: "prod-1",
				productTitle: "Bague Lune",
				currentStatus: "DRAFT",
				targetStatus: "ARCHIVED",
			};
			renderDialog();

			expect(screen.queryByText(/⚠️/)).not.toBeInTheDocument();
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
				currentStatus: "DRAFT",
				targetStatus: "PUBLIC",
			};
			mockToggleProductStatus.isPending = true;
		});

		it("shows 'Changement en cours…' when pending", () => {
			renderDialog();

			expect(screen.getByTestId("alert-dialog-action")).toHaveTextContent("Changement en cours…");
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

		it("does not show loader when not pending", () => {
			mockToggleProductStatus.isPending = false;
			renderDialog();

			expect(screen.queryByTestId("loader-circle")).not.toBeInTheDocument();
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
				currentStatus: "DRAFT",
				targetStatus: "PUBLIC",
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
				currentStatus: "DRAFT",
				targetStatus: "PUBLIC",
			};
		});

		it("calls dialog.close() when closed and not pending", () => {
			renderDialog();

			fireEvent.click(screen.getByTestId("alert-dialog"));

			expect(mockDialog.close).toHaveBeenCalledTimes(1);
		});

		it("does NOT call dialog.close() when closed while pending", () => {
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

		it("defaults to PUBLIC target status when data is null", () => {
			mockDialog.data = null;
			renderDialog();

			// Default targetStatus is PUBLIC
			expect(screen.getByTestId("alert-dialog-title")).toHaveTextContent(
				'Changer le statut en "Public"',
			);
		});
	});
});
