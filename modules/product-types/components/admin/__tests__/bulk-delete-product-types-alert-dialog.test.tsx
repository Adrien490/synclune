import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockClose, mockClearSelection, mockBulkDelete } = vi.hoisted(() => ({
	mockClose: vi.fn(),
	mockClearSelection: vi.fn(),
	mockBulkDelete: vi.fn(),
}));

let mockDialogState = {
	isOpen: true,
	close: mockClose,
	data: {
		productTypeIds: ["pt-1", "pt-2", "pt-3"],
	} as Record<string, unknown> | null,
};

let mockIsPending = false;

vi.mock("@/shared/providers/alert-dialog-store-provider", () => ({
	useAlertDialog: () => mockDialogState,
}));

vi.mock("@/shared/contexts/selection-context", () => ({
	useSelectionContext: () => ({ clearSelection: mockClearSelection }),
}));

vi.mock("@/modules/product-types/hooks/use-bulk-delete-product-types", () => ({
	useBulkDeleteProductTypes: ({ onSuccess }: { onSuccess?: () => void } = {}) => ({
		action: mockBulkDelete,
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
		<button
			data-testid="cancel-button"
			disabled={disabled}
			type={type as "button" | "submit" | undefined}
		>
			{children}
		</button>
	),
	AlertDialogAction: ({
		children,
		disabled,
		"aria-busy": ariaBusy,
		type,
	}: {
		children: React.ReactNode;
		disabled?: boolean;
		"aria-busy"?: boolean;
		type?: string;
	}) => (
		<button
			data-testid="submit-button"
			disabled={disabled}
			aria-busy={ariaBusy}
			type={type as "button" | "submit" | undefined}
		>
			{children}
		</button>
	),
}));

vi.mock("lucide-react", () => ({
	LoaderCircle: ({ className }: { className?: string }) => (
		<span data-testid="loader" className={className} />
	),
}));

import {
	BulkDeleteProductTypesAlertDialog,
	BULK_DELETE_PRODUCT_TYPES_DIALOG_ID,
} from "../bulk-delete-product-types-alert-dialog";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("BulkDeleteProductTypesAlertDialog", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockIsPending = false;
		mockDialogState = {
			isOpen: true,
			close: mockClose,
			data: {
				productTypeIds: ["pt-1", "pt-2", "pt-3"],
			},
		};
	});

	// ─── Dialog ID export ──────────────────────────────────────────────────────

	it("exports BULK_DELETE_PRODUCT_TYPES_DIALOG_ID", () => {
		expect(BULK_DELETE_PRODUCT_TYPES_DIALOG_ID).toBe("bulk-delete-product-types");
	});

	// ─── Visibility ───────────────────────────────────────────────────────────

	it("returns null when data is null", () => {
		mockDialogState = { ...mockDialogState, data: null };
		const { container } = render(<BulkDeleteProductTypesAlertDialog />);
		expect(container.firstChild).toBeNull();
	});

	it("does not render content when dialog is closed", () => {
		mockDialogState = { ...mockDialogState, isOpen: false };
		render(<BulkDeleteProductTypesAlertDialog />);
		expect(screen.queryByTestId("alert-dialog")).not.toBeInTheDocument();
	});

	it("renders title when dialog is open with data", () => {
		render(<BulkDeleteProductTypesAlertDialog />);
		expect(screen.getByText("Supprimer les types de bijoux")).toBeInTheDocument();
	});

	// ─── Count display ────────────────────────────────────────────────────────

	it("shows singular 'type de bijou' for a count of 1", () => {
		mockDialogState = {
			...mockDialogState,
			data: { productTypeIds: ["pt-1"] },
		};
		render(<BulkDeleteProductTypesAlertDialog />);
		expect(screen.getByText(/1 type de bijou/)).toBeInTheDocument();
	});

	it("shows plural 'types de bijoux' for a count of 3", () => {
		render(<BulkDeleteProductTypesAlertDialog />);
		expect(screen.getByText(/3 types de bijoux/)).toBeInTheDocument();
	});

	// ─── System type warning ──────────────────────────────────────────────────

	it("shows warning about system types being ignored", () => {
		render(<BulkDeleteProductTypesAlertDialog />);
		expect(screen.getByText(/types système/)).toBeInTheDocument();
	});

	// ─── Irreversible warning ─────────────────────────────────────────────────

	it("always shows irreversible warning", () => {
		render(<BulkDeleteProductTypesAlertDialog />);
		expect(screen.getByText("Cette action est irréversible.")).toBeInTheDocument();
	});

	// ─── Buttons ─────────────────────────────────────────────────────────────

	it("shows 'Annuler' button", () => {
		render(<BulkDeleteProductTypesAlertDialog />);
		expect(screen.getByTestId("cancel-button")).toBeInTheDocument();
		expect(screen.getByText("Annuler")).toBeInTheDocument();
	});

	it("shows 'Supprimer' button", () => {
		render(<BulkDeleteProductTypesAlertDialog />);
		expect(screen.getByTestId("submit-button")).toBeInTheDocument();
		expect(screen.getByText("Supprimer")).toBeInTheDocument();
	});

	// ─── Pending state ────────────────────────────────────────────────────────

	it("shows 'Suppression...' on submit button when isPending", () => {
		mockIsPending = true;
		render(<BulkDeleteProductTypesAlertDialog />);
		expect(screen.getByText("Suppression...")).toBeInTheDocument();
	});

	it("disables cancel button when isPending", () => {
		mockIsPending = true;
		render(<BulkDeleteProductTypesAlertDialog />);
		expect(screen.getByTestId("cancel-button")).toBeDisabled();
	});

	it("disables submit button when isPending", () => {
		mockIsPending = true;
		render(<BulkDeleteProductTypesAlertDialog />);
		expect(screen.getByTestId("submit-button")).toBeDisabled();
	});
});
