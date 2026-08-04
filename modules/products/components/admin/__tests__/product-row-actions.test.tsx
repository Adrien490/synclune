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

vi.mock("../archive-product-alert-dialog", () => ({
	ARCHIVE_PRODUCT_DIALOG_ID: "archive-product",
}));

vi.mock("../change-product-status-alert-dialog", () => ({
	CHANGE_PRODUCT_STATUS_DIALOG_ID: "change-product-status",
}));

vi.mock("../delete-product-alert-dialog", () => ({
	DELETE_PRODUCT_DIALOG_ID: "delete-product",
}));

vi.mock("../duplicate-product-alert-dialog", () => ({
	DUPLICATE_PRODUCT_DIALOG_ID: "duplicate-product",
}));

vi.mock("../manage-collections-dialog", () => ({
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

// Flatten the ResponsiveActionMenu to render every section in an
// always-visible list so tests can query items without opening a drawer.
vi.mock("@/shared/components/responsive-action-menu", async () => {
	const React = await import("react");
	type ActionMenuItem = {
		key: string;
		label: string;
		description?: string;
		icon?: React.ComponentType<{ className?: string }>;
		variant?: "default" | "destructive";
		disabled?: boolean;
		hidden?: boolean;
		onSelect?: () => void;
		href?: string;
		external?: boolean;
	};
	type ActionMenuSection = {
		key: string;
		label?: string;
		items: ActionMenuItem[];
	};
	return {
		ResponsiveActionMenu: ({ children }: { children: React.ReactNode }) => <>{children}</>,
		ResponsiveActionMenuTrigger: ({
			render,
			children,
		}: {
			render?: React.ReactElement;
			children?: React.ReactNode;
		}) =>
			React.isValidElement(render) ? (
				React.cloneElement(render, undefined, children)
			) : (
				<>{children}</>
			),
		ResponsiveActionMenuContent: ({
			title,
			sections,
		}: {
			title: string;
			sections: ActionMenuSection[];
		}) => (
			<div role="menu" aria-label={title}>
				{sections.map((section) => {
					const visible = section.items.filter((it) => !it.hidden);
					if (visible.length === 0) return null;
					return (
						<div key={section.key} data-section={section.key}>
							{section.label ? <p data-testid={`section-${section.key}`}>{section.label}</p> : null}
							{visible.map((item) =>
								item.href ? (
									<a
										key={item.key}
										role="menuitem"
										href={item.href}
										target={item.external ? "_blank" : undefined}
										data-variant={item.variant}
									>
										{item.label}
									</a>
								) : (
									<button
										key={item.key}
										role="menuitem"
										type="button"
										onClick={item.onSelect}
										aria-disabled={item.disabled === true ? true : undefined}
										data-variant={item.variant}
									>
										{item.label}
									</button>
								),
							)}
						</div>
					);
				})}
			</div>
		),
	};
});

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

vi.mock("lucide-react", () => ({
	Archive: () => <svg data-testid="icon-archive" />,
	ArchiveRestore: () => <svg data-testid="icon-archive-restore" />,
	Copy: () => <svg data-testid="icon-copy" />,
	EllipsisVertical: () => <svg data-testid="icon-ellipsis" />,
	Eye: () => <svg data-testid="icon-eye" />,
	FolderPlus: () => <svg data-testid="icon-folder-plus" />,
	LayoutList: () => <svg data-testid="icon-layout-list" />,
	Pencil: () => <svg data-testid="icon-pencil" />,
	Trash2: () => <svg data-testid="icon-trash" />,
	Upload: () => <svg data-testid="icon-upload" />,
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

	describe("rendering", () => {
		it("renders trigger button with contextual aria-label", () => {
			renderActions();
			expect(screen.getByRole("button", { name: "Actions pour Bague Lune" })).toBeInTheDocument();
		});

		it("renders common menu items for all statuses", () => {
			renderActions();
			expect(screen.getByText("Voir la fiche")).toBeInTheDocument();
			expect(screen.getByText("Modifier")).toBeInTheDocument();
			expect(screen.getByText("Dupliquer")).toBeInTheDocument();
			expect(screen.getByText("Gérer variantes")).toBeInTheDocument();
			expect(screen.getByText("Gérer collections")).toBeInTheDocument();
		});

		it("renders 'Voir la fiche' as external link to product page", () => {
			renderActions();
			const link = screen.getByRole("menuitem", { name: "Voir la fiche" });
			expect(link).toHaveAttribute("href", "/creations/bague-lune");
			expect(link).toHaveAttribute("target", "_blank");
		});

		it("renders 'Modifier' as link to edit page", () => {
			renderActions();
			expect(screen.getByRole("menuitem", { name: "Modifier" })).toHaveAttribute(
				"href",
				"/admin/catalogue/produits/bague-lune/modifier",
			);
		});

		it("renders 'Gérer variantes' as link to variants page", () => {
			renderActions();
			expect(screen.getByRole("menuitem", { name: "Gérer variantes" })).toHaveAttribute(
				"href",
				"/admin/catalogue/produits/bague-lune/variantes",
			);
		});
	});

	describe("conditional rendering based on status", () => {
		it("shows status actions for PUBLIC products", () => {
			renderActions({ productStatus: "PUBLIC" });
			expect(screen.getByText("Marquer comme brouillon")).toBeInTheDocument();
			expect(screen.getByText("Publier")).toBeInTheDocument();
		});

		it("shows status actions for DRAFT products", () => {
			renderActions({ productStatus: "DRAFT" });
			expect(screen.getByText("Marquer comme brouillon")).toBeInTheDocument();
			expect(screen.getByText("Publier")).toBeInTheDocument();
		});

		it("shows 'Archiver' for non-archived products", () => {
			renderActions({ productStatus: "PUBLIC" });
			expect(screen.getByRole("menuitem", { name: "Archiver" })).toBeInTheDocument();
		});

		it("shows 'Restaurer' for archived products", () => {
			renderActions({ productStatus: "ARCHIVED" });
			expect(screen.getByRole("menuitem", { name: "Restaurer" })).toBeInTheDocument();
		});

		it("shows 'Supprimer définitivement' for archived products", () => {
			renderActions({ productStatus: "ARCHIVED" });
			const item = screen.getByRole("menuitem", { name: "Supprimer définitivement" });
			expect(item).toBeInTheDocument();
			expect(item).toHaveAttribute("data-variant", "destructive");
		});

		it("hides status actions for archived products", () => {
			renderActions({ productStatus: "ARCHIVED" });
			expect(screen.queryByText("Marquer comme brouillon")).not.toBeInTheDocument();
			expect(screen.queryByText("Publier")).not.toBeInTheDocument();
		});

		it("hides 'Archiver' for archived products", () => {
			renderActions({ productStatus: "ARCHIVED" });
			expect(screen.queryByRole("menuitem", { name: "Archiver" })).not.toBeInTheDocument();
		});

		it("hides 'Restaurer' for non-archived products", () => {
			renderActions({ productStatus: "PUBLIC" });
			expect(screen.queryByRole("menuitem", { name: "Restaurer" })).not.toBeInTheDocument();
		});

		it("hides 'Supprimer définitivement' for non-archived products", () => {
			renderActions({ productStatus: "PUBLIC" });
			expect(
				screen.queryByRole("menuitem", { name: "Supprimer définitivement" }),
			).not.toBeInTheDocument();
		});
	});

	describe("status actions disabled state", () => {
		it("disables 'Publier' when product is already PUBLIC", () => {
			renderActions({ productStatus: "PUBLIC" });
			expect(screen.getByRole("menuitem", { name: "Publier" })).toHaveAttribute(
				"aria-disabled",
				"true",
			);
		});

		it("disables 'Marquer comme brouillon' when product is already DRAFT", () => {
			renderActions({ productStatus: "DRAFT" });
			expect(screen.getByRole("menuitem", { name: "Marquer comme brouillon" })).toHaveAttribute(
				"aria-disabled",
				"true",
			);
		});

		it("enables 'Marquer comme brouillon' when product is PUBLIC", () => {
			renderActions({ productStatus: "PUBLIC" });
			expect(screen.getByRole("menuitem", { name: "Marquer comme brouillon" })).not.toHaveAttribute(
				"aria-disabled",
				"true",
			);
		});
	});

	describe("interactions", () => {
		it("opens duplicate dialog on 'Dupliquer' click", () => {
			renderActions();
			fireEvent.click(screen.getByRole("menuitem", { name: "Dupliquer" }));
			expect(mockOpenAlertDialog).toHaveBeenCalledWith(
				expect.objectContaining({ productId: "prod-1", productTitle: "Bague Lune" }),
			);
		});

		it("opens collections dialog on 'Gérer collections' click", () => {
			renderActions();
			fireEvent.click(screen.getByRole("menuitem", { name: "Gérer collections" }));
			expect(mockOpenDialog).toHaveBeenCalledWith(
				expect.objectContaining({ productId: "prod-1", productTitle: "Bague Lune" }),
			);
		});

		it("opens archive dialog on 'Archiver' click for PUBLIC product", () => {
			renderActions({ productStatus: "PUBLIC" });
			fireEvent.click(screen.getByRole("menuitem", { name: "Archiver" }));
			expect(mockOpenAlertDialog).toHaveBeenCalledWith(
				expect.objectContaining({ productId: "prod-1", productStatus: "PUBLIC" }),
			);
		});

		it("opens archive dialog on 'Restaurer' click for ARCHIVED product", () => {
			renderActions({ productStatus: "ARCHIVED" });
			fireEvent.click(screen.getByRole("menuitem", { name: "Restaurer" }));
			expect(mockOpenAlertDialog).toHaveBeenCalledWith(
				expect.objectContaining({ productId: "prod-1", productStatus: "ARCHIVED" }),
			);
		});

		it("opens delete dialog on 'Supprimer définitivement' click for ARCHIVED product", () => {
			renderActions({ productStatus: "ARCHIVED" });
			fireEvent.click(screen.getByRole("menuitem", { name: "Supprimer définitivement" }));
			expect(mockOpenAlertDialog).toHaveBeenCalledWith(
				expect.objectContaining({ productId: "prod-1", productTitle: "Bague Lune" }),
			);
		});

		it("opens change-status dialog when clicking 'Marquer comme brouillon'", () => {
			renderActions({ productStatus: "PUBLIC" });
			fireEvent.click(screen.getByRole("menuitem", { name: "Marquer comme brouillon" }));
			expect(mockOpenAlertDialog).toHaveBeenCalledWith(
				expect.objectContaining({
					productId: "prod-1",
					currentStatus: "PUBLIC",
					targetStatus: "DRAFT",
				}),
			);
		});

		it("opens change-status dialog when clicking 'Publier'", () => {
			renderActions({ productStatus: "DRAFT" });
			fireEvent.click(screen.getByRole("menuitem", { name: "Publier" }));
			expect(mockOpenAlertDialog).toHaveBeenCalledWith(
				expect.objectContaining({
					productId: "prod-1",
					currentStatus: "DRAFT",
					targetStatus: "PUBLIC",
				}),
			);
		});
	});

	describe("accessibility", () => {
		it("has accessible trigger button with product-specific aria-label", () => {
			renderActions({ productTitle: "Collier Étoile" });
			expect(
				screen.getByRole("button", { name: "Actions pour Collier Étoile" }),
			).toBeInTheDocument();
		});

		it("groups status items under 'Statut' section heading", () => {
			renderActions({ productStatus: "PUBLIC" });
			expect(screen.getByTestId("section-status")).toHaveTextContent("Statut");
		});
	});
});
