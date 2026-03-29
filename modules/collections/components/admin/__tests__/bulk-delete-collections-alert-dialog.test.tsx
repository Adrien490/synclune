import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockDialogData, mockDialogIsOpen, mockDialogClose, mockDeleteAction, mockClearSelection } =
	vi.hoisted(() => ({
		mockDialogData: {
			current: null as {
				collectionIds: string[];
				totalProductsCount?: number;
			} | null,
		},
		mockDialogIsOpen: { current: true },
		mockDialogClose: vi.fn(),
		mockDeleteAction: vi.fn(),
		mockClearSelection: vi.fn(),
	}));

vi.mock("@/shared/providers/alert-dialog-store-provider", () => ({
	useAlertDialog: () => ({
		isOpen: mockDialogIsOpen.current,
		close: mockDialogClose,
		data: mockDialogData.current,
	}),
}));

vi.mock("@/shared/contexts/selection-context", () => ({
	useSelectionContext: () => ({
		clearSelection: mockClearSelection,
	}),
}));

vi.mock("@/modules/collections/hooks/use-bulk-delete-collections", () => ({
	useBulkDeleteCollections: ({ onSuccess }: { onSuccess: () => void }) => ({
		action: mockDeleteAction,
		isPending: false,
		onSuccess,
	}),
}));

vi.mock("@/shared/components/ui/alert-dialog", () => ({
	AlertDialog: ({
		children,
		open,
	}: {
		children: React.ReactNode;
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
	}) => (open ? <div data-testid="alert-dialog">{children}</div> : null),
	AlertDialogContent: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="alert-dialog-content">{children}</div>
	),
	AlertDialogHeader: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="alert-dialog-header">{children}</div>
	),
	AlertDialogTitle: ({ children }: { children: React.ReactNode }) => (
		<h2 data-testid="alert-dialog-title">{children}</h2>
	),
	AlertDialogDescription: ({
		children,
		asChild: _asChild,
	}: {
		children: React.ReactNode;
		asChild?: boolean;
	}) => <div data-testid="alert-dialog-description">{children}</div>,
	AlertDialogFooter: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="alert-dialog-footer">{children}</div>
	),
	AlertDialogCancel: ({
		children,
		type,
		disabled,
	}: {
		children: React.ReactNode;
		type?: string;
		disabled?: boolean;
	}) => (
		<button type={type as "button"} disabled={disabled}>
			{children}
		</button>
	),
	AlertDialogAction: ({
		children,
		type,
		disabled,
	}: {
		children: React.ReactNode;
		type?: string;
		disabled?: boolean;
	}) => (
		<button type={type as "submit"} disabled={disabled}>
			{children}
		</button>
	),
}));

vi.mock("lucide-react", () => ({
	LoaderCircle: () => <svg data-testid="icon-loader" />,
}));

import {
	BulkDeleteCollectionsAlertDialog,
	BULK_DELETE_COLLECTIONS_DIALOG_ID,
} from "../bulk-delete-collections-alert-dialog";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("BulkDeleteCollectionsAlertDialog", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockDialogIsOpen.current = true;
		mockDialogData.current = {
			collectionIds: ["col-1", "col-2"],
			totalProductsCount: 0,
		};
	});

	// ─── Dialog ID constant ───────────────────────────────────────────────────

	it("exports BULK_DELETE_COLLECTIONS_DIALOG_ID constant", () => {
		expect(BULK_DELETE_COLLECTIONS_DIALOG_ID).toBe("bulk-delete-collections");
	});

	// ─── Rendering ────────────────────────────────────────────────────────────

	it("renders the confirmation title", () => {
		render(<BulkDeleteCollectionsAlertDialog />);
		expect(screen.getByText("Confirmer la suppression")).toBeInTheDocument();
	});

	it("renders count text for multiple collections", () => {
		render(<BulkDeleteCollectionsAlertDialog />);
		expect(screen.getByText(/2 collections/)).toBeInTheDocument();
	});

	it("renders count text for single collection", () => {
		mockDialogData.current = {
			collectionIds: ["col-1"],
			totalProductsCount: 0,
		};
		render(<BulkDeleteCollectionsAlertDialog />);
		expect(screen.getByText(/1 collection/)).toBeInTheDocument();
	});

	it("renders cancel and confirm buttons", () => {
		render(<BulkDeleteCollectionsAlertDialog />);
		expect(screen.getByText("Annuler")).toBeInTheDocument();
		expect(screen.getByText("Supprimer")).toBeInTheDocument();
	});

	// ─── Products count warning ───────────────────────────────────────────────

	it("shows products warning when totalProductsCount > 0", () => {
		mockDialogData.current = {
			collectionIds: ["col-1", "col-2"],
			totalProductsCount: 5,
		};
		render(<BulkDeleteCollectionsAlertDialog />);
		expect(screen.getByText(/5 produits/)).toBeInTheDocument();
	});

	it("does not show products warning when totalProductsCount is 0", () => {
		mockDialogData.current = {
			collectionIds: ["col-1", "col-2"],
			totalProductsCount: 0,
		};
		render(<BulkDeleteCollectionsAlertDialog />);
		expect(screen.queryByText(/produits/)).not.toBeInTheDocument();
	});

	it("does not render when dialog is closed", () => {
		mockDialogIsOpen.current = false;
		render(<BulkDeleteCollectionsAlertDialog />);
		expect(screen.queryByTestId("alert-dialog")).not.toBeInTheDocument();
	});
});
