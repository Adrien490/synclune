import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockSelectedItems, mockClearSelection, mockOpenAlertDialog, mockChangeProductStatus } =
	vi.hoisted(() => ({
		mockSelectedItems: { value: [] as string[] },
		mockClearSelection: vi.fn(),
		mockOpenAlertDialog: vi.fn(),
		mockChangeProductStatus: vi.fn(),
	}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/contexts/selection-context", () => ({
	useSelectionContext: () => ({
		selectedItems: mockSelectedItems.value,
		clearSelection: mockClearSelection,
	}),
}));

vi.mock("@/shared/providers/alert-dialog-store-provider", () => ({
	useAlertDialog: () => ({ open: mockOpenAlertDialog }),
}));

vi.mock("@/modules/products/hooks/use-bulk-change-product-status", () => ({
	useBulkChangeProductStatus: ({ onSuccess }: { onSuccess: () => void }) => ({
		changeProductStatus: (ids: string[], status: string) => {
			mockChangeProductStatus(ids, status);
			onSuccess();
		},
		isPending: false,
	}),
}));

vi.mock("./bulk-archive-products-alert-dialog", () => ({
	BULK_ARCHIVE_PRODUCTS_DIALOG_ID: "bulk-archive-products",
}));

vi.mock("./bulk-delete-products-alert-dialog", () => ({
	BULK_DELETE_PRODUCTS_DIALOG_ID: "bulk-delete-products",
}));

vi.mock("stripe", () => ({
	default: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: {},
	notDeleted: {},
	softDelete: {},
}));

vi.mock("@/modules/auth/lib/auth", () => ({
	auth: {},
}));

vi.mock("@/modules/auth/lib/get-current-session", () => ({
	getSession: vi.fn(),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({ children, ...rest }: { children: React.ReactNode; [key: string]: unknown }) => (
		<button {...rest}>{children}</button>
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
		variant,
		disabled,
		className,
	}: {
		children: React.ReactNode;
		onClick?: () => void;
		variant?: string;
		disabled?: boolean;
		className?: string;
	}) => (
		<button
			role="menuitem"
			onClick={onClick}
			data-variant={variant}
			aria-disabled={disabled}
			className={className}
		>
			{children}
		</button>
	),
}));

vi.mock("lucide-react", () => ({
	Archive: () => <svg data-testid="icon-archive" />,
	ArchiveRestore: () => <svg data-testid="icon-archive-restore" />,
	FilePenLine: () => <svg data-testid="icon-file-pen" />,
	Globe: () => <svg data-testid="icon-globe" />,
	EllipsisVertical: () => <svg data-testid="icon-ellipsis" />,
	Trash2: () => <svg data-testid="icon-trash" />,
}));

vi.mock("sonner", () => ({
	toast: { error: vi.fn() },
}));

// ============================================================================
// COMPONENT IMPORT (after mocks)
// ============================================================================

import { ProductSelectionActions } from "../product-selection-actions";

// ============================================================================
// HELPERS
// ============================================================================

const DRAFT_PRODUCT = { id: "prod-draft", status: "DRAFT" as const };
const PUBLIC_PRODUCT = { id: "prod-public", status: "PUBLIC" as const };
const ARCHIVED_PRODUCT = { id: "prod-archived", status: "ARCHIVED" as const };

function renderActions(
	products: Array<{ id: string; status: "DRAFT" | "PUBLIC" | "ARCHIVED" }>,
	selectedIds: string[] = [],
) {
	mockSelectedItems.value = selectedIds;
	return render(<ProductSelectionActions products={products} />);
}

// ============================================================================
// TESTS
// ============================================================================

afterEach(cleanup);

describe("ProductSelectionActions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSelectedItems.value = [];
	});

	// ─── Visibility ───────────────────────────────────────────────────────────

	describe("visibility", () => {
		it("returns null when no items are selected", () => {
			const { container } = renderActions([PUBLIC_PRODUCT], []);
			expect(container.firstChild).toBeNull();
		});

		it("renders when items are selected", () => {
			renderActions([PUBLIC_PRODUCT], ["prod-public"]);
			expect(screen.getByTestId("dropdown-trigger")).toBeInTheDocument();
		});

		it("shows sr-only 'Ouvrir le menu' text", () => {
			renderActions([PUBLIC_PRODUCT], ["prod-public"]);
			expect(screen.getByText("Ouvrir le menu")).toBeInTheDocument();
		});
	});

	// ─── All DRAFT selected ───────────────────────────────────────────────────

	describe("all DRAFT products selected", () => {
		it("shows 'Publier' menu item", () => {
			renderActions([DRAFT_PRODUCT], ["prod-draft"]);
			expect(screen.getByText("Publier")).toBeInTheDocument();
		});

		it("does not show 'Mettre en brouillon'", () => {
			renderActions([DRAFT_PRODUCT], ["prod-draft"]);
			expect(screen.queryByText("Mettre en brouillon")).not.toBeInTheDocument();
		});

		it("shows 'Archiver' menu item", () => {
			renderActions([DRAFT_PRODUCT], ["prod-draft"]);
			expect(screen.getByText("Archiver")).toBeInTheDocument();
		});

		it("calls changeProductStatus with PUBLIC on 'Publier' click", () => {
			renderActions([DRAFT_PRODUCT], ["prod-draft"]);
			fireEvent.click(screen.getByText("Publier"));
			expect(mockChangeProductStatus).toHaveBeenCalledWith(["prod-draft"], "PUBLIC");
		});
	});

	// ─── All PUBLIC selected ──────────────────────────────────────────────────

	describe("all PUBLIC products selected", () => {
		it("shows 'Mettre en brouillon' menu item", () => {
			renderActions([PUBLIC_PRODUCT], ["prod-public"]);
			expect(screen.getByText("Mettre en brouillon")).toBeInTheDocument();
		});

		it("does not show 'Publier'", () => {
			renderActions([PUBLIC_PRODUCT], ["prod-public"]);
			expect(screen.queryByText("Publier")).not.toBeInTheDocument();
		});

		it("shows 'Archiver' menu item", () => {
			renderActions([PUBLIC_PRODUCT], ["prod-public"]);
			expect(screen.getByText("Archiver")).toBeInTheDocument();
		});

		it("calls changeProductStatus with DRAFT on 'Mettre en brouillon' click", () => {
			renderActions([PUBLIC_PRODUCT], ["prod-public"]);
			fireEvent.click(screen.getByText("Mettre en brouillon"));
			expect(mockChangeProductStatus).toHaveBeenCalledWith(["prod-public"], "DRAFT");
		});
	});

	// ─── All ARCHIVED selected ────────────────────────────────────────────────

	describe("all ARCHIVED products selected", () => {
		it("shows 'Restaurer' menu item", () => {
			renderActions([ARCHIVED_PRODUCT], ["prod-archived"]);
			expect(screen.getByText("Restaurer")).toBeInTheDocument();
		});

		it("shows 'Supprimer' menu item", () => {
			renderActions([ARCHIVED_PRODUCT], ["prod-archived"]);
			expect(screen.getByText("Supprimer")).toBeInTheDocument();
		});

		it("does not show 'Archiver'", () => {
			renderActions([ARCHIVED_PRODUCT], ["prod-archived"]);
			expect(screen.queryByText("Archiver")).not.toBeInTheDocument();
		});

		it("does not show 'Publier' or 'Mettre en brouillon'", () => {
			renderActions([ARCHIVED_PRODUCT], ["prod-archived"]);
			expect(screen.queryByText("Publier")).not.toBeInTheDocument();
			expect(screen.queryByText("Mettre en brouillon")).not.toBeInTheDocument();
		});

		it("opens bulk archive dialog with PUBLIC target on 'Restaurer' click", () => {
			renderActions([ARCHIVED_PRODUCT], ["prod-archived"]);
			fireEvent.click(screen.getByText("Restaurer"));
			expect(mockOpenAlertDialog).toHaveBeenCalledWith(
				expect.objectContaining({ productIds: ["prod-archived"], targetStatus: "PUBLIC" }),
			);
		});

		it("opens bulk delete dialog on 'Supprimer' click", () => {
			renderActions([ARCHIVED_PRODUCT], ["prod-archived"]);
			fireEvent.click(screen.getByText("Supprimer"));
			expect(mockOpenAlertDialog).toHaveBeenCalledWith(
				expect.objectContaining({ productIds: ["prod-archived"] }),
			);
		});
	});

	// ─── Mixed status (some archived, some not) ────────────────────────────────

	describe("mixed archived/non-archived selection", () => {
		it("shows 'Sélection mixte' message", () => {
			renderActions([PUBLIC_PRODUCT, ARCHIVED_PRODUCT], ["prod-public", "prod-archived"]);
			expect(screen.getByText("Sélection mixte archivé/non-archivé")).toBeInTheDocument();
		});

		it("does not show 'Archiver' or 'Restaurer'", () => {
			renderActions([PUBLIC_PRODUCT, ARCHIVED_PRODUCT], ["prod-public", "prod-archived"]);
			expect(screen.queryByText("Archiver")).not.toBeInTheDocument();
			expect(screen.queryByText("Restaurer")).not.toBeInTheDocument();
		});
	});

	// ─── Mixed non-archived (draft + public) ──────────────────────────────────

	describe("mixed DRAFT and PUBLIC selection", () => {
		it("shows both 'Publier' and 'Mettre en brouillon'", () => {
			renderActions([DRAFT_PRODUCT, PUBLIC_PRODUCT], ["prod-draft", "prod-public"]);
			expect(screen.getByText("Publier")).toBeInTheDocument();
			expect(screen.getByText("Mettre en brouillon")).toBeInTheDocument();
		});

		it("shows 'Archiver'", () => {
			renderActions([DRAFT_PRODUCT, PUBLIC_PRODUCT], ["prod-draft", "prod-public"]);
			expect(screen.getByText("Archiver")).toBeInTheDocument();
		});
	});

	// ─── Bulk archive action ───────────────────────────────────────────────────

	describe("bulk archive action", () => {
		it("opens bulk archive dialog with ARCHIVED target on 'Archiver' click", () => {
			renderActions([PUBLIC_PRODUCT], ["prod-public"]);
			fireEvent.click(screen.getByText("Archiver"));
			expect(mockOpenAlertDialog).toHaveBeenCalledWith(
				expect.objectContaining({ productIds: ["prod-public"], targetStatus: "ARCHIVED" }),
			);
		});
	});
});
