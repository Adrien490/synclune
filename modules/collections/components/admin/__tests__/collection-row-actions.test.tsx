import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockOpenDialog, mockOpenAlertDialog } = vi.hoisted(() => ({
	mockOpenDialog: vi.fn(),
	mockOpenAlertDialog: vi.fn(),
}));

vi.mock("@/app/generated/prisma/enums", () => ({
	CollectionStatus: { PUBLIC: "PUBLIC", DRAFT: "DRAFT", ARCHIVED: "ARCHIVED" },
}));

vi.mock("@/shared/providers/dialog-store-provider", () => ({
	useDialog: () => ({ open: mockOpenDialog }),
}));

vi.mock("@/shared/providers/alert-dialog-store-provider", () => ({
	useAlertDialog: () => ({ open: mockOpenAlertDialog }),
}));

vi.mock("@/modules/collections/constants/collection-status.constants", () => ({
	COLLECTION_STATUS_LABELS: {
		DRAFT: "Brouillon",
		PUBLIC: "Publiée",
		ARCHIVED: "Archivée",
	},
}));

vi.mock("@/modules/collections/components/admin/collection-form-dialog", () => ({
	COLLECTION_DIALOG_ID: "collection-form",
}));
vi.mock("@/modules/collections/components/admin/delete-collection-alert-dialog", () => ({
	DELETE_COLLECTION_DIALOG_ID: "delete-collection",
}));
vi.mock("@/modules/collections/components/admin/archive-collection-alert-dialog", () => ({
	ARCHIVE_COLLECTION_DIALOG_ID: "archive-collection",
}));
vi.mock("@/modules/collections/components/admin/change-collection-status-alert-dialog", () => ({
	CHANGE_COLLECTION_STATUS_DIALOG_ID: "change-collection-status",
}));

vi.mock("next/link", () => ({
	default: ({
		children,
		href,
		target,
	}: {
		children: React.ReactNode;
		href: string;
		target?: string;
	}) => (
		<a href={href} target={target}>
			{children}
		</a>
	),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		"aria-label": ariaLabel,
		className,
		...rest
	}: {
		children: React.ReactNode;
		"aria-label"?: string;
		className?: string;
		[key: string]: unknown;
	}) => (
		<button aria-label={ariaLabel} className={className} {...rest}>
			{children}
		</button>
	),
}));

vi.mock("@/shared/components/ui/dropdown-menu", () => ({
	DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	DropdownMenuTrigger: ({ children }: { children: React.ReactNode; asChild?: boolean }) => (
		<div data-testid="dropdown-trigger">{children}</div>
	),
	DropdownMenuContent: ({
		children,
	}: {
		children: React.ReactNode;
		align?: string;
		className?: string;
	}) => <div data-testid="dropdown-content">{children}</div>,
	DropdownMenuSeparator: () => <hr data-testid="dropdown-separator" />,
	DropdownMenuItem: ({
		children,
		onClick,
		className,
		disabled,
		asChild: _asChild,
		variant,
	}: {
		children: React.ReactNode;
		onClick?: () => void;
		className?: string;
		disabled?: boolean;
		asChild?: boolean;
		variant?: string;
	}) => (
		<button
			role="menuitem"
			onClick={onClick}
			className={className}
			aria-disabled={disabled}
			data-variant={variant}
		>
			{children}
		</button>
	),
	DropdownMenuSub: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="dropdown-sub">{children}</div>
	),
	DropdownMenuSubTrigger: ({ children }: { children: React.ReactNode }) => (
		<button data-testid="dropdown-sub-trigger">{children}</button>
	),
	DropdownMenuSubContent: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="dropdown-sub-content">{children}</div>
	),
}));

vi.mock("lucide-react", () => ({
	Archive: () => <svg data-testid="icon-archive" />,
	ArchiveRestore: () => <svg data-testid="icon-archive-restore" />,
	Eye: () => <svg data-testid="icon-eye" />,
	FilePenLine: () => <svg data-testid="icon-file-pen-line" />,
	EllipsisVertical: () => <svg data-testid="icon-ellipsis" />,
	Package: () => <svg data-testid="icon-package" />,
	Pencil: () => <svg data-testid="icon-pencil" />,
	Trash2: () => <svg data-testid="icon-trash" />,
}));

import { CollectionRowActions } from "../collection-row-actions";

// ============================================================================
// HELPERS
// ============================================================================

const defaultProps = {
	collectionId: "col-1",
	collectionName: "Bagues printemps",
	collectionSlug: "bagues-printemps",
	collectionDescription: "Une belle collection de bagues.",
	collectionStatus: "PUBLIC" as const,
	productsCount: 5,
};

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("CollectionRowActions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ─── aria-label ───────────────────────────────────────────────────────────

	it("renders trigger button with aria-label 'Actions pour cette collection'", () => {
		render(<CollectionRowActions {...defaultProps} />);
		expect(
			screen.getByRole("button", { name: "Actions pour cette collection" }),
		).toBeInTheDocument();
	});

	// ─── Non-archived state ───────────────────────────────────────────────────

	it("shows 'Voir' menu item for non-archived collection", () => {
		render(<CollectionRowActions {...defaultProps} collectionStatus="PUBLIC" />);
		expect(screen.getByText("Voir")).toBeInTheDocument();
	});

	it("shows 'Modifier' menu item for non-archived collection", () => {
		render(<CollectionRowActions {...defaultProps} collectionStatus="PUBLIC" />);
		expect(screen.getByText("Modifier")).toBeInTheDocument();
	});

	it("shows 'Gerer les produits' menu item for non-archived collection", () => {
		render(<CollectionRowActions {...defaultProps} collectionStatus="PUBLIC" />);
		expect(screen.getByText("Gerer les produits")).toBeInTheDocument();
	});

	it("shows 'Changer statut' submenu trigger for non-archived collection", () => {
		render(<CollectionRowActions {...defaultProps} collectionStatus="PUBLIC" />);
		expect(screen.getByTestId("dropdown-sub-trigger")).toBeInTheDocument();
		expect(screen.getByText("Changer statut")).toBeInTheDocument();
	});

	it("shows 'Archiver' menu item for non-archived collection", () => {
		render(<CollectionRowActions {...defaultProps} collectionStatus="PUBLIC" />);
		expect(screen.getByText("Archiver")).toBeInTheDocument();
	});

	it("does not show 'Restaurer' for non-archived collection", () => {
		render(<CollectionRowActions {...defaultProps} collectionStatus="PUBLIC" />);
		expect(screen.queryByText("Restaurer")).not.toBeInTheDocument();
	});

	it("does not show 'Supprimer' for non-archived collection", () => {
		render(<CollectionRowActions {...defaultProps} collectionStatus="PUBLIC" />);
		expect(screen.queryByText("Supprimer")).not.toBeInTheDocument();
	});

	// ─── Archived state ───────────────────────────────────────────────────────

	it("shows 'Voir' menu item for archived collection", () => {
		render(<CollectionRowActions {...defaultProps} collectionStatus="ARCHIVED" />);
		expect(screen.getByText("Voir")).toBeInTheDocument();
	});

	it("shows 'Modifier' menu item for archived collection", () => {
		render(<CollectionRowActions {...defaultProps} collectionStatus="ARCHIVED" />);
		expect(screen.getByText("Modifier")).toBeInTheDocument();
	});

	it("shows 'Gerer les produits' menu item for archived collection", () => {
		render(<CollectionRowActions {...defaultProps} collectionStatus="ARCHIVED" />);
		expect(screen.getByText("Gerer les produits")).toBeInTheDocument();
	});

	it("shows 'Restaurer' menu item for archived collection", () => {
		render(<CollectionRowActions {...defaultProps} collectionStatus="ARCHIVED" />);
		expect(screen.getByText("Restaurer")).toBeInTheDocument();
	});

	it("shows 'Supprimer' menu item for archived collection", () => {
		render(<CollectionRowActions {...defaultProps} collectionStatus="ARCHIVED" />);
		expect(screen.getByText("Supprimer")).toBeInTheDocument();
	});

	it("does not show 'Archiver' for archived collection", () => {
		render(<CollectionRowActions {...defaultProps} collectionStatus="ARCHIVED" />);
		expect(screen.queryByText("Archiver")).not.toBeInTheDocument();
	});

	it("does not show 'Changer statut' submenu for archived collection", () => {
		render(<CollectionRowActions {...defaultProps} collectionStatus="ARCHIVED" />);
		expect(screen.queryByTestId("dropdown-sub")).not.toBeInTheDocument();
	});
});
