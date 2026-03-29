import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockDialogData, mockDialogIsOpen, mockDialogClose } = vi.hoisted(() => ({
	mockDialogData: {
		current: null as {
			collection?: {
				id: string;
				name: string;
				slug: string;
				description: string | null;
				status: string;
			};
		} | null,
	},
	mockDialogIsOpen: { current: false },
	mockDialogClose: vi.fn(),
}));

vi.mock("@/shared/providers/dialog-store-provider", () => ({
	useDialog: () => ({
		isOpen: mockDialogIsOpen.current,
		close: mockDialogClose,
		data: mockDialogData.current,
	}),
}));

vi.mock("@/shared/components/responsive-dialog", () => ({
	ResponsiveDialog: ({
		children,
		open,
	}: {
		children: React.ReactNode;
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
	}) => (open ? <div data-testid="responsive-dialog">{children}</div> : null),
	ResponsiveDialogContent: ({
		children,
		className: _className,
	}: {
		children: React.ReactNode;
		className?: string;
	}) => <div data-testid="responsive-dialog-content">{children}</div>,
	ResponsiveDialogHeader: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="responsive-dialog-header">{children}</div>
	),
	ResponsiveDialogTitle: ({ children }: { children: React.ReactNode }) => (
		<h2 data-testid="responsive-dialog-title">{children}</h2>
	),
	ResponsiveDialogDescription: ({ children }: { children: React.ReactNode }) => (
		<p data-testid="responsive-dialog-description">{children}</p>
	),
}));

vi.mock("@/modules/collections/components/admin/create-collection-form", () => ({
	CreateCollectionForm: ({
		onSuccess: _onSuccess,
		redirectOnSuccess,
	}: {
		onSuccess?: () => void;
		redirectOnSuccess?: boolean;
	}) => <div data-testid="create-collection-form" data-redirect={String(redirectOnSuccess)} />,
}));

vi.mock("@/modules/collections/components/admin/edit-collection-form", () => ({
	EditCollectionForm: ({
		collection: _collection,
		onSuccess: _onSuccess,
		redirectOnSuccess,
	}: {
		collection: unknown;
		onSuccess?: () => void;
		redirectOnSuccess?: boolean;
	}) => <div data-testid="edit-collection-form" data-redirect={String(redirectOnSuccess)} />,
}));

import { CollectionFormDialog, COLLECTION_DIALOG_ID } from "../collection-form-dialog";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("CollectionFormDialog", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockDialogIsOpen.current = true;
		mockDialogData.current = null;
	});

	// ─── Dialog ID constant ───────────────────────────────────────────────────

	it("exports COLLECTION_DIALOG_ID constant", () => {
		expect(COLLECTION_DIALOG_ID).toBe("collection-form");
	});

	// ─── Create mode ─────────────────────────────────────────────────────────

	it("renders 'Créer une collection' title in create mode (no collection data)", () => {
		mockDialogData.current = null;
		render(<CollectionFormDialog />);
		expect(screen.getByText("Créer une collection")).toBeInTheDocument();
	});

	it("renders CreateCollectionForm in create mode", () => {
		mockDialogData.current = null;
		render(<CollectionFormDialog />);
		expect(screen.getByTestId("create-collection-form")).toBeInTheDocument();
		expect(screen.queryByTestId("edit-collection-form")).not.toBeInTheDocument();
	});

	// ─── Update mode ─────────────────────────────────────────────────────────

	it("renders 'Modifier la collection' title in update mode", () => {
		mockDialogData.current = {
			collection: {
				id: "col-1",
				name: "Bagues printemps",
				slug: "bagues-printemps",
				description: "Une collection de bagues.",
				status: "PUBLIC",
			},
		};
		render(<CollectionFormDialog />);
		expect(screen.getByText("Modifier la collection")).toBeInTheDocument();
	});

	it("renders EditCollectionForm in update mode", () => {
		mockDialogData.current = {
			collection: {
				id: "col-1",
				name: "Bagues printemps",
				slug: "bagues-printemps",
				description: "Une collection de bagues.",
				status: "PUBLIC",
			},
		};
		render(<CollectionFormDialog />);
		expect(screen.getByTestId("edit-collection-form")).toBeInTheDocument();
		expect(screen.queryByTestId("create-collection-form")).not.toBeInTheDocument();
	});

	// ─── Closed state ─────────────────────────────────────────────────────────

	it("does not render dialog content when closed", () => {
		mockDialogIsOpen.current = false;
		render(<CollectionFormDialog />);
		expect(screen.queryByTestId("responsive-dialog")).not.toBeInTheDocument();
	});
});
