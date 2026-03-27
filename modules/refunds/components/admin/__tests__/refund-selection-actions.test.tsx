import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockSelectedItems, mockClearSelection } = vi.hoisted(() => ({
	mockSelectedItems: { value: [] as string[] },
	mockClearSelection: vi.fn(),
}));

vi.mock("@/shared/contexts/selection-context", () => ({
	useSelectionContext: () => ({
		selectedItems: mockSelectedItems.value,
		clearSelection: mockClearSelection,
	}),
}));

vi.mock("@/modules/refunds/hooks/use-bulk-approve-refunds", () => ({
	useBulkApproveRefunds: () => ({ action: vi.fn(), isPending: false }),
}));

vi.mock("@/modules/refunds/hooks/use-bulk-reject-refunds", () => ({
	useBulkRejectRefunds: () => ({ action: vi.fn(), isPending: false }),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		disabled,
		"aria-busy": ariaBusy,
		...props
	}: {
		children: React.ReactNode;
		disabled?: boolean;
		"aria-busy"?: boolean;
		[key: string]: unknown;
	}) => (
		<button disabled={disabled} aria-busy={ariaBusy} {...(props as Record<string, unknown>)}>
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
	}: {
		children: React.ReactNode;
		onClick?: () => void;
		variant?: string;
	}) => (
		<div role="menuitem" onClick={onClick}>
			{children}
		</div>
	),
}));

vi.mock("@/shared/components/ui/alert-dialog", () => ({
	AlertDialog: ({
		children,
		open,
	}: {
		children: React.ReactNode;
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
	}) => (open ? <div data-testid="alert-dialog">{children}</div> : null),
	AlertDialogContent: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="alert-dialog-content">{children}</div>
	),
	AlertDialogHeader: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="alert-dialog-header">{children}</div>
	),
	AlertDialogTitle: ({ children }: { children: React.ReactNode }) => (
		<h2 data-testid="alert-dialog-title">{children}</h2>
	),
	AlertDialogDescription: ({ children }: { children: React.ReactNode }) => (
		<p data-testid="alert-dialog-description">{children}</p>
	),
	AlertDialogFooter: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="alert-dialog-footer">{children}</div>
	),
	AlertDialogCancel: ({
		children,
		disabled,
	}: {
		children: React.ReactNode;
		type?: string;
		disabled?: boolean;
	}) => <button disabled={disabled}>{children}</button>,
}));

vi.mock("lucide-react", () => ({
	CircleCheck: () => <svg data-testid="icon-circle-check" />,
	CircleX: () => <svg data-testid="icon-circle-x" />,
	EllipsisVertical: () => <svg data-testid="icon-ellipsis" />,
	LoaderCircle: () => <svg data-testid="icon-loader" />,
}));

import { RefundSelectionActions } from "../refund-selection-actions";

afterEach(() => {
	cleanup();
	mockSelectedItems.value = [];
	mockClearSelection.mockReset();
});

// ============================================================================
// TESTS
// ============================================================================

describe("RefundSelectionActions", () => {
	describe("empty selection", () => {
		it("returns null when no items are selected", () => {
			mockSelectedItems.value = [];
			const { container } = render(<RefundSelectionActions />);
			expect(container.firstChild).toBeNull();
		});
	});

	describe("with selection", () => {
		it("renders the dropdown trigger when items are selected", () => {
			mockSelectedItems.value = ["refund-1", "refund-2"];
			render(<RefundSelectionActions />);
			expect(screen.getByTestId("dropdown-trigger")).toBeInTheDocument();
		});

		it("shows 'Ouvrir le menu' sr-only text", () => {
			mockSelectedItems.value = ["refund-1"];
			render(<RefundSelectionActions />);
			expect(screen.getByText("Ouvrir le menu")).toBeInTheDocument();
		});

		it("shows 'Approuver' menu item", () => {
			mockSelectedItems.value = ["refund-1"];
			render(<RefundSelectionActions />);
			expect(screen.getByText("Approuver")).toBeInTheDocument();
		});

		it("shows 'Refuser' menu item", () => {
			mockSelectedItems.value = ["refund-1"];
			render(<RefundSelectionActions />);
			expect(screen.getByText("Refuser")).toBeInTheDocument();
		});

		it("shows dropdown separator between menu items", () => {
			mockSelectedItems.value = ["refund-1"];
			render(<RefundSelectionActions />);
			expect(screen.getByTestId("dropdown-separator")).toBeInTheDocument();
		});
	});

	describe("approve dialog", () => {
		it("does not show approve dialog initially (dialog closed)", () => {
			mockSelectedItems.value = ["refund-1"];
			render(<RefundSelectionActions />);
			expect(screen.queryByText("Approuver les remboursements")).not.toBeInTheDocument();
		});
	});

	describe("reject dialog", () => {
		it("does not show reject dialog initially (dialog closed)", () => {
			mockSelectedItems.value = ["refund-1"];
			render(<RefundSelectionActions />);
			expect(screen.queryByText("Refuser les remboursements")).not.toBeInTheDocument();
		});
	});
});
