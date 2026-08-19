import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { PAGE_FADE_NAVIGATION } from "@/shared/constants/view-transitions";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockDialog,
	mockDuplicateProduct,
	mockRouterPush,
	mockRouterRefresh,
	mockUseDuplicateProduct,
	mockHaptic,
	mockToastSuccess,
} = vi.hoisted(() => ({
	mockDialog: {
		isOpen: true,
		data: null as Record<string, unknown> | null,
		close: vi.fn(),
	},
	mockDuplicateProduct: {
		action: vi.fn(),
		isPending: false,
	},
	mockRouterPush: vi.fn(),
	mockRouterRefresh: vi.fn(),
	mockUseDuplicateProduct: vi.fn(),
	mockHaptic: vi.fn(),
	mockToastSuccess: vi.fn(),
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/providers/overlay-store-provider", () => ({
	useAlertDialog: () => mockDialog,
}));

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: mockRouterPush, refresh: mockRouterRefresh }),
}));

vi.mock("@/shared/hooks/use-haptic", () => ({
	useHaptic: () => mockHaptic,
}));

vi.mock("@/shared/utils/toast", () => ({
	toast: { success: mockToastSuccess },
}));

vi.mock("@/modules/products/hooks/use-duplicate-product", () => ({
	useDuplicateProduct: (...args: unknown[]) => mockUseDuplicateProduct(...args),
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

vi.mock("@phosphor-icons/react/ssr", async (importOriginal) => ({
	...((await importOriginal()) as Record<string, unknown>),
	SpinnerIcon: (props: Record<string, unknown>) => {
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
	mockRouterPush.mockReset();
	mockRouterRefresh.mockReset();
	mockHaptic.mockReset();
	mockToastSuccess.mockReset();
	mockUseDuplicateProduct.mockImplementation(() => mockDuplicateProduct);
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

		it("does not show loader icon when not pending", () => {
			renderDialog();

			expect(screen.queryByTestId("loader-circle")).not.toBeInTheDocument();
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
	// onSuccess behavior (close dialog + refresh list + toast with "Voir" action)
	// --------------------------------------------------------------------------

	describe("onSuccess", () => {
		const callOnSuccess = () => {
			renderDialog();

			const onSuccess = mockUseDuplicateProduct.mock.calls[0]?.[0]?.onSuccess as
				| ((message: string, data: { productId: string; title: string; slug: string }) => void)
				| undefined;

			expect(onSuccess).toBeDefined();
			onSuccess?.("Produit dupliqué", {
				productId: "new-prod-1",
				title: "Copie de Bague Lune",
				slug: "copie-de-bague-lune",
			});
		};

		// La fermeture n'appartient plus à `onSuccess` : le bouton de confirmation est
		// un `Close`, le dialog est déjà parti quand la duplication aboutit.
		it("refreshes the route so the new product appears in the list", () => {
			callOnSuccess();
			expect(mockRouterRefresh).toHaveBeenCalledTimes(1);
			expect(mockHaptic).toHaveBeenCalledWith("success");
		});

		it("emits a success toast with a 'Voir le bijou' action that navigates to the edit page", () => {
			callOnSuccess();
			expect(mockToastSuccess).toHaveBeenCalledTimes(1);
			const [message, options] = mockToastSuccess.mock.calls[0]!;
			expect(message).toBe("Produit dupliqué");
			expect((options as { action: { label: string } }).action.label).toBe("Voir le bijou");

			(options as { action: { onClick: () => void } }).action.onClick();
			expect(mockRouterPush).toHaveBeenCalledWith(
				"/admin/catalogue/produits/copie-de-bague-lune/modifier",
				PAGE_FADE_NAVIGATION,
			);
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
	});
});
