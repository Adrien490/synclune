/**
 * @regression ORD-UI-003
 *
 * Avant le fix : `handleConfirm` appelait `setConfirmOpen(false)` de
 * manière synchrone juste après `submit(fd)`, ce qui fermait la
 * confirmation avant même que `isPending` ne passe à `true` côté UI.
 * Conséquence : l'admin perdait le spinner du dialog pour une bulk
 * cancel sur N commandes (annulation, restock SKUs, libération codes
 * promo, emails clients — plusieurs secondes).
 *
 * Après le fix : la fermeture est déférée à un `useEffect` qui ferme
 * uniquement quand `isPending` repasse de `true` à `false`.
 */
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockUseBulkSelectionContext,
	mockUseAdminListPendingContextOptional,
	mockSubmit,
	mockIsPending,
} = vi.hoisted(() => ({
	mockUseBulkSelectionContext: vi.fn(),
	mockUseAdminListPendingContextOptional: vi.fn(),
	mockSubmit: vi.fn(),
	mockIsPending: { value: false },
}));

vi.mock("@/shared/components/data-table", () => ({
	BulkSelectionToolbar: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="bulk-toolbar">{children}</div>
	),
	useBulkSelectionContext: () => mockUseBulkSelectionContext(),
}));

vi.mock("@/shared/contexts/admin-list-pending-context", () => ({
	useAdminListPendingContextOptional: () => mockUseAdminListPendingContextOptional(),
}));

vi.mock("@/shared/hooks/use-bulk-action-with-toast", () => ({
	useBulkActionWithToast: () => ({
		submit: mockSubmit,
		isPending: mockIsPending.value,
	}),
}));

vi.mock("@/modules/orders/actions/bulk-cancel-orders", () => ({
	bulkCancelOrders: vi.fn(),
}));

// Mock ResponsiveAlertDialog : toujours render les enfants quand `open=true`,
// ignore le portal Vaul / Radix (jsdom-friendly).
vi.mock("@/shared/components/ui/responsive-alert-dialog", () => ({
	ResponsiveAlertDialog: ({
		children,
		open,
	}: {
		children: React.ReactNode;
		open: boolean;
		onOpenChange: (next: boolean) => void;
		tone?: string;
	}) =>
		open ? (
			<div role="alertdialog" data-testid="confirm-dialog">
				{children}
			</div>
		) : null,
	ResponsiveAlertDialogContent: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
	ResponsiveAlertDialogHeader: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
	ResponsiveAlertDialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
	ResponsiveAlertDialogDescription: ({ children }: { children: React.ReactNode }) => (
		<p>{children}</p>
	),
	ResponsiveAlertDialogFooter: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
	ResponsiveAlertDialogHeroIcon: () => <span aria-hidden="true" />,
	ResponsiveAlertDialogAction: ({
		children,
		onClick,
		disabled,
		...rest
	}: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
		<button type="button" onClick={onClick} disabled={disabled} {...rest}>
			{children}
		</button>
	),
	ResponsiveAlertDialogCancel: ({
		children,
		...rest
	}: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
		<button type="button" {...rest}>
			{children}
		</button>
	),
}));

import { OrdersBulkActionsBar } from "../orders-bulk-actions-bar";

// ============================================================================
// HELPERS
// ============================================================================

function setupContexts({ selectedCount = 2 }: { selectedCount?: number } = {}) {
	mockUseBulkSelectionContext.mockReturnValue({
		selectedIds: new Set(["o1", "o2"].slice(0, selectedCount)),
		selectedCount,
		toggle: vi.fn(),
		clear: vi.fn(),
		selectionMode: true,
	});
	mockUseAdminListPendingContextOptional.mockReturnValue({
		startPending: vi.fn(),
		clearPending: vi.fn(),
		isPending: () => false,
		pendingKind: null,
	});
}

// ============================================================================
// TESTS
// ============================================================================

describe("OrdersBulkActionsBar [@regression ORD-UI-003]", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockIsPending.value = false;
		setupContexts();
	});

	afterEach(cleanup);

	it("garde le dialog de confirmation OUVERT pendant `isPending=true` après submit", async () => {
		const user = userEvent.setup();
		const { rerender } = render(<OrdersBulkActionsBar />);

		// Ouvrir la confirmation
		await user.click(screen.getByRole("button", { name: /Annuler la commande/i }));
		expect(screen.getByTestId("confirm-dialog")).toBeInTheDocument();

		// Confirmer
		await user.click(screen.getByRole("button", { name: /Annuler les commandes/i }));
		expect(mockSubmit).toHaveBeenCalledTimes(1);

		// Simuler que `isPending` passe à true (la mutation est en cours)
		mockIsPending.value = true;
		rerender(<OrdersBulkActionsBar />);

		// Le dialog doit rester ouvert pendant la mutation (avant le fix, il
		// se fermait immédiatement après submit).
		expect(screen.queryByTestId("confirm-dialog")).toBeInTheDocument();
	});

	it("ferme le dialog UNE FOIS la mutation terminée (isPending true → false)", async () => {
		const user = userEvent.setup();
		const { rerender } = render(<OrdersBulkActionsBar />);

		await user.click(screen.getByRole("button", { name: /Annuler la commande/i }));
		await user.click(screen.getByRole("button", { name: /Annuler les commandes/i }));

		// Passe en pending
		mockIsPending.value = true;
		rerender(<OrdersBulkActionsBar />);
		expect(screen.queryByTestId("confirm-dialog")).toBeInTheDocument();

		// Mutation terminée
		await act(async () => {
			mockIsPending.value = false;
			rerender(<OrdersBulkActionsBar />);
		});

		expect(screen.queryByTestId("confirm-dialog")).not.toBeInTheDocument();
	});

	it("appelle `pendingCtx.clearPending` quand la mutation termine", async () => {
		const clearPending = vi.fn();
		mockUseAdminListPendingContextOptional.mockReturnValue({
			startPending: vi.fn(),
			clearPending,
			isPending: () => false,
			pendingKind: null,
		});

		const user = userEvent.setup();
		const { rerender } = render(<OrdersBulkActionsBar />);

		await user.click(screen.getByRole("button", { name: /Annuler la commande/i }));
		await user.click(screen.getByRole("button", { name: /Annuler les commandes/i }));

		mockIsPending.value = true;
		rerender(<OrdersBulkActionsBar />);
		await act(async () => {
			mockIsPending.value = false;
			rerender(<OrdersBulkActionsBar />);
		});

		// clearPending appelé par le useEffect quand isPending transitions true→false
		expect(clearPending).toHaveBeenCalled();
	});
});
