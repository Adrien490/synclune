import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockUseBulkSelection, mockUseBulkAction, mockUsePendingCtx, mockSubmit, mockStartPending } =
	vi.hoisted(() => ({
		mockUseBulkSelection: vi.fn(),
		mockUseBulkAction: vi.fn(),
		mockUsePendingCtx: vi.fn(),
		mockSubmit: vi.fn(),
		mockStartPending: vi.fn(),
	}));

vi.mock("@/shared/components/data-table", () => ({
	BulkSelectionToolbar: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="toolbar">{children}</div>
	),
	useBulkSelectionContext: () => mockUseBulkSelection(),
}));

vi.mock("@/shared/components/ui/responsive-alert-dialog", () => ({
	ResponsiveAlertDialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
		open ? <div data-testid="confirm-dialog">{children}</div> : null,
	ResponsiveAlertDialogContent: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
	ResponsiveAlertDialogHeader: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
	ResponsiveAlertDialogHeroIcon: () => <svg data-testid="hero-icon" />,
	ResponsiveAlertDialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
	ResponsiveAlertDialogDescription: ({ children }: { children: React.ReactNode }) => (
		<p>{children}</p>
	),
	ResponsiveAlertDialogFooter: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
	ResponsiveAlertDialogCancel: ({ children, ...props }: any) => (
		<button {...props}>{children}</button>
	),
	ResponsiveAlertDialogAction: ({ children, ...props }: any) => (
		<button {...props}>{children}</button>
	),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock("@/shared/contexts/admin-list-pending-context", () => ({
	useAdminListPendingContextOptional: () => mockUsePendingCtx(),
}));

vi.mock("@/shared/hooks/use-bulk-action-with-toast", () => ({
	useBulkActionWithToast: () => mockUseBulkAction(),
}));

vi.mock("../../actions/bulk-cancel-orders", () => ({ bulkCancelOrders: vi.fn() }));

import { OrdersBulkActionsBar } from "../orders-bulk-actions-bar";

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

beforeEach(() => {
	mockUseBulkSelection.mockReturnValue({
		selectedIds: new Set(["a", "b"]),
		selectedCount: 2,
	});
	mockUseBulkAction.mockReturnValue({ submit: mockSubmit, isPending: false });
	mockUsePendingCtx.mockReturnValue({
		startPending: mockStartPending,
		clearPending: vi.fn(),
	});
});

describe("OrdersBulkActionsBar", () => {
	it("rend le bouton d'annulation en lot", () => {
		render(<OrdersBulkActionsBar />);
		expect(screen.getByRole("button", { name: /Annuler la commande/ })).toBeInTheDocument();
	});

	it("désactive le bouton quand aucune commande sélectionnée", () => {
		mockUseBulkSelection.mockReturnValue({ selectedIds: new Set(), selectedCount: 0 });
		render(<OrdersBulkActionsBar />);
		expect(screen.getByRole("button", { name: /Annuler la commande/ })).toBeDisabled();
	});

	it("désactive le bouton pendant la mutation", () => {
		mockUseBulkAction.mockReturnValue({ submit: mockSubmit, isPending: true });
		render(<OrdersBulkActionsBar />);
		expect(screen.getByRole("button", { name: /Annuler la commande/ })).toBeDisabled();
	});

	it("ouvre la confirmation avec le nombre sélectionné au pluriel", () => {
		render(<OrdersBulkActionsBar />);
		fireEvent.click(screen.getByRole("button", { name: /Annuler la commande/ }));
		expect(screen.getByTestId("confirm-dialog")).toBeInTheDocument();
		expect(
			screen.getByRole("heading", { name: /Annuler 2 commandes en attente/ }),
		).toBeInTheDocument();
	});

	it("soumet une FormData (orderIds JSON + reason) et démarre l'état pending à la confirmation", () => {
		render(<OrdersBulkActionsBar />);
		fireEvent.click(screen.getByRole("button", { name: /Annuler la commande/ }));
		fireEvent.click(screen.getByRole("button", { name: /Annuler les commandes/ }));

		expect(mockStartPending).toHaveBeenCalledWith(["a", "b"], "cancel");
		expect(mockSubmit).toHaveBeenCalledTimes(1);
		const fd = mockSubmit.mock.calls[0]?.[0] as FormData;
		expect(JSON.parse(fd.get("orderIds") as string)).toEqual(["a", "b"]);
		expect(fd.get("reason")).toBe("Annulation en lot via admin");
	});
});
