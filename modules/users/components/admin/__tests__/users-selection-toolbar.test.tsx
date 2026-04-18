import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockSelectedItems, mockClearSelection } = vi.hoisted(() => ({
	mockSelectedItems: { value: [] as string[] },
	mockClearSelection: vi.fn(),
}));

const {
	mockDeleteDialog,
	mockSuspendDialog,
	mockRestoreDialog,
	mockPromoteDialog,
	mockDemoteDialog,
} = vi.hoisted(() => {
	const makeDialog = () => ({ isOpen: false, open: vi.fn(), close: vi.fn() });
	return {
		mockDeleteDialog: makeDialog(),
		mockSuspendDialog: makeDialog(),
		mockRestoreDialog: makeDialog(),
		mockPromoteDialog: makeDialog(),
		mockDemoteDialog: makeDialog(),
	};
});

vi.mock("@/shared/contexts/selection-context", () => ({
	useSelectionContext: vi.fn(() => ({
		selectedItems: mockSelectedItems.value,
		clearSelection: mockClearSelection,
	})),
}));

vi.mock("@/shared/providers/dialog-store-provider", () => ({
	useDialog: vi.fn((id: string) => {
		if (id === "bulk-delete-users") return mockDeleteDialog;
		if (id === "bulk-suspend-users") return mockSuspendDialog;
		if (id === "bulk-restore-users") return mockRestoreDialog;
		if (id === "bulk-promote-users") return mockPromoteDialog;
		if (id === "bulk-demote-users") return mockDemoteDialog;
		return { isOpen: false, open: vi.fn(), close: vi.fn() };
	}),
}));

vi.mock("@/modules/users/hooks/use-bulk-delete-users", () => ({
	useBulkDeleteUsers: vi.fn(() => ({ action: vi.fn(), isPending: false })),
}));
vi.mock("@/modules/users/hooks/use-bulk-suspend-users", () => ({
	useBulkSuspendUsers: vi.fn(() => ({ action: vi.fn(), isPending: false })),
}));
vi.mock("@/modules/users/hooks/use-bulk-restore-users", () => ({
	useBulkRestoreUsers: vi.fn(() => ({ action: vi.fn(), isPending: false })),
}));
vi.mock("@/modules/users/hooks/use-bulk-change-user-role", () => ({
	useBulkChangeUserRole: vi.fn(() => ({ action: vi.fn(), isPending: false })),
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
		type,
		...rest
	}: {
		children: React.ReactNode;
		disabled?: boolean;
		type?: string;
		[key: string]: unknown;
	}) => (
		<button disabled={disabled} type={type as "button" | "submit" | "reset" | undefined} {...rest}>
			{children}
		</button>
	),
}));

vi.mock("@/shared/components/responsive-action-menu", async () => {
	const { buildResponsiveActionMenuMock } =
		await import("@/shared/components/responsive-action-menu/test-mock");
	return buildResponsiveActionMenuMock();
});

vi.mock("@/shared/components/ui/alert-dialog", () => ({
	AlertDialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
		open ? <div data-testid="alert-dialog">{children}</div> : null,
	AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
	AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
	AlertDialogCancel: ({
		children,
		disabled,
	}: {
		children: React.ReactNode;
		disabled?: boolean;
	}) => <button disabled={disabled}>{children}</button>,
}));

vi.mock("lucide-react", () => ({
	CircleCheck: () => <svg data-testid="icon-circle-check" />,
	CircleX: () => <svg data-testid="icon-circle-x" />,
	EllipsisVertical: () => <svg data-testid="icon-ellipsis" />,
	LoaderCircle: () => <svg data-testid="icon-loader" />,
	RotateCcw: () => <svg data-testid="icon-rotate" />,
	Shield: () => <svg data-testid="icon-shield" />,
	Trash2: () => <svg data-testid="icon-trash" />,
	UserMinus: () => <svg data-testid="icon-user-minus" />,
}));

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

import { UsersSelectionToolbar } from "../users-selection-toolbar";

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	mockSelectedItems.value = [];
});

beforeEach(() => {
	mockSelectedItems.value = [];
	mockDeleteDialog.isOpen = false;
	mockSuspendDialog.isOpen = false;
	mockRestoreDialog.isOpen = false;
	mockPromoteDialog.isOpen = false;
	mockDemoteDialog.isOpen = false;
});

describe("UsersSelectionToolbar", () => {
	it("renders nothing when no items selected", () => {
		mockSelectedItems.value = [];
		const { container } = render(<UsersSelectionToolbar userIds={[]} />);
		expect(container.firstChild).toBeNull();
	});

	it("renders toolbar when items are selected", () => {
		mockSelectedItems.value = ["user-1", "user-2"];
		render(<UsersSelectionToolbar userIds={["user-1", "user-2"]} />);
		expect(screen.getByTestId("selection-toolbar")).toBeInTheDocument();
	});

	it("shows singular label for 1 item", () => {
		mockSelectedItems.value = ["user-1"];
		render(<UsersSelectionToolbar userIds={["user-1"]} />);
		expect(document.body.textContent).toContain("1 utilisateur");
	});

	it("shows plural label for multiple items", () => {
		mockSelectedItems.value = ["user-1", "user-2", "user-3"];
		render(<UsersSelectionToolbar userIds={["user-1", "user-2", "user-3"]} />);
		expect(document.body.textContent).toContain("3 utilisateurs");
	});

	it("renders bulk action menu items", () => {
		mockSelectedItems.value = ["user-1"];
		render(<UsersSelectionToolbar userIds={["user-1"]} />);
		expect(screen.getByRole("menuitem", { name: "Suspendre" })).toBeInTheDocument();
		expect(screen.getByRole("menuitem", { name: "Restaurer" })).toBeInTheDocument();
		expect(screen.getByRole("menuitem", { name: "Supprimer" })).toHaveAttribute(
			"data-variant",
			"destructive",
		);
	});

	it("exposes flat role actions (Promouvoir admin / Rétrograder utilisateur)", () => {
		mockSelectedItems.value = ["user-1"];
		render(<UsersSelectionToolbar userIds={["user-1"]} />);
		expect(screen.getByRole("menuitem", { name: "Promouvoir admin" })).toBeInTheDocument();
		expect(screen.getByRole("menuitem", { name: "Rétrograder utilisateur" })).toBeInTheDocument();
	});

	it("renders delete dialog when deleteDialog.isOpen is true", () => {
		mockSelectedItems.value = ["user-1"];
		mockDeleteDialog.isOpen = true;
		render(<UsersSelectionToolbar userIds={["user-1"]} />);
		expect(screen.getByTestId("alert-dialog")).toBeInTheDocument();
		expect(document.body.textContent).toContain("Supprimer les utilisateurs");
	});

	it("renders suspend dialog when suspendDialog.isOpen is true", () => {
		mockSelectedItems.value = ["user-1"];
		mockSuspendDialog.isOpen = true;
		render(<UsersSelectionToolbar userIds={["user-1"]} />);
		expect(document.body.textContent).toContain("Suspendre les utilisateurs");
	});

	it("renders restore dialog when restoreDialog.isOpen is true", () => {
		mockSelectedItems.value = ["user-1"];
		mockRestoreDialog.isOpen = true;
		render(<UsersSelectionToolbar userIds={["user-1"]} />);
		expect(document.body.textContent).toContain("Restaurer les utilisateurs");
	});

	it("clicking 'Suspendre' opens suspend dialog", async () => {
		mockSelectedItems.value = ["user-1", "user-2"];
		render(<UsersSelectionToolbar userIds={["user-1", "user-2"]} />);
		await userEvent.click(screen.getByRole("menuitem", { name: "Suspendre" }));
		expect(mockSuspendDialog.open).toHaveBeenCalled();
	});

	it("clicking 'Restaurer' opens restore dialog", async () => {
		mockSelectedItems.value = ["user-1"];
		render(<UsersSelectionToolbar userIds={["user-1"]} />);
		await userEvent.click(screen.getByRole("menuitem", { name: "Restaurer" }));
		expect(mockRestoreDialog.open).toHaveBeenCalled();
	});

	it("clicking 'Supprimer' opens delete dialog", async () => {
		mockSelectedItems.value = ["user-1"];
		render(<UsersSelectionToolbar userIds={["user-1"]} />);
		await userEvent.click(screen.getByRole("menuitem", { name: "Supprimer" }));
		expect(mockDeleteDialog.open).toHaveBeenCalled();
	});

	it("clicking 'Promouvoir admin' opens promote dialog", async () => {
		mockSelectedItems.value = ["user-1"];
		render(<UsersSelectionToolbar userIds={["user-1"]} />);
		await userEvent.click(screen.getByRole("menuitem", { name: "Promouvoir admin" }));
		expect(mockPromoteDialog.open).toHaveBeenCalled();
	});

	it("clicking 'Rétrograder utilisateur' opens demote dialog", async () => {
		mockSelectedItems.value = ["user-1"];
		render(<UsersSelectionToolbar userIds={["user-1"]} />);
		await userEvent.click(screen.getByRole("menuitem", { name: "Rétrograder utilisateur" }));
		expect(mockDemoteDialog.open).toHaveBeenCalled();
	});

	it("renders promote dialog when promoteDialog.isOpen is true", () => {
		mockSelectedItems.value = ["user-1"];
		mockPromoteDialog.isOpen = true;
		render(<UsersSelectionToolbar userIds={["user-1"]} />);
		expect(document.body.textContent).toContain("Promouvoir");
	});

	it("renders demote dialog when demoteDialog.isOpen is true", () => {
		mockSelectedItems.value = ["user-1"];
		mockDemoteDialog.isOpen = true;
		render(<UsersSelectionToolbar userIds={["user-1"]} />);
		expect(document.body.textContent).toContain("Rétrograder");
	});
});
