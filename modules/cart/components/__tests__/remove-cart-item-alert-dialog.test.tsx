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
	mockOptimisticUpdate,
	mockStartTransition,
	mockHaptic,
} = vi.hoisted(() => ({
	mockIsOpen: { value: false },
	mockClose: vi.fn(),
	mockDialogData: {
		value: null as { cartItemId: string; itemName: string; quantity: number } | null,
	},
	mockAction: vi.fn(),
	mockIsPending: { value: false },
	mockOptimisticUpdate: vi.fn(),
	mockStartTransition: vi.fn((cb: () => void) => cb()),
	mockHaptic: vi.fn(),
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
	useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/modules/cart/actions/add-to-cart", () => ({
	addToCart: vi.fn(),
}));

vi.mock("@/shared/utils/toast", () => ({
	toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/shared/providers/alert-dialog-store-provider", () => ({
	useAlertDialog: () => ({
		isOpen: mockIsOpen.value,
		close: mockClose,
		data: mockDialogData.value,
	}),
}));

vi.mock("@/modules/cart/hooks/use-remove-from-cart", () => ({
	useRemoveFromCart: () => ({ action: mockAction, isPending: mockIsPending.value }),
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

vi.mock("lucide-react", () => ({
	LoaderCircle: ({ className }: { className?: string }) => (
		<svg data-testid="icon-loader" className={className} />
	),
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { RemoveCartItemAlertDialog } from "../remove-cart-item-alert-dialog";

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
		expect(screen.getByText("Retirer ce produit de votre panier ?")).toBeInTheDocument();
	});

	it("renders description with item name when data is provided", () => {
		mockIsOpen.value = true;
		mockDialogData.value = { cartItemId: "ci-1", itemName: "Bague étoile", quantity: 1 };
		render(<RemoveCartItemAlertDialog />);
		expect(screen.getByText(/Bague étoile/)).toBeInTheDocument();
	});

	it("renders generic description when no data provided", () => {
		mockIsOpen.value = true;
		mockDialogData.value = null;
		render(<RemoveCartItemAlertDialog />);
		expect(screen.getByText(/Vous voulez vraiment retirer ce produit/i)).toBeInTheDocument();
	});

	it("renders 'Annuler' and 'Retirer' buttons", () => {
		mockIsOpen.value = true;
		render(<RemoveCartItemAlertDialog />);
		expect(screen.getByTestId("cancel-btn")).toHaveTextContent("Annuler");
		expect(screen.getByTestId("confirm-btn")).toHaveTextContent("Retirer");
	});

	it("disables buttons when isPending", () => {
		mockIsOpen.value = true;
		mockIsPending.value = true;
		render(<RemoveCartItemAlertDialog />);
		expect(screen.getByTestId("cancel-btn")).toBeDisabled();
		expect(screen.getByTestId("confirm-btn")).toBeDisabled();
	});

	it("shows 'Retrait…' text when isPending", () => {
		mockIsOpen.value = true;
		mockIsPending.value = true;
		render(<RemoveCartItemAlertDialog />);
		expect(screen.getByTestId("confirm-btn")).toHaveTextContent("Retrait…");
	});

	it("shows loader icon when isPending", () => {
		mockIsOpen.value = true;
		mockIsPending.value = true;
		render(<RemoveCartItemAlertDialog />);
		expect(screen.getByTestId("icon-loader")).toBeInTheDocument();
	});

	it("fires an error haptic when the destructive action is confirmed", () => {
		mockIsOpen.value = true;
		mockDialogData.value = { cartItemId: "ci-42", itemName: "Collier", quantity: 1 };
		const { container } = render(<RemoveCartItemAlertDialog />);
		const form = container.querySelector("form");
		if (!form) throw new Error("form not found");
		fireEvent.submit(form);
		expect(mockHaptic).toHaveBeenCalledWith("error");
	});
});
