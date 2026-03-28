import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

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
		variant,
		size,
		className,
	}: {
		children: React.ReactNode;
		disabled?: boolean;
		type?: string;
		variant?: string;
		size?: string;
		className?: string;
	}) => (
		<button
			disabled={disabled}
			type={type as "button" | "submit" | "reset" | undefined}
			data-variant={variant}
			className={className}
		>
			{children}
		</button>
	),
}));

vi.mock("@/shared/components/ui/dropdown-menu", () => ({
	DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	DropdownMenuTrigger: ({ children }: { children: React.ReactNode; asChild?: boolean }) => (
		<div>{children}</div>
	),
	DropdownMenuContent: ({
		children,
		align,
		className,
	}: {
		children: React.ReactNode;
		align?: string;
		className?: string;
	}) => <div data-testid="dropdown-content">{children}</div>,
	DropdownMenuSeparator: () => <hr />,
	DropdownMenuItem: ({
		children,
		onClick,
		variant,
	}: {
		children: React.ReactNode;
		onClick?: () => void;
		variant?: string;
	}) => (
		<button role="menuitem" onClick={onClick} data-variant={variant}>
			{children}
		</button>
	),
	DropdownMenuSub: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	DropdownMenuSubTrigger: ({ children }: { children: React.ReactNode }) => (
		<button role="menuitem">{children}</button>
	),
	DropdownMenuSubContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/shared/components/ui/alert-dialog", () => ({
	AlertDialog: ({
		children,
		open,
	}: {
		children: React.ReactNode;
		open: boolean;
		onOpenChange?: (v: boolean) => void;
	}) => (open ? <div data-testid="alert-dialog">{children}</div> : null),
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
	LoaderCircle: () => <svg data-testid="icon-loader" />,
	EllipsisVertical: () => <svg data-testid="icon-ellipsis" />,
	RotateCcw: () => <svg data-testid="icon-rotate" />,
	Trash2: () => <svg data-testid="icon-trash" />,
	CircleX: () => <svg data-testid="icon-circle-x" />,
}));

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

import { UsersSelectionToolbar } from "../users-selection-toolbar";

// ============================================================================
// TESTS
// ============================================================================

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
	// ─── Empty state ──────────────────────────────────────────────────────────

	it("renders nothing when no items selected", () => {
		mockSelectedItems.value = [];
		const { container } = render(<UsersSelectionToolbar userIds={[]} />);
		expect(container.firstChild).toBeNull();
	});

	// ─── With selection ───────────────────────────────────────────────────────

	it("renders toolbar when items are selected", () => {
		mockSelectedItems.value = ["user-1", "user-2"];
		render(<UsersSelectionToolbar userIds={["user-1", "user-2"]} />);
		expect(screen.getByTestId("selection-toolbar")).toBeInTheDocument();
	});

	it("shows singular 'utilisateur selectionne' for 1 item", () => {
		mockSelectedItems.value = ["user-1"];
		render(<UsersSelectionToolbar userIds={["user-1"]} />);
		const text = document.body.textContent ?? "";
		expect(text).toContain("1 utilisateur");
		expect(text).not.toContain("utilisateurs");
	});

	it("shows plural 'utilisateurs selectionnes' for multiple items", () => {
		mockSelectedItems.value = ["user-1", "user-2", "user-3"];
		render(<UsersSelectionToolbar userIds={["user-1", "user-2", "user-3"]} />);
		const text = document.body.textContent ?? "";
		expect(text).toContain("3 utilisateurs");
	});

	it("renders bulk action menu items", () => {
		mockSelectedItems.value = ["user-1"];
		render(<UsersSelectionToolbar userIds={["user-1"]} />);
		expect(screen.getByText("Suspendre")).toBeInTheDocument();
		expect(screen.getByText("Restaurer")).toBeInTheDocument();
		expect(screen.getByText("Supprimer")).toBeInTheDocument();
	});

	it("renders role change submenu", () => {
		mockSelectedItems.value = ["user-1"];
		render(<UsersSelectionToolbar userIds={["user-1"]} />);
		expect(screen.getByText("Changer le role")).toBeInTheDocument();
	});

	// ─── Dialogs ──────────────────────────────────────────────────────────────

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
});
