import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockOpenDialog, mockOpenAlertDialog, mockPush, mockIsMobile } = vi.hoisted(() => ({
	mockOpenDialog: vi.fn(),
	mockOpenAlertDialog: vi.fn(),
	mockPush: vi.fn(),
	mockIsMobile: { current: false },
}));

vi.mock("@/app/generated/prisma/enums", () => ({
	CollectionStatus: { PUBLIC: "PUBLIC", DRAFT: "DRAFT", ARCHIVED: "ARCHIVED" },
}));

vi.mock("@/shared/providers/dialog-store-provider", () => ({
	useDialog: () => ({ open: mockOpenDialog }),
}));

vi.mock("@/shared/hooks/use-mobile", () => ({
	useIsMobile: () => mockIsMobile.current,
}));

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: mockPush }),
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

vi.mock("@/shared/components/responsive-action-menu", async () => {
	const { buildResponsiveActionMenuMock } =
		await import("@/shared/components/responsive-action-menu/test-mock");
	return buildResponsiveActionMenuMock();
});

vi.mock("lucide-react", () => ({
	Archive: () => <svg data-testid="icon-archive" />,
	ArchiveRestore: () => <svg data-testid="icon-archive-restore" />,
	EllipsisVertical: () => <svg data-testid="icon-ellipsis" />,
	Eye: () => <svg data-testid="icon-eye" />,
	FilePenLine: () => <svg data-testid="icon-file-pen-line" />,
	Package: () => <svg data-testid="icon-package" />,
	Pencil: () => <svg data-testid="icon-pencil" />,
	Trash2: () => <svg data-testid="icon-trash" />,
	Upload: () => <svg data-testid="icon-upload" />,
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
		mockIsMobile.current = false;
	});

	// ─── aria-label ───────────────────────────────────────────────────────────

	it("renders trigger button with aria-label 'Actions pour cette collection'", () => {
		render(<CollectionRowActions {...defaultProps} />);
		expect(
			screen.getByRole("button", { name: "Actions pour cette collection" }),
		).toBeInTheDocument();
	});

	// ─── Non-archived state ───────────────────────────────────────────────────

	it("shows 'Voir la page publique' menu item for non-archived collection", () => {
		render(<CollectionRowActions {...defaultProps} collectionStatus="PUBLIC" />);
		expect(screen.getByRole("menuitem", { name: "Voir la page publique" })).toBeInTheDocument();
	});

	it("shows 'Modifier' menu item for non-archived collection", () => {
		render(<CollectionRowActions {...defaultProps} collectionStatus="PUBLIC" />);
		expect(screen.getByRole("menuitem", { name: "Modifier" })).toBeInTheDocument();
	});

	it("shows 'Gérer les produits' menu item for non-archived collection", () => {
		render(<CollectionRowActions {...defaultProps} collectionStatus="PUBLIC" />);
		expect(screen.getByRole("menuitem", { name: "Gérer les produits" })).toBeInTheDocument();
	});

	it("shows flat status actions for non-archived collection", () => {
		render(<CollectionRowActions {...defaultProps} collectionStatus="PUBLIC" />);
		expect(screen.getByRole("menuitem", { name: "Marquer comme brouillon" })).toBeInTheDocument();
		expect(screen.getByRole("menuitem", { name: "Publier" })).toBeInTheDocument();
	});

	it("shows 'Archiver' menu item for non-archived collection", () => {
		render(<CollectionRowActions {...defaultProps} collectionStatus="PUBLIC" />);
		expect(screen.getByRole("menuitem", { name: "Archiver" })).toBeInTheDocument();
	});

	it("does not show 'Restaurer' for non-archived collection", () => {
		render(<CollectionRowActions {...defaultProps} collectionStatus="PUBLIC" />);
		expect(screen.queryByRole("menuitem", { name: "Restaurer" })).not.toBeInTheDocument();
	});

	it("does not show 'Supprimer définitivement' for non-archived collection", () => {
		render(<CollectionRowActions {...defaultProps} collectionStatus="PUBLIC" />);
		expect(
			screen.queryByRole("menuitem", { name: "Supprimer définitivement" }),
		).not.toBeInTheDocument();
	});

	// ─── Archived state ───────────────────────────────────────────────────────

	it("shows 'Voir la page publique' menu item for archived collection", () => {
		render(<CollectionRowActions {...defaultProps} collectionStatus="ARCHIVED" />);
		expect(screen.getByRole("menuitem", { name: "Voir la page publique" })).toBeInTheDocument();
	});

	it("shows 'Modifier' menu item for archived collection", () => {
		render(<CollectionRowActions {...defaultProps} collectionStatus="ARCHIVED" />);
		expect(screen.getByRole("menuitem", { name: "Modifier" })).toBeInTheDocument();
	});

	it("shows 'Gérer les produits' menu item for archived collection", () => {
		render(<CollectionRowActions {...defaultProps} collectionStatus="ARCHIVED" />);
		expect(screen.getByRole("menuitem", { name: "Gérer les produits" })).toBeInTheDocument();
	});

	it("shows 'Restaurer' menu item for archived collection", () => {
		render(<CollectionRowActions {...defaultProps} collectionStatus="ARCHIVED" />);
		expect(screen.getByRole("menuitem", { name: "Restaurer" })).toBeInTheDocument();
	});

	it("shows 'Supprimer définitivement' menu item for archived collection", () => {
		render(<CollectionRowActions {...defaultProps} collectionStatus="ARCHIVED" />);
		expect(screen.getByRole("menuitem", { name: "Supprimer définitivement" })).toBeInTheDocument();
	});

	it("does not show 'Archiver' for archived collection", () => {
		render(<CollectionRowActions {...defaultProps} collectionStatus="ARCHIVED" />);
		expect(screen.queryByRole("menuitem", { name: "Archiver" })).not.toBeInTheDocument();
	});

	it("does not show flat status actions for archived collection", () => {
		render(<CollectionRowActions {...defaultProps} collectionStatus="ARCHIVED" />);
		expect(
			screen.queryByRole("menuitem", { name: "Marquer comme brouillon" }),
		).not.toBeInTheDocument();
		expect(screen.queryByRole("menuitem", { name: "Publier" })).not.toBeInTheDocument();
	});
});
