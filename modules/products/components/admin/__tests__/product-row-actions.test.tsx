import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockOpenAlertDialog, mockOpenDialog } = vi.hoisted(() => ({
	mockOpenAlertDialog: vi.fn(),
	mockOpenDialog: vi.fn(),
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/providers/alert-dialog-store-provider", () => ({
	useAlertDialog: () => ({ open: mockOpenAlertDialog }),
}));

vi.mock("@/shared/providers/dialog-store-provider", () => ({
	useDialog: () => ({ open: mockOpenDialog }),
}));

vi.mock("./archive-product-alert-dialog", () => ({
	ARCHIVE_PRODUCT_DIALOG_ID: "archive-product",
}));

vi.mock("./change-product-status-alert-dialog", () => ({
	CHANGE_PRODUCT_STATUS_DIALOG_ID: "change-product-status",
}));

vi.mock("./delete-product-alert-dialog", () => ({
	DELETE_PRODUCT_DIALOG_ID: "delete-product",
}));

vi.mock("./duplicate-product-alert-dialog", () => ({
	DUPLICATE_PRODUCT_DIALOG_ID: "duplicate-product",
}));

vi.mock("./manage-collections-dialog", () => ({
	MANAGE_COLLECTIONS_DIALOG_ID: "manage-product-collections",
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

vi.mock("next/link", () => ({
	default: ({
		children,
		href,
		target,
		...props
	}: {
		children: React.ReactNode;
		href: string;
		target?: string;
		[key: string]: unknown;
	}) => (
		<a href={href} target={target} {...props}>
			{children}
		</a>
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
		disabled,
		variant,
		asChild,
	}: {
		children: React.ReactNode;
		onClick?: () => void;
		disabled?: boolean;
		variant?: string;
		asChild?: boolean;
	}) => {
		if (asChild) {
			return <button role="menuitem">{children}</button>;
		}
		return (
			<button role="menuitem" onClick={onClick} aria-disabled={disabled} data-variant={variant}>
				{children}
			</button>
		);
	},
	DropdownMenuSub: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	DropdownMenuSubTrigger: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="submenu-trigger">{children}</div>
	),
	DropdownMenuSubContent: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="submenu-content">{children}</div>
	),
}));

vi.mock("lucide-react", () => ({
	Archive: () => <svg data-testid="icon-archive" />,
	ArchiveRestore: () => <svg data-testid="icon-archive-restore" />,
	Copy: () => <svg data-testid="icon-copy" />,
	Eye: () => <svg data-testid="icon-eye" />,
	FilePenLine: () => <svg data-testid="icon-file-pen" />,
	FolderPlus: () => <svg data-testid="icon-folder-plus" />,
	LayoutList: () => <svg data-testid="icon-layout-list" />,
	EllipsisVertical: () => <svg data-testid="icon-ellipsis" />,
	Pencil: () => <svg data-testid="icon-pencil" />,
	Trash2: () => <svg data-testid="icon-trash" />,
}));

// ============================================================================
// COMPONENT IMPORT (after mocks)
// ============================================================================

import { ProductRowActions } from "../product-row-actions";

// ============================================================================
// HELPERS
// ============================================================================

const DEFAULT_PROPS: {
	productId: string;
	productSlug: string;
	productTitle: string;
	productStatus: "DRAFT" | "PUBLIC" | "ARCHIVED";
} = {
	productId: "prod-1",
	productSlug: "bague-lune",
	productTitle: "Bague Lune",
	productStatus: "PUBLIC",
};

function renderActions(overrides: Partial<typeof DEFAULT_PROPS> = {}) {
	return render(<ProductRowActions {...DEFAULT_PROPS} {...overrides} />);
}

// ============================================================================
// TESTS
// ============================================================================

afterEach(cleanup);

describe("ProductRowActions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ─── Rendering ────────────────────────────────────────────────────────────

	describe("rendering", () => {
		it("renders trigger button with contextual aria-label", () => {
			renderActions();
			expect(screen.getByRole("button", { name: "Actions pour Bague Lune" })).toBeInTheDocument();
		});

		it("renders common menu items for all statuses", () => {
			renderActions();
			expect(screen.getByText("Voir")).toBeInTheDocument();
			expect(screen.getByText("Modifier")).toBeInTheDocument();
			expect(screen.getByText("Dupliquer")).toBeInTheDocument();
			expect(screen.getByText("Gérer variantes")).toBeInTheDocument();
			expect(screen.getByText("Gérer collections")).toBeInTheDocument();
		});

		it("renders 'Voir' as link to product page", () => {
			renderActions();
			const link = screen.getByText("Voir").closest("a");
			expect(link).toHaveAttribute("href", "/creations/bague-lune");
			expect(link).toHaveAttribute("target", "_blank");
		});

		it("renders 'Modifier' as link to edit page", () => {
			renderActions();
			const link = screen.getByText("Modifier").closest("a");
			expect(link).toHaveAttribute("href", "/admin/catalogue/produits/bague-lune/modifier");
		});

		it("renders 'Gérer variantes' as link to variants page", () => {
			renderActions();
			const link = screen.getByText("Gérer variantes").closest("a");
			expect(link).toHaveAttribute("href", "/admin/catalogue/produits/bague-lune/variantes");
		});
	});

	// ─── Status-based conditional rendering ───────────────────────────────────

	describe("conditional rendering based on status", () => {
		it("shows 'Changer statut' submenu for PUBLIC products", () => {
			renderActions({ productStatus: "PUBLIC" });
			expect(screen.getByText("Changer statut")).toBeInTheDocument();
		});

		it("shows 'Changer statut' submenu for DRAFT products", () => {
			renderActions({ productStatus: "DRAFT" });
			expect(screen.getByText("Changer statut")).toBeInTheDocument();
		});

		it("shows 'Archiver' for non-archived products", () => {
			renderActions({ productStatus: "PUBLIC" });
			expect(screen.getByText("Archiver")).toBeInTheDocument();
		});

		it("shows 'Restaurer' for archived products", () => {
			renderActions({ productStatus: "ARCHIVED" });
			expect(screen.getByText("Restaurer")).toBeInTheDocument();
		});

		it("shows 'Supprimer' for archived products", () => {
			renderActions({ productStatus: "ARCHIVED" });
			expect(screen.getByText("Supprimer")).toBeInTheDocument();
		});

		it("does not show 'Changer statut' for archived products", () => {
			renderActions({ productStatus: "ARCHIVED" });
			expect(screen.queryByText("Changer statut")).not.toBeInTheDocument();
		});

		it("does not show 'Archiver' for archived products", () => {
			renderActions({ productStatus: "ARCHIVED" });
			expect(screen.queryByText("Archiver")).not.toBeInTheDocument();
		});

		it("does not show 'Restaurer' for non-archived products", () => {
			renderActions({ productStatus: "PUBLIC" });
			expect(screen.queryByText("Restaurer")).not.toBeInTheDocument();
		});

		it("does not show 'Supprimer' for non-archived products", () => {
			renderActions({ productStatus: "PUBLIC" });
			expect(screen.queryByText("Supprimer")).not.toBeInTheDocument();
		});
	});

	// ─── Status submenu options ────────────────────────────────────────────────

	describe("status submenu", () => {
		it("shows 'Brouillon' and 'Public' options in submenu", () => {
			renderActions({ productStatus: "PUBLIC" });
			expect(screen.getByText("Brouillon")).toBeInTheDocument();
			expect(screen.getByText("Public")).toBeInTheDocument();
		});

		it("disables 'Public' option when product is already PUBLIC", () => {
			renderActions({ productStatus: "PUBLIC" });
			const publicItem = screen.getByText("Public").closest("[role='menuitem']");
			expect(publicItem).toHaveAttribute("aria-disabled", "true");
		});

		it("disables 'Brouillon' option when product is already DRAFT", () => {
			renderActions({ productStatus: "DRAFT" });
			const draftItem = screen.getByText("Brouillon").closest("[role='menuitem']");
			expect(draftItem).toHaveAttribute("aria-disabled", "true");
		});

		it("enables 'Brouillon' option when product is PUBLIC", () => {
			renderActions({ productStatus: "PUBLIC" });
			const draftItem = screen.getByText("Brouillon").closest("[role='menuitem']");
			expect(draftItem).not.toHaveAttribute("aria-disabled", "true");
		});
	});

	// ─── Interactions ─────────────────────────────────────────────────────────

	describe("interactions", () => {
		it("opens duplicate dialog on 'Dupliquer' click", () => {
			renderActions();
			fireEvent.click(screen.getByText("Dupliquer"));
			expect(mockOpenAlertDialog).toHaveBeenCalledWith(
				expect.objectContaining({ productId: "prod-1", productTitle: "Bague Lune" }),
			);
		});

		it("opens collections dialog on 'Gérer collections' click", () => {
			renderActions();
			fireEvent.click(screen.getByText("Gérer collections"));
			expect(mockOpenDialog).toHaveBeenCalledWith(
				expect.objectContaining({ productId: "prod-1", productTitle: "Bague Lune" }),
			);
		});

		it("opens archive dialog on 'Archiver' click for PUBLIC product", () => {
			renderActions({ productStatus: "PUBLIC" });
			fireEvent.click(screen.getByText("Archiver"));
			expect(mockOpenAlertDialog).toHaveBeenCalledWith(
				expect.objectContaining({ productId: "prod-1", productStatus: "PUBLIC" }),
			);
		});

		it("opens archive dialog on 'Restaurer' click for ARCHIVED product", () => {
			renderActions({ productStatus: "ARCHIVED" });
			fireEvent.click(screen.getByText("Restaurer"));
			expect(mockOpenAlertDialog).toHaveBeenCalledWith(
				expect.objectContaining({ productId: "prod-1", productStatus: "ARCHIVED" }),
			);
		});

		it("opens delete dialog on 'Supprimer' click for ARCHIVED product", () => {
			renderActions({ productStatus: "ARCHIVED" });
			fireEvent.click(screen.getByText("Supprimer"));
			expect(mockOpenAlertDialog).toHaveBeenCalledWith(
				expect.objectContaining({ productId: "prod-1", productTitle: "Bague Lune" }),
			);
		});

		it("opens change-status dialog when clicking 'Brouillon'", () => {
			renderActions({ productStatus: "PUBLIC" });
			fireEvent.click(screen.getByText("Brouillon"));
			expect(mockOpenAlertDialog).toHaveBeenCalledWith(
				expect.objectContaining({
					productId: "prod-1",
					currentStatus: "PUBLIC",
					targetStatus: "DRAFT",
				}),
			);
		});

		it("opens change-status dialog when clicking 'Public'", () => {
			renderActions({ productStatus: "DRAFT" });
			fireEvent.click(screen.getByText("Public"));
			expect(mockOpenAlertDialog).toHaveBeenCalledWith(
				expect.objectContaining({
					productId: "prod-1",
					currentStatus: "DRAFT",
					targetStatus: "PUBLIC",
				}),
			);
		});
	});

	// ─── Accessibility ────────────────────────────────────────────────────────

	describe("accessibility", () => {
		it("has accessible trigger button with product-specific aria-label", () => {
			renderActions({ productTitle: "Collier Étoile" });
			expect(
				screen.getByRole("button", { name: "Actions pour Collier Étoile" }),
			).toBeInTheDocument();
		});

		it("renders separator between common and conditional actions", () => {
			renderActions();
			expect(screen.getAllByTestId("dropdown-separator").length).toBeGreaterThanOrEqual(1);
		});
	});
});
