import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockIsOpen,
	mockClose,
	mockDialogData,
	mockAction,
	mockIsPending,
	mockOnSuccessCapture,
	mockOptimisticUpdate,
	mockStartTransition,
	mockHaptic,
	mockAddToCart,
	mockToastSuccess,
	mockToastError,
	mockRouterRefresh,
	mockAdjustCart,
} = vi.hoisted(() => ({
	mockIsOpen: { value: false },
	mockClose: vi.fn(),
	mockDialogData: {
		value: null as {
			skuId: string;
			itemName: string;
			quantity: number;
		} | null,
	},
	mockAction: vi.fn(),
	mockIsPending: { value: false },
	mockOnSuccessCapture: { current: undefined as undefined | (() => void) },
	mockOptimisticUpdate: vi.fn(),
	mockStartTransition: vi.fn((cb: () => void) => cb()),
	mockHaptic: vi.fn(),
	mockAddToCart: vi.fn(),
	mockToastSuccess: vi.fn(),
	mockToastError: vi.fn(),
	mockRouterRefresh: vi.fn(),
	mockAdjustCart: vi.fn(),
}));

vi.mock("@/shared/hooks/use-haptic", () => ({
	useHaptic: () => mockHaptic,
	triggerHaptic: mockHaptic,
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: vi.fn(), refresh: mockRouterRefresh }),
}));

vi.mock("@/modules/cart/actions/add-to-cart", () => ({
	addToCart: mockAddToCart,
}));

vi.mock("@/shared/utils/toast", () => ({
	toast: { success: mockToastSuccess, error: mockToastError },
}));

vi.mock("@/shared/stores/badge-counts-store", () => ({
	useBadgeCountsStore: (selector: (state: { adjustCart: typeof mockAdjustCart }) => unknown) =>
		selector({ adjustCart: mockAdjustCart }),
}));

vi.mock("@/shared/providers/overlay-store-provider", () => ({
	useAlertDialog: () => ({
		isOpen: mockIsOpen.value,
		close: mockClose,
		data: mockDialogData.value,
	}),
}));

vi.mock("@/modules/cart/hooks/use-remove-from-cart", () => ({
	useRemoveFromCart: (opts?: { onSuccess?: () => void }) => {
		mockOnSuccessCapture.current = opts?.onSuccess;
		return { action: mockAction, isPending: mockIsPending.value };
	},
}));

vi.mock("@/modules/cart/contexts/cart-optimistic-context", () => ({
	useCartOptimisticSafe: () => ({
		updateOptimisticCart: mockOptimisticUpdate,
		startTransition: mockStartTransition,
	}),
}));

vi.mock("@/shared/components/ui/alert-dialog", () => ({
	AlertDialog: ({
		open,
		children,
	}: {
		open: boolean;
		onOpenChange?: (v: boolean) => void;
		children: React.ReactNode;
	}) => (open ? <div data-testid="alert-dialog">{children}</div> : null),
	AlertDialogContent: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="alert-dialog-content">{children}</div>
	),
	AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
	AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
	AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	AlertDialogCancel: ({
		children,
		disabled,
		type,
	}: {
		children: React.ReactNode;
		disabled?: boolean;
		type?: string;
	}) => (
		<button
			data-testid="cancel-btn"
			disabled={disabled}
			type={type as "button" | "submit" | "reset"}
		>
			{children}
		</button>
	),
	AlertDialogAction: ({
		children,
		disabled,
		type,
		"aria-busy": ariaBusy,
	}: {
		children: React.ReactNode;
		disabled?: boolean;
		type?: string;
		"aria-busy"?: boolean;
	}) => (
		<button
			data-testid="confirm-btn"
			disabled={disabled}
			type={type as "button" | "submit" | "reset"}
			aria-busy={ariaBusy}
		>
			{children}
		</button>
	),
}));

vi.mock("@phosphor-icons/react/ssr", () => ({
	SpinnerIcon: ({ className }: { className?: string }) => (
		<svg data-testid="icon-loader" className={className} />
	),
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { RemoveCartItemAlertDialog } from "../remove-cart-item-alert-dialog";
import { ActionStatus } from "@/shared/types/server-action";

// ============================================================================
// TESTS
// ============================================================================

afterEach(cleanup);

describe("RemoveCartItemAlertDialog", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockIsOpen.value = false;
		mockDialogData.value = null;
		mockIsPending.value = false;
	});

	it("renders nothing when dialog is closed", () => {
		mockIsOpen.value = false;
		const { container } = render(<RemoveCartItemAlertDialog />);
		expect(container.firstChild).toBeNull();
	});

	it("renders dialog content when open", () => {
		mockIsOpen.value = true;
		render(<RemoveCartItemAlertDialog />);
		expect(screen.getByTestId("alert-dialog")).toBeInTheDocument();
	});

	it("renders the title", () => {
		mockIsOpen.value = true;
		render(<RemoveCartItemAlertDialog />);
		expect(screen.getByText("Retirer cette pièce de ton panier ?")).toBeInTheDocument();
	});

	it("renders description with item name when data is provided", () => {
		mockIsOpen.value = true;
		mockDialogData.value = { skuId: "sku-1", itemName: "Bague étoile", quantity: 1 };
		render(<RemoveCartItemAlertDialog />);
		expect(screen.getByText(/Bague étoile/)).toBeInTheDocument();
	});

	it("renders generic description when no data provided", () => {
		mockIsOpen.value = true;
		mockDialogData.value = null;
		render(<RemoveCartItemAlertDialog />);
		expect(screen.getByText(/Tu veux vraiment retirer cette pièce/i)).toBeInTheDocument();
	});

	it("renders 'Annuler' and 'Retirer' buttons", () => {
		mockIsOpen.value = true;
		render(<RemoveCartItemAlertDialog />);
		expect(screen.getByTestId("cancel-btn")).toHaveTextContent("Annuler");
		expect(screen.getByTestId("confirm-btn")).toHaveTextContent("Retirer");
	});

	it("fires an error haptic when the destructive action is confirmed", () => {
		mockIsOpen.value = true;
		mockDialogData.value = { skuId: "sku-42", itemName: "Collier", quantity: 1 };
		const { container } = render(<RemoveCartItemAlertDialog />);
		const form = container.querySelector("form");
		if (!form) throw new Error("form not found");
		fireEvent.submit(form);
		expect(mockHaptic).toHaveBeenCalledWith("error");
	});

	describe("undo toast (G4)", () => {
		it("shows undo toast with Annuler action after successful removal when skuId is provided", () => {
			mockIsOpen.value = true;
			mockDialogData.value = {
				skuId: "sku-1",
				itemName: "Bague étoile",
				quantity: 2,
			};
			render(<RemoveCartItemAlertDialog />);
			mockOnSuccessCapture.current?.();
			expect(mockClose).toHaveBeenCalled();
			expect(mockToastSuccess).toHaveBeenCalledWith(
				"Bague étoile retiré du panier",
				expect.objectContaining({
					duration: 5000,
					action: expect.objectContaining({ label: "Annuler" }),
				}),
			);
		});

		/**
		 * Depuis la fusion `cartItemId`/`skuId` en une seule identité de ligne
		 * (passage du panier en cookie, 2026-08-04), le seul cas où le skuId manque
		 * est l'absence totale de données de dialogue — la restauration par
		 * `addToCart` est alors impossible, donc pas de toast « Annuler ».
		 */
		it("skips undo toast when skuId is missing (no restoration possible)", () => {
			mockIsOpen.value = true;
			mockDialogData.value = null;
			render(<RemoveCartItemAlertDialog />);
			mockOnSuccessCapture.current?.();
			expect(mockClose).toHaveBeenCalled();
			expect(mockToastSuccess).not.toHaveBeenCalled();
		});

		it("restores item via addToCart and refreshes router on Annuler click", async () => {
			mockIsOpen.value = true;
			mockDialogData.value = {
				skuId: "sku-9",
				itemName: "Collier",
				quantity: 3,
			};
			mockAddToCart.mockResolvedValueOnce({ status: ActionStatus.SUCCESS, message: "ok" });
			render(<RemoveCartItemAlertDialog />);
			mockOnSuccessCapture.current?.();
			const undoCall = mockToastSuccess.mock.calls[0];
			const undoHandler = (undoCall![1] as { action: { onClick: () => void } }).action.onClick;
			await undoHandler();
			expect(mockAdjustCart).toHaveBeenCalledWith(3);
			expect(mockAddToCart).toHaveBeenCalledWith(undefined, expect.any(FormData));
			const fd = mockAddToCart.mock.calls[0]![1] as FormData;
			expect(fd.get("skuId")).toBe("sku-9");
			expect(fd.get("quantity")).toBe("3");
			expect(mockRouterRefresh).toHaveBeenCalled();
			// Pas de toast "Article restauré" : le retour de la ligne dans le cart-sheet
			// après router.refresh() est le feedback. Seul le toast undo initial existe.
			expect(mockToastSuccess).toHaveBeenCalledTimes(1);
		});

		it("rolls back the badge and shows error toast when restoration fails", async () => {
			mockIsOpen.value = true;
			mockDialogData.value = {
				skuId: "sku-9",
				itemName: "Collier",
				quantity: 2,
			};
			mockAddToCart.mockResolvedValueOnce({ status: ActionStatus.ERROR, message: "Stock épuisé" });
			render(<RemoveCartItemAlertDialog />);
			mockOnSuccessCapture.current?.();
			const undoCall = mockToastSuccess.mock.calls[0];
			const undoHandler = (undoCall![1] as { action: { onClick: () => void } }).action.onClick;
			await undoHandler();
			expect(mockAdjustCart).toHaveBeenNthCalledWith(1, 2);
			expect(mockAdjustCart).toHaveBeenNthCalledWith(2, -2);
			expect(mockToastError).toHaveBeenCalledWith("Stock épuisé");
			expect(mockRouterRefresh).not.toHaveBeenCalled();
		});
	});

	describe("optimistic remove on submit", () => {
		it("calls updateOptimisticCart remove BEFORE the server action", () => {
			mockIsOpen.value = true;
			mockDialogData.value = {
				skuId: "sku-3",
				itemName: "Collier",
				quantity: 1,
			};
			const { container } = render(<RemoveCartItemAlertDialog />);
			const form = container.querySelector("form");
			if (!form) throw new Error("form not found");
			fireEvent.submit(form);
			expect(mockOptimisticUpdate).toHaveBeenCalledWith({ type: "remove", itemId: "sku-3" });
			expect(mockAction).toHaveBeenCalled();
		});
	});
});
