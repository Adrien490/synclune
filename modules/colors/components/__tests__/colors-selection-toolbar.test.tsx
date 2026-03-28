import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockSelectedItems, mockClearSelection, mockDeleteAction, mockToggleAction } = vi.hoisted(
	() => ({
		mockSelectedItems: { value: [] as string[] },
		mockClearSelection: vi.fn(),
		mockDeleteAction: vi.fn(),
		mockToggleAction: vi.fn(),
	}),
);

vi.mock("@/shared/contexts/selection-context", () => ({
	useSelectionContext: () => ({
		selectedItems: mockSelectedItems.value,
		clearSelection: mockClearSelection,
	}),
}));

vi.mock("@/modules/colors/hooks/use-bulk-delete-colors", () => ({
	useBulkDeleteColors: () => ({
		action: mockDeleteAction,
		isPending: false,
	}),
}));

vi.mock("@/modules/colors/hooks/use-bulk-toggle-color-status", () => ({
	useBulkToggleColorStatus: () => ({
		action: mockToggleAction,
		isPending: false,
	}),
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
		onClick,
	}: {
		children: React.ReactNode;
		disabled?: boolean;
		type?: string;
		onClick?: () => void;
		[key: string]: unknown;
	}) => (
		<button disabled={disabled} type={type as "button" | "submit" | undefined} onClick={onClick}>
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
		variant,
	}: {
		children: React.ReactNode;
		onClick?: () => void;
		variant?: string;
		disabled?: boolean;
	}) => (
		<button role="menuitem" onClick={onClick} data-variant={variant}>
			{children}
		</button>
	),
}));

vi.mock("@/shared/components/ui/alert-dialog", () => ({
	AlertDialog: ({
		children,
		open,
	}: {
		children: React.ReactNode;
		open: boolean;
		onOpenChange?: (open: boolean) => void;
	}) => (open ? <div data-testid="alert-dialog">{children}</div> : null),
	AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
	AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	AlertDialogCancel: ({
		children,
		disabled,
		type,
	}: {
		children: React.ReactNode;
		disabled?: boolean;
		type?: string;
	}) => (
		<button
			data-testid="cancel-button"
			disabled={disabled}
			type={type as "button" | "submit" | undefined}
		>
			{children}
		</button>
	),
}));

vi.mock("lucide-react", () => ({
	EllipsisVertical: () => <svg data-testid="icon-ellipsis" />,
	Trash2: () => <svg data-testid="icon-trash" />,
	CircleCheck: () => <svg data-testid="icon-circle-check" />,
	CircleX: () => <svg data-testid="icon-circle-x" />,
	LoaderCircle: ({ className }: { className?: string }) => (
		<span data-testid="loader" className={className} />
	),
}));

import { ColorsSelectionToolbar } from "../colors-selection-toolbar";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("ColorsSelectionToolbar", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSelectedItems.value = [];
	});

	// ─── Visibility ───────────────────────────────────────────────────────────

	it("returns null when no items are selected", () => {
		mockSelectedItems.value = [];
		const { container } = render(<ColorsSelectionToolbar />);
		expect(container.firstChild).toBeNull();
	});

	it("renders toolbar when items are selected", () => {
		mockSelectedItems.value = ["c-1"];
		render(<ColorsSelectionToolbar />);
		expect(screen.getByTestId("selection-toolbar")).toBeInTheDocument();
	});

	// ─── Count display ────────────────────────────────────────────────────────

	it("shows singular '1 couleur sélectionnée' for 1 item", () => {
		mockSelectedItems.value = ["c-1"];
		render(<ColorsSelectionToolbar />);
		expect(screen.getByText(/1 couleur sélectionnée$/)).toBeInTheDocument();
	});

	it("shows plural '2 couleurs sélectionnées' for multiple items", () => {
		mockSelectedItems.value = ["c-1", "c-2"];
		render(<ColorsSelectionToolbar />);
		expect(screen.getByText(/2 couleurs sélectionnées/)).toBeInTheDocument();
	});

	// ─── Menu items ───────────────────────────────────────────────────────────

	it("shows 'Activer' menu item", () => {
		mockSelectedItems.value = ["c-1"];
		render(<ColorsSelectionToolbar />);
		expect(screen.getByText("Activer")).toBeInTheDocument();
	});

	it("shows 'Désactiver' menu item", () => {
		mockSelectedItems.value = ["c-1"];
		render(<ColorsSelectionToolbar />);
		expect(screen.getByText("Désactiver")).toBeInTheDocument();
	});

	it("shows 'Supprimer' menu item", () => {
		mockSelectedItems.value = ["c-1"];
		render(<ColorsSelectionToolbar />);
		expect(screen.getByText("Supprimer")).toBeInTheDocument();
	});

	it("shows sr-only text 'Ouvrir le menu'", () => {
		mockSelectedItems.value = ["c-1"];
		render(<ColorsSelectionToolbar />);
		expect(screen.getByText("Ouvrir le menu")).toBeInTheDocument();
	});

	// ─── Alert dialogs ────────────────────────────────────────────────────────

	it("does not show delete dialog initially", () => {
		mockSelectedItems.value = ["c-1"];
		render(<ColorsSelectionToolbar />);
		expect(screen.queryByText("Supprimer les couleurs")).not.toBeInTheDocument();
	});

	it("does not show activate dialog initially", () => {
		mockSelectedItems.value = ["c-1"];
		render(<ColorsSelectionToolbar />);
		expect(screen.queryByText("Activer les couleurs")).not.toBeInTheDocument();
	});

	it("does not show deactivate dialog initially", () => {
		mockSelectedItems.value = ["c-1"];
		render(<ColorsSelectionToolbar />);
		expect(screen.queryByText("Désactiver les couleurs")).not.toBeInTheDocument();
	});
});
