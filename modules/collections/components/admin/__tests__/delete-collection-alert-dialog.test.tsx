import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockDialogData, mockDialogIsOpen, mockDialogClose, mockDeleteAction } = vi.hoisted(() => ({
	mockDialogData: {
		current: null as {
			collectionId: string;
			collectionName: string;
			productsCount: number;
		} | null,
	},
	mockDialogIsOpen: { current: true },
	mockDialogClose: vi.fn(),
	mockDeleteAction: vi.fn(),
}));

vi.mock("@/shared/providers/alert-dialog-store-provider", () => ({
	useAlertDialog: () => ({
		isOpen: mockDialogIsOpen.current,
		close: mockDialogClose,
		data: mockDialogData.current,
	}),
}));

vi.mock("@/modules/collections/hooks/use-delete-collection", () => ({
	useDeleteCollection: ({ onSuccess }: { onSuccess: () => void }) => ({
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
		asChild,
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
	DeleteCollectionAlertDialog,
	DELETE_COLLECTION_DIALOG_ID,
} from "../delete-collection-alert-dialog";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("DeleteCollectionAlertDialog", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockDialogIsOpen.current = true;
		mockDialogData.current = {
			collectionId: "col-1",
			collectionName: "Bagues printemps",
			productsCount: 0,
		};
	});

	// ─── Dialog ID constant ───────────────────────────────────────────────────

	it("exports DELETE_COLLECTION_DIALOG_ID constant", () => {
		expect(DELETE_COLLECTION_DIALOG_ID).toBe("delete-collection");
	});

	// ─── Rendering ────────────────────────────────────────────────────────────

	it("renders the confirmation title", () => {
		render(<DeleteCollectionAlertDialog />);
		expect(screen.getByText("Confirmer la suppression")).toBeInTheDocument();
	});

	it("renders the collection name in the description", () => {
		render(<DeleteCollectionAlertDialog />);
		expect(screen.getByText(/Bagues printemps/)).toBeInTheDocument();
	});

	it("renders cancel and confirm buttons", () => {
		render(<DeleteCollectionAlertDialog />);
		expect(screen.getByText("Annuler")).toBeInTheDocument();
		expect(screen.getByText("Supprimer")).toBeInTheDocument();
	});

	// ─── Products count warning ───────────────────────────────────────────────

	it("shows products warning when productsCount > 0", () => {
		mockDialogData.current = {
			collectionId: "col-1",
			collectionName: "Bagues printemps",
			productsCount: 3,
		};
		render(<DeleteCollectionAlertDialog />);
		expect(screen.getByText(/Cette collection contient 3 produits/)).toBeInTheDocument();
	});

	it("does not show products warning when productsCount is 0", () => {
		mockDialogData.current = {
			collectionId: "col-1",
			collectionName: "Bagues printemps",
			productsCount: 0,
		};
		render(<DeleteCollectionAlertDialog />);
		expect(screen.queryByText(/Cette collection contient/)).not.toBeInTheDocument();
	});

	it("does not render when dialog is closed", () => {
		mockDialogIsOpen.current = false;
		render(<DeleteCollectionAlertDialog />);
		expect(screen.queryByTestId("alert-dialog")).not.toBeInTheDocument();
	});
});
