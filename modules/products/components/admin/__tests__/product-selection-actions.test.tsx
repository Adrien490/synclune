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

vi.mock("../bulk-archive-products-alert-dialog", () => ({
	BULK_ARCHIVE_PRODUCTS_DIALOG_ID: "bulk-archive-products",
}));

vi.mock("../bulk-delete-products-alert-dialog", () => ({
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

vi.mock("@/shared/components/responsive-action-menu", async () => {
	const React = await import("react");
	type ActionMenuItem = {
		key: string;
		label: string;
		description?: string;
		variant?: "default" | "destructive";
		disabled?: boolean;
		hidden?: boolean;
		onSelect?: () => void;
		href?: string;
	};
	type ActionMenuSection = { key: string; label?: string; items: ActionMenuItem[] };
	return {
		ResponsiveActionMenu: ({ children }: { children: React.ReactNode }) => <>{children}</>,
		ResponsiveActionMenuTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
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
							{visible.map((item) => (
								<button
									key={item.key}
									role="menuitem"
									type="button"
									onClick={item.onSelect}
									aria-disabled={item.disabled || undefined}
									data-variant={item.variant}
								>
									{item.label}
								</button>
							))}
						</div>
					);
				})}
			</div>
		),
	};
});

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

afterEach(cleanup);

describe("ProductSelectionActions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSelectedItems.value = [];
	});

	describe("visibility", () => {
		it("returns null when no items are selected", () => {
			const { container } = renderActions([PUBLIC_PRODUCT], []);
			expect(container.firstChild).toBeNull();
		});

		it("renders the action menu when items are selected", () => {
			renderActions([PUBLIC_PRODUCT], ["prod-public"]);
			expect(screen.getByRole("menu", { name: "Actions groupées" })).toBeInTheDocument();
		});
	});

	describe("all DRAFT products selected", () => {
		it("shows 'Publier'", () => {
			renderActions([DRAFT_PRODUCT], ["prod-draft"]);
			expect(screen.getByRole("menuitem", { name: "Publier" })).toBeInTheDocument();
		});

		it("hides 'Mettre en brouillon'", () => {
			renderActions([DRAFT_PRODUCT], ["prod-draft"]);
			expect(
				screen.queryByRole("menuitem", { name: "Mettre en brouillon" }),
			).not.toBeInTheDocument();
		});

		it("shows 'Archiver'", () => {
			renderActions([DRAFT_PRODUCT], ["prod-draft"]);
			expect(screen.getByRole("menuitem", { name: "Archiver" })).toBeInTheDocument();
		});

		it("calls changeProductStatus(PUBLIC) on 'Publier' click", () => {
			renderActions([DRAFT_PRODUCT], ["prod-draft"]);
			fireEvent.click(screen.getByRole("menuitem", { name: "Publier" }));
			expect(mockChangeProductStatus).toHaveBeenCalledWith(["prod-draft"], "PUBLIC");
		});
	});

	describe("all PUBLIC products selected", () => {
		it("shows 'Mettre en brouillon'", () => {
			renderActions([PUBLIC_PRODUCT], ["prod-public"]);
			expect(screen.getByRole("menuitem", { name: "Mettre en brouillon" })).toBeInTheDocument();
		});

		it("hides 'Publier'", () => {
			renderActions([PUBLIC_PRODUCT], ["prod-public"]);
			expect(screen.queryByRole("menuitem", { name: "Publier" })).not.toBeInTheDocument();
		});

		it("shows 'Archiver'", () => {
			renderActions([PUBLIC_PRODUCT], ["prod-public"]);
			expect(screen.getByRole("menuitem", { name: "Archiver" })).toBeInTheDocument();
		});

		it("calls changeProductStatus(DRAFT) on 'Mettre en brouillon' click", () => {
			renderActions([PUBLIC_PRODUCT], ["prod-public"]);
			fireEvent.click(screen.getByRole("menuitem", { name: "Mettre en brouillon" }));
			expect(mockChangeProductStatus).toHaveBeenCalledWith(["prod-public"], "DRAFT");
		});
	});

	describe("all ARCHIVED products selected", () => {
		it("shows 'Restaurer'", () => {
			renderActions([ARCHIVED_PRODUCT], ["prod-archived"]);
			expect(screen.getByRole("menuitem", { name: "Restaurer" })).toBeInTheDocument();
		});

		it("shows 'Supprimer définitivement' as destructive", () => {
			renderActions([ARCHIVED_PRODUCT], ["prod-archived"]);
			const item = screen.getByRole("menuitem", { name: "Supprimer définitivement" });
			expect(item).toBeInTheDocument();
			expect(item).toHaveAttribute("data-variant", "destructive");
		});

		it("hides 'Archiver' and status actions", () => {
			renderActions([ARCHIVED_PRODUCT], ["prod-archived"]);
			expect(screen.queryByRole("menuitem", { name: "Archiver" })).not.toBeInTheDocument();
			expect(screen.queryByRole("menuitem", { name: "Publier" })).not.toBeInTheDocument();
			expect(
				screen.queryByRole("menuitem", { name: "Mettre en brouillon" }),
			).not.toBeInTheDocument();
		});

		it("opens bulk archive dialog with PUBLIC target on 'Restaurer' click", () => {
			renderActions([ARCHIVED_PRODUCT], ["prod-archived"]);
			fireEvent.click(screen.getByRole("menuitem", { name: "Restaurer" }));
			expect(mockOpenAlertDialog).toHaveBeenCalledWith(
				expect.objectContaining({ productIds: ["prod-archived"], targetStatus: "PUBLIC" }),
			);
		});

		it("opens bulk delete dialog on 'Supprimer définitivement' click", () => {
			renderActions([ARCHIVED_PRODUCT], ["prod-archived"]);
			fireEvent.click(screen.getByRole("menuitem", { name: "Supprimer définitivement" }));
			expect(mockOpenAlertDialog).toHaveBeenCalledWith(
				expect.objectContaining({ productIds: ["prod-archived"] }),
			);
		});
	});

	describe("mixed archived/non-archived selection", () => {
		it("shows mixed-warning disabled row", () => {
			renderActions([PUBLIC_PRODUCT, ARCHIVED_PRODUCT], ["prod-public", "prod-archived"]);
			const warning = screen.getByRole("menuitem", {
				name: "Sélection mixte archivé/non-archivé",
			});
			expect(warning).toHaveAttribute("aria-disabled", "true");
		});

		it("hides 'Archiver' and 'Restaurer'", () => {
			renderActions([PUBLIC_PRODUCT, ARCHIVED_PRODUCT], ["prod-public", "prod-archived"]);
			expect(screen.queryByRole("menuitem", { name: "Archiver" })).not.toBeInTheDocument();
			expect(screen.queryByRole("menuitem", { name: "Restaurer" })).not.toBeInTheDocument();
		});
	});

	describe("mixed DRAFT and PUBLIC selection", () => {
		it("shows both 'Publier' and 'Mettre en brouillon'", () => {
			renderActions([DRAFT_PRODUCT, PUBLIC_PRODUCT], ["prod-draft", "prod-public"]);
			expect(screen.getByRole("menuitem", { name: "Publier" })).toBeInTheDocument();
			expect(screen.getByRole("menuitem", { name: "Mettre en brouillon" })).toBeInTheDocument();
		});

		it("shows 'Archiver'", () => {
			renderActions([DRAFT_PRODUCT, PUBLIC_PRODUCT], ["prod-draft", "prod-public"]);
			expect(screen.getByRole("menuitem", { name: "Archiver" })).toBeInTheDocument();
		});
	});

	describe("bulk archive action", () => {
		it("opens bulk archive dialog with ARCHIVED target on 'Archiver' click", () => {
			renderActions([PUBLIC_PRODUCT], ["prod-public"]);
			fireEvent.click(screen.getByRole("menuitem", { name: "Archiver" }));
			expect(mockOpenAlertDialog).toHaveBeenCalledWith(
				expect.objectContaining({ productIds: ["prod-public"], targetStatus: "ARCHIVED" }),
			);
		});
	});
});
