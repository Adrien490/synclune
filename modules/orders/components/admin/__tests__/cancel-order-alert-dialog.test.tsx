import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockClose, mockAction } = vi.hoisted(() => ({
	mockClose: vi.fn(),
	mockAction: vi.fn(),
}));

let mockDialogState = {
	isOpen: true,
	close: mockClose,
	data: {
		orderId: "order_1",
		orderNumber: "CMD-2026-001",
		isPaid: false,
	},
};

let mockIsPending = false;

vi.mock("@/shared/providers/alert-dialog-store-provider", () => ({
	useAlertDialog: () => mockDialogState,
}));

vi.mock("@/modules/orders/hooks/use-cancel-order", () => ({
	useCancelOrder: ({ onSuccess }: { onSuccess?: () => void } = {}) => ({
		action: mockAction,
		isPending: mockIsPending,
		onSuccess,
	}),
}));

vi.mock("@/shared/components/ui/alert-dialog", () => ({
	AlertDialog: ({
		children,
		open,
	}: {
		children: React.ReactNode;
		open: boolean;
		onOpenChange?: (open: boolean) => void;
	}) => (open ? <div data-testid="alert-dialog">{children}</div> : null),
	AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
	AlertDialogDescription: ({ children }: { children: React.ReactNode; asChild?: boolean }) => (
		<div>{children}</div>
	),
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
		<button disabled={disabled} type={type as "button" | "submit" | undefined}>
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
		<button disabled={disabled} type={type as "button" | "submit" | undefined} aria-busy={ariaBusy}>
			{children}
		</button>
	),
}));

vi.mock("@phosphor-icons/react/ssr", async (importOriginal) => ({
	...((await importOriginal()) as Record<string, unknown>),
	SpinnerIcon: ({ className }: { className?: string }) => (
		<span data-testid="loader" className={className} />
	),
	CheckIcon: () => <span data-testid="icon-check" />,
	MinusIcon: () => <span data-testid="icon-minus" />,
}));

vi.mock("@/shared/components/ui/checkbox", () => ({
	Checkbox: ({
		checked,
		onCheckedChange,
		disabled,
	}: {
		checked?: boolean;
		onCheckedChange?: (v: boolean) => void;
		disabled?: boolean;
	}) => (
		<input
			type="checkbox"
			data-testid="checkbox-auto-refund"
			checked={checked}
			disabled={disabled}
			onChange={(e) => onCheckedChange?.(e.target.checked)}
		/>
	),
}));

import { CancelOrderAlertDialog } from "../cancel-order-alert-dialog";

// ============================================================================
// TESTS
// ============================================================================

describe("CancelOrderAlertDialog", () => {
	beforeEach(() => {
		cleanup();
		vi.clearAllMocks();
		mockIsPending = false;
		mockDialogState = {
			isOpen: true,
			close: mockClose,
			data: {
				orderId: "order_1",
				orderNumber: "CMD-2026-001",
				isPaid: false,
			},
		};
	});

	// ─── Visibility ───────────────────────────────────────────────────────────

	it("does not render content when dialog is closed", () => {
		mockDialogState = { ...mockDialogState, isOpen: false };

		render(<CancelOrderAlertDialog />);

		expect(screen.queryByTestId("alert-dialog")).not.toBeInTheDocument();
	});

	it("renders title when dialog is open", () => {
		render(<CancelOrderAlertDialog />);

		expect(screen.getByText("Confirmer l'annulation")).toBeInTheDocument();
	});

	// ─── Description ──────────────────────────────────────────────────────────

	it("shows the order number in the description", () => {
		render(<CancelOrderAlertDialog />);

		expect(screen.getByText("CMD-2026-001")).toBeInTheDocument();
	});

	it("shows paid warning when isPaid is true", () => {
		mockDialogState = {
			...mockDialogState,
			data: { ...mockDialogState.data, isPaid: true },
		};

		render(<CancelOrderAlertDialog />);

		expect(screen.getByText(/Le statut de paiement passera à REFUNDED/)).toBeInTheDocument();
	});

	it("hides paid warning when isPaid is false", () => {
		render(<CancelOrderAlertDialog />);

		expect(screen.queryByText(/Le statut de paiement passera à REFUNDED/)).not.toBeInTheDocument();
	});

	// ─── Hidden input ─────────────────────────────────────────────────────────

	it("hidden input id contains the orderId", () => {
		render(<CancelOrderAlertDialog />);

		const input = document.querySelector('input[name="id"]') as HTMLInputElement;
		expect(input).toBeTruthy();
		expect(input.value).toBe("order_1");
	});

	// ─── Pending state ────────────────────────────────────────────────────────

	/**
	 * Ce dialogue ne décore plus l'attente (libellé « Annulation… », spinner,
	 * `aria-busy`, `disabled` sur l'annulation) : le bouton de confirmation est un
	 * `Close` Base UI, donc la surface part AU CLIC, avant que `isPending` ne
	 * passe. La décoration se jouait dans un dialog déjà en sortie, et seuls ces
	 * tests — qui forçaient `mockIsPending = true` à la main — la voyaient.
	 * Prouvé par `shared/components/ui/__tests__/alert-dialog-close-on-confirm.regression.test.tsx` ;
	 * le retour d'attente appartient au toast de la mutation.
	 */
	it("ne décore pas l'attente : rien ne dépend d'`isPending`", () => {
		mockIsPending = true;

		render(<CancelOrderAlertDialog />);

		expect(screen.getByRole("button", { name: "Annuler la commande" })).not.toBeDisabled();
		expect(screen.getByRole("button", { name: "Fermer" })).not.toBeDisabled();
	});

	// ─── autoRefund hidden input + checkbox ──────────────────────────────────

	it("autoRefund hidden input is 'false' when order is not paid", () => {
		render(<CancelOrderAlertDialog />);
		const input = document.querySelector('input[name="autoRefund"]') as HTMLInputElement;
		expect(input).toBeTruthy();
		expect(input.value).toBe("false");
	});

	it("autoRefund hidden input is 'true' by default when order is paid", () => {
		mockDialogState = {
			...mockDialogState,
			data: { ...mockDialogState.data, isPaid: true },
		};
		render(<CancelOrderAlertDialog />);
		const input = document.querySelector('input[name="autoRefund"]') as HTMLInputElement;
		expect(input.value).toBe("true");
	});

	it("renders autoRefund checkbox only when order is paid", () => {
		mockDialogState = {
			...mockDialogState,
			data: { ...mockDialogState.data, isPaid: true },
		};
		render(<CancelOrderAlertDialog />);
		expect(screen.getByTestId("checkbox-auto-refund")).toBeInTheDocument();
	});

	it("does not render autoRefund checkbox when order is not paid", () => {
		render(<CancelOrderAlertDialog />);
		expect(screen.queryByTestId("checkbox-auto-refund")).not.toBeInTheDocument();
	});
});
