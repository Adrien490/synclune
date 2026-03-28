import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockDialogData, mockDialogIsOpen, mockDialogClose, mockArchiveAction, mockClearSelection } =
	vi.hoisted(() => ({
		mockDialogData: {
			current: null as {
				collectionIds: string[];
				targetStatus: string;
			} | null,
		},
		mockDialogIsOpen: { current: true },
		mockDialogClose: vi.fn(),
		mockArchiveAction: vi.fn(),
		mockClearSelection: vi.fn(),
	}));

vi.mock("@/app/generated/prisma/enums", () => ({
	CollectionStatus: { PUBLIC: "PUBLIC", DRAFT: "DRAFT", ARCHIVED: "ARCHIVED" },
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

vi.mock("@/modules/collections/hooks/use-bulk-archive-collections", () => ({
	useBulkArchiveCollections: ({ onSuccess }: { onSuccess: () => void }) => ({
		action: mockArchiveAction,
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
		className,
	}: {
		children: React.ReactNode;
		type?: string;
		disabled?: boolean;
		className?: string;
	}) => (
		<button type={type as "submit"} disabled={disabled} className={className}>
			{children}
		</button>
	),
}));

vi.mock("lucide-react", () => ({
	LoaderCircle: () => <svg data-testid="icon-loader" />,
}));

import {
	BulkArchiveCollectionsAlertDialog,
	BULK_ARCHIVE_COLLECTIONS_DIALOG_ID,
} from "../bulk-archive-collections-alert-dialog";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("BulkArchiveCollectionsAlertDialog", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockDialogIsOpen.current = true;
	});

	// ─── Dialog ID constant ───────────────────────────────────────────────────

	it("exports BULK_ARCHIVE_COLLECTIONS_DIALOG_ID constant", () => {
		expect(BULK_ARCHIVE_COLLECTIONS_DIALOG_ID).toBe("bulk-archive-collections");
	});

	// ─── Archiving title ──────────────────────────────────────────────────────

	it("renders 'Archiver N collections' title when targetStatus is ARCHIVED", () => {
		mockDialogData.current = {
			collectionIds: ["col-1", "col-2"],
			targetStatus: "ARCHIVED",
		};
		render(<BulkArchiveCollectionsAlertDialog />);
		expect(screen.getByText("Archiver 2 collections")).toBeInTheDocument();
	});

	it("renders 'Archiver 1 collection' title (singular) when targetStatus is ARCHIVED", () => {
		mockDialogData.current = {
			collectionIds: ["col-1"],
			targetStatus: "ARCHIVED",
		};
		render(<BulkArchiveCollectionsAlertDialog />);
		expect(screen.getByText("Archiver 1 collection")).toBeInTheDocument();
	});

	// ─── Restoring title ──────────────────────────────────────────────────────

	it("renders 'Restaurer N collections' title when targetStatus is PUBLIC", () => {
		mockDialogData.current = {
			collectionIds: ["col-1", "col-2"],
			targetStatus: "PUBLIC",
		};
		render(<BulkArchiveCollectionsAlertDialog />);
		expect(screen.getByText("Restaurer 2 collections")).toBeInTheDocument();
	});

	it("renders 'Restaurer 1 collection' title (singular) when targetStatus is PUBLIC", () => {
		mockDialogData.current = {
			collectionIds: ["col-1"],
			targetStatus: "PUBLIC",
		};
		render(<BulkArchiveCollectionsAlertDialog />);
		expect(screen.getByText("Restaurer 1 collection")).toBeInTheDocument();
	});

	// ─── Action button text ───────────────────────────────────────────────────

	it("renders 'Archiver' button when archiving", () => {
		mockDialogData.current = {
			collectionIds: ["col-1"],
			targetStatus: "ARCHIVED",
		};
		render(<BulkArchiveCollectionsAlertDialog />);
		expect(screen.getByText("Archiver")).toBeInTheDocument();
	});

	it("renders 'Restaurer' button when restoring", () => {
		mockDialogData.current = {
			collectionIds: ["col-1"],
			targetStatus: "PUBLIC",
		};
		render(<BulkArchiveCollectionsAlertDialog />);
		expect(screen.getByText("Restaurer")).toBeInTheDocument();
	});

	it("does not render when dialog is closed", () => {
		mockDialogIsOpen.current = false;
		mockDialogData.current = { collectionIds: ["col-1"], targetStatus: "ARCHIVED" };
		render(<BulkArchiveCollectionsAlertDialog />);
		expect(screen.queryByTestId("alert-dialog")).not.toBeInTheDocument();
	});
});
