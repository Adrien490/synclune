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
			currentStatus: string;
			targetStatus: string;
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

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
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
	ChangeCollectionStatusAlertDialog,
	CHANGE_COLLECTION_STATUS_DIALOG_ID,
} from "../change-collection-status-alert-dialog";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("ChangeCollectionStatusAlertDialog", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockDialogIsOpen.current = true;
	});

	// ─── Dialog ID constant ───────────────────────────────────────────────────

	it("exports CHANGE_COLLECTION_STATUS_DIALOG_ID constant", () => {
		expect(CHANGE_COLLECTION_STATUS_DIALOG_ID).toBe("change-collection-status");
	});

	// ─── Title with target status label ──────────────────────────────────────

	it('renders title with "Brouillon" when targetStatus is DRAFT', () => {
		mockDialogData.current = {
			collectionId: "col-1",
			collectionName: "Bagues printemps",
			currentStatus: "PUBLIC",
			targetStatus: "DRAFT",
		};
		render(<ChangeCollectionStatusAlertDialog />);
		expect(screen.getByText(/Changer le statut en/)).toBeInTheDocument();
		expect(screen.getAllByText(/Brouillon/).length).toBeGreaterThanOrEqual(1);
	});

	it('renders title with "Public" when targetStatus is PUBLIC', () => {
		mockDialogData.current = {
			collectionId: "col-1",
			collectionName: "Bagues printemps",
			currentStatus: "DRAFT",
			targetStatus: "PUBLIC",
		};
		render(<ChangeCollectionStatusAlertDialog />);
		expect(screen.getByText(/Changer le statut en/)).toBeInTheDocument();
		// Multiple "Public" occurrences are expected (title + description)
		const publicTexts = screen.getAllByText(/Public/);
		expect(publicTexts.length).toBeGreaterThan(0);
	});

	// ─── Collection name in description ───────────────────────────────────────

	it("shows collection name in description", () => {
		mockDialogData.current = {
			collectionId: "col-1",
			collectionName: "Bagues printemps",
			currentStatus: "PUBLIC",
			targetStatus: "DRAFT",
		};
		render(<ChangeCollectionStatusAlertDialog />);
		expect(screen.getByText(/Bagues printemps/)).toBeInTheDocument();
	});

	// ─── Action button text ───────────────────────────────────────────────────

	it("renders 'Changer en Brouillon' button text for DRAFT target", () => {
		mockDialogData.current = {
			collectionId: "col-1",
			collectionName: "Bagues printemps",
			currentStatus: "PUBLIC",
			targetStatus: "DRAFT",
		};
		render(<ChangeCollectionStatusAlertDialog />);
		expect(screen.getByText("Changer en Brouillon")).toBeInTheDocument();
	});

	it("renders 'Changer en Public' button text for PUBLIC target", () => {
		mockDialogData.current = {
			collectionId: "col-1",
			collectionName: "Bagues printemps",
			currentStatus: "DRAFT",
			targetStatus: "PUBLIC",
		};
		render(<ChangeCollectionStatusAlertDialog />);
		expect(screen.getByText("Changer en Public")).toBeInTheDocument();
	});

	it("does not render when dialog is closed", () => {
		mockDialogIsOpen.current = false;
		mockDialogData.current = {
			collectionId: "col-1",
			collectionName: "Bagues printemps",
			currentStatus: "PUBLIC",
			targetStatus: "DRAFT",
		};
		render(<ChangeCollectionStatusAlertDialog />);
		expect(screen.queryByTestId("alert-dialog")).not.toBeInTheDocument();
	});
});
