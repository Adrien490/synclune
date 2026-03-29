import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockDiscardDialogClose, mockUseAlertDialog } = vi.hoisted(() => ({
	mockDiscardDialogClose: vi.fn(),
	mockUseAlertDialog: vi.fn(),
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

vi.mock("@/shared/providers/alert-dialog-store-provider", () => ({
	useAlertDialog: mockUseAlertDialog,
}));

vi.mock("@/modules/addresses/constants/dialog.constants", () => ({
	DISCARD_ADDRESS_CHANGES_DIALOG_ID: "discard-address-changes",
}));

vi.mock("@/shared/components/ui/alert-dialog", () => ({
	AlertDialog: ({
		children,
		open,
		onOpenChange,
	}: {
		children: React.ReactNode;
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
	}) =>
		open ? (
			<div data-testid="alert-dialog">
				{children}
				<button data-testid="simulate-close" onClick={() => onOpenChange?.(false)}>
					SimClose
				</button>
			</div>
		) : null,
	AlertDialogContent: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="alert-dialog-content">{children}</div>
	),
	AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
	AlertDialogDescription: ({ children }: { children: React.ReactNode }) => (
		<p data-testid="description">{children}</p>
	),
	AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	AlertDialogCancel: ({
		children,
		type,
	}: {
		children: React.ReactNode;
		type?: "reset" | "button" | "submit";
	}) => (
		<button type={type} data-testid="cancel-btn">
			{children}
		</button>
	),
	AlertDialogAction: ({
		children,
		onClick,
		type,
	}: {
		children: React.ReactNode;
		onClick?: () => void;
		type?: "reset" | "button" | "submit";
	}) => (
		<button type={type} onClick={onClick} data-testid="action-btn">
			{children}
		</button>
	),
}));

// ============================================================================
// IMPORTS AFTER MOCKS
// ============================================================================

import { DiscardAddressChangesAlertDialog } from "../discard-address-changes-alert-dialog";

// ============================================================================
// HELPERS
// ============================================================================

function setupOpenDialog(onConfirm = vi.fn()) {
	mockUseAlertDialog.mockReturnValue({
		isOpen: true,
		data: { onConfirm },
		open: vi.fn(),
		close: mockDiscardDialogClose,
		clearData: vi.fn(),
	});
	return { onConfirm };
}

function setupClosedDialog() {
	mockUseAlertDialog.mockReturnValue({
		isOpen: false,
		data: null,
		open: vi.fn(),
		close: mockDiscardDialogClose,
		clearData: vi.fn(),
	});
}

// ============================================================================
// TESTS
// ============================================================================

afterEach(cleanup);

describe("DiscardAddressChangesAlertDialog", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders nothing when dialog is closed", () => {
		setupClosedDialog();
		const { container } = render(<DiscardAddressChangesAlertDialog />);
		expect(container.firstChild).toBeNull();
	});

	it("renders the dialog when isOpen=true", () => {
		setupOpenDialog();
		render(<DiscardAddressChangesAlertDialog />);
		expect(screen.getByTestId("alert-dialog")).toBeInTheDocument();
	});

	it("renders title 'Abandonner les modifications ?'", () => {
		setupOpenDialog();
		render(<DiscardAddressChangesAlertDialog />);
		expect(screen.getByText("Abandonner les modifications ?")).toBeInTheDocument();
	});

	it("renders the warning description", () => {
		setupOpenDialog();
		render(<DiscardAddressChangesAlertDialog />);
		expect(screen.getByTestId("description")).toBeInTheDocument();
		expect(screen.getByTestId("description").textContent).toContain(
			"modifications non sauvegardees",
		);
	});

	it("renders cancel button 'Continuer l'edition'", () => {
		setupOpenDialog();
		render(<DiscardAddressChangesAlertDialog />);
		expect(screen.getByTestId("cancel-btn")).toHaveTextContent("Continuer l'edition");
	});

	it("renders confirm button 'Abandonner'", () => {
		setupOpenDialog();
		render(<DiscardAddressChangesAlertDialog />);
		expect(screen.getByTestId("action-btn")).toHaveTextContent("Abandonner");
	});

	it("calls onConfirm and closes dialog when clicking confirm", async () => {
		const { onConfirm } = setupOpenDialog();
		render(<DiscardAddressChangesAlertDialog />);
		await userEvent.click(screen.getByTestId("action-btn"));
		expect(onConfirm).toHaveBeenCalledOnce();
		expect(mockDiscardDialogClose).toHaveBeenCalledOnce();
	});

	it("closes dialog when onOpenChange is called with false", async () => {
		setupOpenDialog();
		render(<DiscardAddressChangesAlertDialog />);
		await userEvent.click(screen.getByTestId("simulate-close"));
		expect(mockDiscardDialogClose).toHaveBeenCalled();
	});

	it("uses DISCARD_ADDRESS_CHANGES_DIALOG_ID for useAlertDialog", () => {
		setupClosedDialog();
		render(<DiscardAddressChangesAlertDialog />);
		expect(mockUseAlertDialog).toHaveBeenCalledWith("discard-address-changes");
	});
});
