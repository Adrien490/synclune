import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockDialogData, mockDialogIsOpen, mockDialogClose, mockUpdateAction } = vi.hoisted(() => ({
	mockDialogData: {
		current: null as {
			collectionId: string;
			collectionName: string;
			collectionStatus: string;
		} | null,
	},
	mockDialogIsOpen: { current: true },
	mockDialogClose: vi.fn(),
	mockUpdateAction: vi.fn(),
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

vi.mock("@/modules/collections/hooks/use-update-collection-status", () => ({
	useUpdateCollectionStatus: ({ onSuccess }: { onSuccess: () => void }) => ({
		action: mockUpdateAction,
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
	ArchiveCollectionAlertDialog,
	ARCHIVE_COLLECTION_DIALOG_ID,
} from "../archive-collection-alert-dialog";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("ArchiveCollectionAlertDialog", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockDialogIsOpen.current = true;
	});

	// ─── Dialog ID constant ───────────────────────────────────────────────────

	it("exports ARCHIVE_COLLECTION_DIALOG_ID constant", () => {
		expect(ARCHIVE_COLLECTION_DIALOG_ID).toBe("archive-collection");
	});

	// ─── Archive title (non-archived collection) ──────────────────────────────

	it("renders 'Archiver la collection' title when collection is not archived", () => {
		mockDialogData.current = {
			collectionId: "col-1",
			collectionName: "Bagues printemps",
			collectionStatus: "PUBLIC",
		};
		render(<ArchiveCollectionAlertDialog />);
		expect(screen.getByText("Archiver la collection")).toBeInTheDocument();
	});

	it("renders 'Archiver la collection' title for DRAFT status", () => {
		mockDialogData.current = {
			collectionId: "col-1",
			collectionName: "Bagues printemps",
			collectionStatus: "DRAFT",
		};
		render(<ArchiveCollectionAlertDialog />);
		expect(screen.getByText("Archiver la collection")).toBeInTheDocument();
	});

	// ─── Restore title (archived collection) ─────────────────────────────────

	it("renders 'Restaurer la collection' title when collection is archived", () => {
		mockDialogData.current = {
			collectionId: "col-1",
			collectionName: "Bagues printemps",
			collectionStatus: "ARCHIVED",
		};
		render(<ArchiveCollectionAlertDialog />);
		expect(screen.getByText("Restaurer la collection")).toBeInTheDocument();
	});

	// ─── Collection name in description ───────────────────────────────────────

	it("shows collection name in description when archiving", () => {
		mockDialogData.current = {
			collectionId: "col-1",
			collectionName: "Bagues printemps",
			collectionStatus: "PUBLIC",
		};
		render(<ArchiveCollectionAlertDialog />);
		expect(screen.getByText(/Bagues printemps/)).toBeInTheDocument();
	});

	it("shows collection name in description when restoring", () => {
		mockDialogData.current = {
			collectionId: "col-1",
			collectionName: "Collier été",
			collectionStatus: "ARCHIVED",
		};
		render(<ArchiveCollectionAlertDialog />);
		expect(screen.getByText(/Collier été/)).toBeInTheDocument();
	});

	// ─── Action button text ───────────────────────────────────────────────────

	it("renders 'Archiver' button text when not archived", () => {
		mockDialogData.current = {
			collectionId: "col-1",
			collectionName: "Bagues printemps",
			collectionStatus: "PUBLIC",
		};
		render(<ArchiveCollectionAlertDialog />);
		expect(screen.getByText("Archiver")).toBeInTheDocument();
	});

	it("renders 'Restaurer' button text when archived", () => {
		mockDialogData.current = {
			collectionId: "col-1",
			collectionName: "Bagues printemps",
			collectionStatus: "ARCHIVED",
		};
		render(<ArchiveCollectionAlertDialog />);
		expect(screen.getByText("Restaurer")).toBeInTheDocument();
	});

	it("does not render when dialog is closed", () => {
		mockDialogIsOpen.current = false;
		mockDialogData.current = {
			collectionId: "col-1",
			collectionName: "Bagues printemps",
			collectionStatus: "PUBLIC",
		};
		render(<ArchiveCollectionAlertDialog />);
		expect(screen.queryByTestId("alert-dialog")).not.toBeInTheDocument();
	});
});
