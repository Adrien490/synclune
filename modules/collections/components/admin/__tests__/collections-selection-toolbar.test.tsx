import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockSelectedItems, mockClearSelection, mockOpenAlertDialog, mockBulkChangeStatus } =
	vi.hoisted(() => ({
		mockSelectedItems: { current: [] as string[] },
		mockClearSelection: vi.fn(),
		mockOpenAlertDialog: vi.fn(),
		mockBulkChangeStatus: vi.fn(),
	}));

vi.mock("@/app/generated/prisma/enums", () => ({
	CollectionStatus: { PUBLIC: "PUBLIC", DRAFT: "DRAFT", ARCHIVED: "ARCHIVED" },
}));

vi.mock("@/shared/contexts/selection-context", () => ({
	useSelectionContext: () => ({
		selectedItems: mockSelectedItems.current,
		clearSelection: mockClearSelection,
	}),
}));

vi.mock("@/shared/providers/alert-dialog-store-provider", () => ({
	useAlertDialog: () => ({ open: mockOpenAlertDialog }),
}));

vi.mock("@/modules/collections/hooks/use-bulk-archive-collections", () => ({
	useBulkArchiveCollections: () => ({
		handle: mockBulkChangeStatus,
		isPending: false,
	}),
}));

vi.mock("@/modules/collections/components/admin/bulk-delete-collections-alert-dialog", () => ({
	BULK_DELETE_COLLECTIONS_DIALOG_ID: "bulk-delete-collections",
}));

vi.mock("@/modules/collections/components/admin/bulk-archive-collections-alert-dialog", () => ({
	BULK_ARCHIVE_COLLECTIONS_DIALOG_ID: "bulk-archive-collections",
}));

vi.mock("@/shared/components/selection-toolbar", () => ({
	SelectionToolbar: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="selection-toolbar">{children}</div>
	),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		"aria-label": ariaLabel,
		...rest
	}: {
		children: React.ReactNode;
		"aria-label"?: string;
		[key: string]: unknown;
	}) => (
		<button aria-label={ariaLabel} {...rest}>
			{children}
		</button>
	),
}));

vi.mock("@/shared/components/responsive-action-menu", async () => {
	const { buildResponsiveActionMenuMock } =
		await import("@/shared/components/responsive-action-menu/test-mock");
	return buildResponsiveActionMenuMock();
});

vi.mock("sonner", () => ({
	toast: { error: vi.fn() },
}));

vi.mock("lucide-react", () => ({
	Archive: () => <svg data-testid="icon-archive" />,
	ArchiveRestore: () => <svg data-testid="icon-archive-restore" />,
	FilePenLine: () => <svg data-testid="icon-file-pen-line" />,
	Globe: () => <svg data-testid="icon-globe" />,
	EllipsisVertical: () => <svg data-testid="icon-ellipsis" />,
	Trash2: () => <svg data-testid="icon-trash" />,
}));

import { CollectionsSelectionToolbar } from "../collections-selection-toolbar";

// ============================================================================
// HELPERS
// ============================================================================

const nonArchivedCollections = [
	{ id: "1", name: "Col 1", status: "PUBLIC" as const, productsCount: 3 },
	{ id: "2", name: "Col 2", status: "DRAFT" as const, productsCount: 1 },
];

const archivedCollections = [
	{ id: "1", name: "Col 1", status: "ARCHIVED" as const, productsCount: 2 },
	{ id: "2", name: "Col 2", status: "ARCHIVED" as const, productsCount: 0 },
];

const allDraftCollections = [
	{ id: "1", name: "Col 1", status: "DRAFT" as const, productsCount: 0 },
	{ id: "2", name: "Col 2", status: "DRAFT" as const, productsCount: 0 },
];

const allPublicCollections = [
	{ id: "1", name: "Col 1", status: "PUBLIC" as const, productsCount: 3 },
	{ id: "2", name: "Col 2", status: "PUBLIC" as const, productsCount: 5 },
];

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("CollectionsSelectionToolbar", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSelectedItems.current = [];
	});

	// ─── Empty selection ──────────────────────────────────────────────────────

	it("returns null when no items are selected", () => {
		mockSelectedItems.current = [];
		const { container } = render(
			<CollectionsSelectionToolbar collections={nonArchivedCollections} />,
		);
		expect(container.firstChild).toBeNull();
	});

	// ─── Selection count text ─────────────────────────────────────────────────

	it("shows singular count text for 1 selected item", () => {
		mockSelectedItems.current = ["1"];
		render(<CollectionsSelectionToolbar collections={nonArchivedCollections} />);
		expect(screen.getByText(/1 collection sélectionnée/)).toBeInTheDocument();
	});

	it("shows plural count text for multiple selected items", () => {
		mockSelectedItems.current = ["1", "2"];
		render(<CollectionsSelectionToolbar collections={nonArchivedCollections} />);
		expect(screen.getByText(/2 collections sélectionnées/)).toBeInTheDocument();
	});

	// ─── Non-archived: Archiver ───────────────────────────────────────────────

	it("shows 'Archiver' when all selected collections are non-archived", () => {
		mockSelectedItems.current = ["1", "2"];
		render(<CollectionsSelectionToolbar collections={nonArchivedCollections} />);
		expect(screen.getByText("Archiver")).toBeInTheDocument();
	});

	// ─── All archived: Restaurer + Supprimer ─────────────────────────────────

	it("shows 'Restaurer' when all selected collections are archived", () => {
		mockSelectedItems.current = ["1", "2"];
		render(<CollectionsSelectionToolbar collections={archivedCollections} />);
		expect(screen.getByText("Restaurer")).toBeInTheDocument();
	});

	it("shows 'Supprimer' when all selected collections are archived", () => {
		mockSelectedItems.current = ["1", "2"];
		render(<CollectionsSelectionToolbar collections={archivedCollections} />);
		expect(screen.getByText("Supprimer")).toBeInTheDocument();
	});

	it("does not show 'Archiver' when all selected collections are archived", () => {
		mockSelectedItems.current = ["1", "2"];
		render(<CollectionsSelectionToolbar collections={archivedCollections} />);
		expect(screen.queryByText("Archiver")).not.toBeInTheDocument();
	});

	// ─── All draft: Publier ───────────────────────────────────────────────────

	it("shows 'Publier' when all selected collections are DRAFT", () => {
		mockSelectedItems.current = ["1", "2"];
		render(<CollectionsSelectionToolbar collections={allDraftCollections} />);
		expect(screen.getByText("Publier")).toBeInTheDocument();
	});

	it("does not show 'Mettre en brouillon' when all selected collections are DRAFT", () => {
		mockSelectedItems.current = ["1", "2"];
		render(<CollectionsSelectionToolbar collections={allDraftCollections} />);
		expect(screen.queryByText("Mettre en brouillon")).not.toBeInTheDocument();
	});

	// ─── All public: Mettre en brouillon ──────────────────────────────────────

	it("shows 'Mettre en brouillon' when all selected collections are PUBLIC", () => {
		mockSelectedItems.current = ["1", "2"];
		render(<CollectionsSelectionToolbar collections={allPublicCollections} />);
		expect(screen.getByText("Mettre en brouillon")).toBeInTheDocument();
	});

	it("does not show 'Publier' when all selected collections are PUBLIC", () => {
		mockSelectedItems.current = ["1", "2"];
		render(<CollectionsSelectionToolbar collections={allPublicCollections} />);
		expect(screen.queryByText("Publier")).not.toBeInTheDocument();
	});

	// ─── Mixed archived/non-archived ─────────────────────────────────────────

	it("shows disabled message for mixed archived/non-archived selection", () => {
		const mixedCollections = [
			{ id: "1", name: "Col 1", status: "PUBLIC" as const, productsCount: 3 },
			{ id: "2", name: "Col 2", status: "ARCHIVED" as const, productsCount: 0 },
		];
		mockSelectedItems.current = ["1", "2"];
		render(<CollectionsSelectionToolbar collections={mixedCollections} />);
		expect(screen.getByText(/Sélection mixte/)).toBeInTheDocument();
	});

	// ─── Mixed DRAFT/PUBLIC (non-archived) ────────────────────────────────────

	it("shows both 'Publier' and 'Mettre en brouillon' for mixed DRAFT/PUBLIC", () => {
		mockSelectedItems.current = ["1", "2"];
		render(<CollectionsSelectionToolbar collections={nonArchivedCollections} />);
		expect(screen.getByText("Publier")).toBeInTheDocument();
		expect(screen.getByText("Mettre en brouillon")).toBeInTheDocument();
	});

	// ─── Click interactions ───────────────────────────────────────────────────

	it("clicking 'Archiver' opens archive dialog with correct data", async () => {
		mockSelectedItems.current = ["1", "2"];
		render(<CollectionsSelectionToolbar collections={nonArchivedCollections} />);
		await userEvent.click(screen.getByText("Archiver"));
		expect(mockOpenAlertDialog).toHaveBeenCalledWith({
			collectionIds: ["1", "2"],
			targetStatus: "ARCHIVED",
		});
	});

	it("clicking 'Restaurer' opens archive dialog with PUBLIC status", async () => {
		mockSelectedItems.current = ["1", "2"];
		render(<CollectionsSelectionToolbar collections={archivedCollections} />);
		await userEvent.click(screen.getByText("Restaurer"));
		expect(mockOpenAlertDialog).toHaveBeenCalledWith({
			collectionIds: ["1", "2"],
			targetStatus: "PUBLIC",
		});
	});

	it("clicking 'Supprimer' opens delete dialog with totalProductsCount", async () => {
		mockSelectedItems.current = ["1", "2"];
		render(<CollectionsSelectionToolbar collections={archivedCollections} />);
		await userEvent.click(screen.getByText("Supprimer"));
		expect(mockOpenAlertDialog).toHaveBeenCalledWith({
			collectionIds: ["1", "2"],
			totalProductsCount: 2, // 2 + 0
		});
	});

	it("clicking 'Publier' calls bulkChangeStatus with PUBLIC", async () => {
		mockSelectedItems.current = ["1", "2"];
		render(<CollectionsSelectionToolbar collections={allDraftCollections} />);
		await userEvent.click(screen.getByText("Publier"));
		expect(mockBulkChangeStatus).toHaveBeenCalledWith(["1", "2"], "PUBLIC");
	});

	it("clicking 'Mettre en brouillon' calls bulkChangeStatus with DRAFT", async () => {
		mockSelectedItems.current = ["1", "2"];
		render(<CollectionsSelectionToolbar collections={allPublicCollections} />);
		await userEvent.click(screen.getByText("Mettre en brouillon"));
		expect(mockBulkChangeStatus).toHaveBeenCalledWith(["1", "2"], "DRAFT");
	});
});
