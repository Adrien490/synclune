import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockSelectedItems, mockClearSelection, mockBulkDeleteDialog, mockToggle } = vi.hoisted(
	() => ({
		mockSelectedItems: { value: [] as string[] },
		mockClearSelection: vi.fn(),
		mockBulkDeleteDialog: { isOpen: false, data: null, open: vi.fn(), close: vi.fn() },
		mockToggle: vi.fn(),
	}),
);

vi.mock("@/shared/contexts/selection-context", () => ({
	useSelectionContext: () => ({
		selectedItems: mockSelectedItems.value,
		clearSelection: mockClearSelection,
	}),
}));

vi.mock("@/shared/providers/alert-dialog-store-provider", () => ({
	useAlertDialog: () => mockBulkDeleteDialog,
}));

vi.mock("@/modules/discounts/hooks/use-bulk-toggle-discount-status", () => ({
	useBulkToggleDiscountStatus: () => ({ toggle: mockToggle, isPending: false }),
}));

vi.mock("@/modules/discounts/components/admin/bulk-delete-discounts-alert-dialog", () => ({
	BULK_DELETE_DISCOUNTS_DIALOG_ID: "bulk-delete-discounts",
}));

vi.mock("@/shared/components/selection-toolbar", () => ({
	SelectionToolbar: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="selection-toolbar">{children}</div>
	),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		disabled,
		...rest
	}: {
		children: React.ReactNode;
		disabled?: boolean;
		[key: string]: unknown;
	}) => (
		<button disabled={disabled} {...rest}>
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
	EllipsisVertical: () => <svg data-testid="icon-ellipsis" />,
	Trash2: () => <svg data-testid="icon-trash" />,
	Power: () => <svg data-testid="icon-power" />,
	PowerOff: () => <svg data-testid="icon-power-off" />,
}));

vi.mock("sonner", () => ({
	toast: { error: vi.fn() },
}));

import { DiscountsSelectionToolbar } from "../discounts-selection-toolbar";

const defaultDiscounts = [
	{ id: "d-1", code: "PROMO10", usageCount: 0 },
	{ id: "d-2", code: "ETE25", usageCount: 2 },
];

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("DiscountsSelectionToolbar", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSelectedItems.value = [];
	});

	// ─── Visibility ───────────────────────────────────────────────────────────

	it("returns null when no items are selected", () => {
		mockSelectedItems.value = [];
		const { container } = render(
			<DiscountsSelectionToolbar discountIds={["d-1", "d-2"]} discounts={defaultDiscounts} />,
		);
		expect(container.firstChild).toBeNull();
	});

	it("renders toolbar when items are selected", () => {
		mockSelectedItems.value = ["d-1"];
		render(<DiscountsSelectionToolbar discountIds={["d-1", "d-2"]} discounts={defaultDiscounts} />);
		expect(screen.getByTestId("selection-toolbar")).toBeInTheDocument();
	});

	// ─── Count display ────────────────────────────────────────────────────────

	it("shows singular 'code promo sélectionné' for 1 item", () => {
		mockSelectedItems.value = ["d-1"];
		render(<DiscountsSelectionToolbar discountIds={["d-1", "d-2"]} discounts={defaultDiscounts} />);
		expect(screen.getByText(/1 code promo sélectionné$/)).toBeInTheDocument();
	});

	it("shows plural 'codes promo sélectionnés' for multiple items", () => {
		mockSelectedItems.value = ["d-1", "d-2"];
		render(<DiscountsSelectionToolbar discountIds={["d-1", "d-2"]} discounts={defaultDiscounts} />);
		expect(screen.getByText(/2 codes promo sélectionnés/)).toBeInTheDocument();
	});

	// ─── Menu items ───────────────────────────────────────────────────────────

	it("shows 'Activer' menu item", () => {
		mockSelectedItems.value = ["d-1"];
		render(<DiscountsSelectionToolbar discountIds={["d-1", "d-2"]} discounts={defaultDiscounts} />);
		expect(screen.getByText("Activer")).toBeInTheDocument();
	});

	it("shows 'Désactiver' menu item", () => {
		mockSelectedItems.value = ["d-1"];
		render(<DiscountsSelectionToolbar discountIds={["d-1", "d-2"]} discounts={defaultDiscounts} />);
		expect(screen.getByText("Désactiver")).toBeInTheDocument();
	});

	it("shows 'Supprimer' menu item", () => {
		mockSelectedItems.value = ["d-1"];
		render(<DiscountsSelectionToolbar discountIds={["d-1", "d-2"]} discounts={defaultDiscounts} />);
		expect(screen.getByText("Supprimer")).toBeInTheDocument();
	});

	it("shows sr-only text 'Ouvrir le menu'", () => {
		mockSelectedItems.value = ["d-1"];
		render(<DiscountsSelectionToolbar discountIds={["d-1", "d-2"]} discounts={defaultDiscounts} />);
		expect(screen.getByText("Ouvrir le menu")).toBeInTheDocument();
	});

	// ─── Click interactions ───────────────────────────────────────────────────

	it("clicking 'Activer' calls toggle with selected items and true", async () => {
		mockSelectedItems.value = ["d-1", "d-2"];
		render(<DiscountsSelectionToolbar discountIds={["d-1", "d-2"]} discounts={defaultDiscounts} />);
		await userEvent.click(screen.getByText("Activer"));
		expect(mockToggle).toHaveBeenCalledWith(["d-1", "d-2"], true);
	});

	it("clicking 'Désactiver' calls toggle with selected items and false", async () => {
		mockSelectedItems.value = ["d-1", "d-2"];
		render(<DiscountsSelectionToolbar discountIds={["d-1", "d-2"]} discounts={defaultDiscounts} />);
		await userEvent.click(screen.getByText("Désactiver"));
		expect(mockToggle).toHaveBeenCalledWith(["d-1", "d-2"], false);
	});

	it("clicking 'Supprimer' opens delete dialog", async () => {
		mockSelectedItems.value = ["d-1"];
		render(<DiscountsSelectionToolbar discountIds={["d-1", "d-2"]} discounts={defaultDiscounts} />);
		await userEvent.click(screen.getByText("Supprimer"));
		expect(mockBulkDeleteDialog.open).toHaveBeenCalled();
	});

	it("'Supprimer' has destructive variant", () => {
		mockSelectedItems.value = ["d-1"];
		render(<DiscountsSelectionToolbar discountIds={["d-1", "d-2"]} discounts={defaultDiscounts} />);
		const deleteBtn = screen.getByText("Supprimer").closest("button");
		expect(deleteBtn).toHaveAttribute("data-variant", "destructive");
	});
});
