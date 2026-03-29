import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockDeleteDialogClose, mockUseAlertDialog, mockDeleteAction, mockIsPending } = vi.hoisted(
	() => ({
		mockDeleteDialogClose: vi.fn(),
		mockUseAlertDialog: vi.fn(),
		mockDeleteAction: vi.fn(),
		mockIsPending: { value: false },
	}),
);

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

vi.mock("@/shared/providers/alert-dialog-store-provider", () => ({
	useAlertDialog: mockUseAlertDialog,
}));

vi.mock("@/modules/addresses/hooks/use-delete-address", () => ({
	useDeleteAddress: ({ onSuccess: _onSuccess }: { onSuccess?: () => void }) => ({
		action: mockDeleteAction,
		isPending: mockIsPending.value,
		handle: vi.fn(),
		state: undefined,
	}),
}));

vi.mock("@/modules/addresses/constants/dialog.constants", () => ({
	DELETE_ADDRESS_DIALOG_ID: "delete-address",
}));

vi.mock("@/shared/components/ui/alert-dialog", () => ({
	AlertDialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
		open ? <div data-testid="alert-dialog">{children}</div> : null,
	AlertDialogContent: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="alert-dialog-content">{children}</div>
	),
	AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
	AlertDialogDescription: ({
		children,
		asChild: _asChild,
	}: {
		children: React.ReactNode;
		asChild?: boolean;
	}) => <div data-testid="description">{children}</div>,
	AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	AlertDialogCancel: ({
		children,
		disabled,
		type,
	}: {
		children: React.ReactNode;
		disabled?: boolean;
		type?: "reset" | "button" | "submit";
	}) => (
		<button type={type} disabled={disabled} data-testid="cancel-btn">
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
		type?: "reset" | "button" | "submit";
		"aria-busy"?: boolean;
	}) => (
		<button type={type} disabled={disabled} aria-busy={ariaBusy} data-testid="action-btn">
			{children}
		</button>
	),
}));

// ============================================================================
// IMPORTS AFTER MOCKS
// ============================================================================

import { DeleteAddressAlertDialog } from "../delete-address-alert-dialog";

// ============================================================================
// HELPERS
// ============================================================================

function setupOpenDialog(data?: Record<string, unknown>) {
	mockUseAlertDialog.mockReturnValue({
		isOpen: true,
		data: {
			addressId: "addr-1",
			addressLabel: "Marie Dupont",
			isDefault: false,
			...data,
		},
		open: vi.fn(),
		close: mockDeleteDialogClose,
		clearData: vi.fn(),
	});
}

function setupClosedDialog() {
	mockUseAlertDialog.mockReturnValue({
		isOpen: false,
		data: null,
		open: vi.fn(),
		close: mockDeleteDialogClose,
		clearData: vi.fn(),
	});
}

// ============================================================================
// TESTS
// ============================================================================

afterEach(cleanup);

describe("DeleteAddressAlertDialog", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockIsPending.value = false;
	});

	it("renders nothing when dialog is closed", () => {
		setupClosedDialog();
		const { container } = render(<DeleteAddressAlertDialog />);
		expect(container.firstChild).toBeNull();
	});

	it("renders the dialog when isOpen=true", () => {
		setupOpenDialog();
		render(<DeleteAddressAlertDialog />);
		expect(screen.getByTestId("alert-dialog")).toBeInTheDocument();
	});

	it("renders the title 'Supprimer cette adresse ?'", () => {
		setupOpenDialog();
		render(<DeleteAddressAlertDialog />);
		expect(screen.getByText("Supprimer cette adresse ?")).toBeInTheDocument();
	});

	it("renders the address label in the description", () => {
		setupOpenDialog({ addressLabel: "Marie Dupont" });
		render(<DeleteAddressAlertDialog />);
		expect(screen.getByText(/Marie Dupont/)).toBeInTheDocument();
	});

	it("renders warning when address is default", () => {
		setupOpenDialog({ isDefault: true });
		render(<DeleteAddressAlertDialog />);
		expect(screen.getByText(/adresse par défaut/i)).toBeInTheDocument();
	});

	it("does NOT render default warning when isDefault=false", () => {
		setupOpenDialog({ isDefault: false });
		render(<DeleteAddressAlertDialog />);
		expect(screen.queryByText(/adresse par défaut/i)).not.toBeInTheDocument();
	});

	it("renders 'Supprimer' action button", () => {
		setupOpenDialog();
		render(<DeleteAddressAlertDialog />);
		expect(screen.getByTestId("action-btn")).toHaveTextContent("Supprimer");
	});

	it("renders 'Annuler' cancel button", () => {
		setupOpenDialog();
		render(<DeleteAddressAlertDialog />);
		expect(screen.getByTestId("cancel-btn")).toHaveTextContent("Annuler");
	});

	it("has hidden addressId input in the form", () => {
		setupOpenDialog({ addressId: "addr-42" });
		render(<DeleteAddressAlertDialog />);
		const input = document.querySelector('input[name="addressId"]') as HTMLInputElement;
		expect(input).toBeInTheDocument();
		expect(input.value).toBe("addr-42");
	});

	it("disables both buttons when isPending=true", () => {
		mockIsPending.value = true;
		setupOpenDialog();
		render(<DeleteAddressAlertDialog />);
		expect(screen.getByTestId("cancel-btn")).toBeDisabled();
		expect(screen.getByTestId("action-btn")).toBeDisabled();
	});

	it("shows 'Suppression...' text when isPending=true", () => {
		mockIsPending.value = true;
		setupOpenDialog();
		render(<DeleteAddressAlertDialog />);
		expect(screen.getByTestId("action-btn")).toHaveTextContent("Suppression...");
	});

	it("sets aria-busy on action button when pending", () => {
		mockIsPending.value = true;
		setupOpenDialog();
		render(<DeleteAddressAlertDialog />);
		expect(screen.getByTestId("action-btn")).toHaveAttribute("aria-busy", "true");
	});
});
