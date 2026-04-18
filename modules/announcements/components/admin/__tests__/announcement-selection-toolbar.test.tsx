import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockSelectedItems, mockBulkDeleteDialog, mockHaptic } = vi.hoisted(() => ({
	mockSelectedItems: { value: [] as string[] },
	mockBulkDeleteDialog: { isOpen: false, data: null, open: vi.fn(), close: vi.fn() },
	mockHaptic: vi.fn(),
}));

vi.mock("@/shared/hooks/use-haptic", () => ({
	useHaptic: () => mockHaptic,
	triggerHaptic: mockHaptic,
}));

vi.mock("@/shared/contexts/selection-context", () => ({
	useSelectionContext: () => ({
		selectedItems: mockSelectedItems.value,
		clearSelection: vi.fn(),
	}),
}));

vi.mock("@/shared/providers/alert-dialog-store-provider", () => ({
	useAlertDialog: () => mockBulkDeleteDialog,
}));

vi.mock("../bulk-delete-announcements-alert-dialog", () => ({
	BULK_DELETE_ANNOUNCEMENTS_DIALOG_ID: "bulk-delete-announcements",
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
}));

vi.mock("sonner", () => ({
	toast: { error: vi.fn() },
}));

import { AnnouncementSelectionToolbar } from "../announcement-selection-toolbar";

const ids = ["a-1", "a-2"];

afterEach(cleanup);

describe("AnnouncementSelectionToolbar", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSelectedItems.value = [];
	});

	it("returns null when no items are selected", () => {
		mockSelectedItems.value = [];
		const { container } = render(<AnnouncementSelectionToolbar announcementIds={ids} />);
		expect(container.firstChild).toBeNull();
	});

	it("renders toolbar when items are selected", () => {
		mockSelectedItems.value = ["a-1"];
		render(<AnnouncementSelectionToolbar announcementIds={ids} />);
		expect(screen.getByTestId("selection-toolbar")).toBeInTheDocument();
	});

	it("shows singular label for 1 item", () => {
		mockSelectedItems.value = ["a-1"];
		render(<AnnouncementSelectionToolbar announcementIds={ids} />);
		expect(screen.getByText(/1 annonce sélectionnée$/)).toBeInTheDocument();
	});

	it("shows plural label for multiple items", () => {
		mockSelectedItems.value = ["a-1", "a-2"];
		render(<AnnouncementSelectionToolbar announcementIds={ids} />);
		expect(screen.getByText(/2 annonces sélectionnées/)).toBeInTheDocument();
	});

	it("shows 'Supprimer' menu item", () => {
		mockSelectedItems.value = ["a-1"];
		render(<AnnouncementSelectionToolbar announcementIds={ids} />);
		expect(screen.getByText("Supprimer")).toBeInTheDocument();
	});

	it("clicking 'Supprimer' opens bulk delete dialog with selected ids", async () => {
		mockSelectedItems.value = ["a-1", "a-2"];
		render(<AnnouncementSelectionToolbar announcementIds={ids} />);
		await userEvent.click(screen.getByText("Supprimer"));
		expect(mockBulkDeleteDialog.open).toHaveBeenCalledWith({
			announcementIds: ["a-1", "a-2"],
		});
	});

	it("'Supprimer' has destructive variant", () => {
		mockSelectedItems.value = ["a-1"];
		render(<AnnouncementSelectionToolbar announcementIds={ids} />);
		const deleteBtn = screen.getByText("Supprimer").closest("button");
		expect(deleteBtn).toHaveAttribute("data-variant", "destructive");
	});

	it("count label is in role=status aria-live=polite", () => {
		mockSelectedItems.value = ["a-1", "a-2"];
		render(<AnnouncementSelectionToolbar announcementIds={ids} />);
		const label = screen.getByText(/2 annonces sélectionnées/);
		expect(label).toHaveAttribute("role", "status");
		expect(label).toHaveAttribute("aria-live", "polite");
		expect(label).toHaveAttribute("aria-atomic", "true");
	});

	it("triggers selection haptic on trigger pointerdown", () => {
		mockSelectedItems.value = ["a-1"];
		render(<AnnouncementSelectionToolbar announcementIds={ids} />);
		const trigger = screen.getByRole("button", { name: "Actions de la sélection" });
		trigger.dispatchEvent(new Event("pointerdown", { bubbles: true }));
		expect(mockHaptic).toHaveBeenCalledWith("selection");
	});
});
