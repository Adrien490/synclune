import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockSelectedItems,
	mockOpenDelete,
	mockCloseDelete,
	mockIsDeleteOpen,
	mockOpenUnsubscribe,
	mockCloseUnsubscribe,
	mockIsUnsubscribeOpen,
	mockDeleteAction,
	mockUnsubscribeAction,
} = vi.hoisted(() => ({
	mockSelectedItems: { current: [] as string[] },
	mockOpenDelete: vi.fn(),
	mockCloseDelete: vi.fn(),
	mockIsDeleteOpen: { value: false },
	mockOpenUnsubscribe: vi.fn(),
	mockCloseUnsubscribe: vi.fn(),
	mockIsUnsubscribeOpen: { value: false },
	mockDeleteAction: vi.fn(),
	mockUnsubscribeAction: vi.fn(),
}));

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

vi.mock("@/shared/contexts/selection-context", () => ({
	useSelectionContext: () => ({
		selectedItems: mockSelectedItems.current,
		clearSelection: vi.fn(),
	}),
}));

vi.mock("@/shared/providers/dialog-store-provider", () => ({
	useDialog: (id: string) => {
		if (id === "bulk-newsletter-delete") {
			return {
				open: mockOpenDelete,
				close: mockCloseDelete,
				isOpen: mockIsDeleteOpen.value,
			};
		}
		return {
			open: mockOpenUnsubscribe,
			close: mockCloseUnsubscribe,
			isOpen: mockIsUnsubscribeOpen.value,
		};
	},
}));

vi.mock("../../hooks/use-admin-bulk-delete-newsletter-subscribers", () => ({
	useAdminBulkDeleteNewsletterSubscribers: () => ({
		action: mockDeleteAction,
		isPending: false,
	}),
}));

vi.mock("../../hooks/use-admin-bulk-unsubscribe-newsletter", () => ({
	useAdminBulkUnsubscribeNewsletter: () => ({
		action: mockUnsubscribeAction,
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
		"aria-label": ariaLabel,
		type,
		variant,
		disabled,
		...rest
	}: {
		children: React.ReactNode;
		"aria-label"?: string;
		type?: string;
		variant?: string;
		disabled?: boolean;
		[key: string]: unknown;
	}) => (
		<button
			aria-label={ariaLabel}
			type={type as "button" | "submit" | "reset"}
			disabled={disabled}
			data-variant={variant}
			{...rest}
		>
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
		type,
		disabled,
	}: {
		children: React.ReactNode;
		type?: string;
		disabled?: boolean;
	}) => (
		<button type={type as "button" | "submit" | "reset"} disabled={disabled}>
			{children}
		</button>
	),
}));

vi.mock("lucide-react", () => ({
	Trash2: () => <svg data-testid="icon-trash" />,
	LoaderCircle: () => <svg data-testid="icon-loader" />,
	EllipsisVertical: () => <svg data-testid="icon-ellipsis" />,
	MailX: () => <svg data-testid="icon-mail-x" />,
}));

import { NewsletterSelectionToolbar } from "../newsletter-selection-toolbar";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("NewsletterSelectionToolbar", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSelectedItems.current = [];
		mockIsDeleteOpen.value = false;
		mockIsUnsubscribeOpen.value = false;
	});

	// ─── Visibility ───────────────────────────────────────────────────────────

	it("renders nothing when no items are selected", () => {
		mockSelectedItems.current = [];
		render(<NewsletterSelectionToolbar />);
		expect(screen.queryByTestId("selection-toolbar")).not.toBeInTheDocument();
	});

	it("renders toolbar when items are selected", () => {
		mockSelectedItems.current = ["sub-1"];
		render(<NewsletterSelectionToolbar />);
		expect(screen.getByTestId("selection-toolbar")).toBeInTheDocument();
	});

	// ─── Labels ───────────────────────────────────────────────────────────────

	it("shows singular label for one selected item", () => {
		mockSelectedItems.current = ["sub-1"];
		render(<NewsletterSelectionToolbar />);
		expect(screen.getByText("1 abonné sélectionné")).toBeInTheDocument();
	});

	it("shows plural label for multiple selected items", () => {
		mockSelectedItems.current = ["sub-1", "sub-2", "sub-3"];
		render(<NewsletterSelectionToolbar />);
		expect(screen.getByText("3 abonnés sélectionnés")).toBeInTheDocument();
	});

	it("shows plural label for two selected items", () => {
		mockSelectedItems.current = ["sub-1", "sub-2"];
		render(<NewsletterSelectionToolbar />);
		expect(screen.getByText("2 abonnés sélectionnés")).toBeInTheDocument();
	});

	// ─── Dropdown ─────────────────────────────────────────────────────────────

	it("renders the action menu when items are selected", () => {
		mockSelectedItems.current = ["sub-1"];
		render(<NewsletterSelectionToolbar />);
		expect(screen.getByRole("menu", { name: "Actions groupées" })).toBeInTheDocument();
	});

	it("shows 'Désabonner' menu item", () => {
		mockSelectedItems.current = ["sub-1"];
		render(<NewsletterSelectionToolbar />);
		expect(screen.getByRole("menuitem", { name: /Désabonner/i })).toBeInTheDocument();
	});

	it("shows 'Supprimer (RGPD)' menu item", () => {
		mockSelectedItems.current = ["sub-1"];
		render(<NewsletterSelectionToolbar />);
		expect(screen.getByRole("menuitem", { name: /Supprimer \(RGPD\)/i })).toBeInTheDocument();
	});

	// ─── Delete AlertDialog ───────────────────────────────────────────────────

	it("renders delete AlertDialog when isDeleteOpen is true", () => {
		mockSelectedItems.current = ["sub-1"];
		mockIsDeleteOpen.value = true;
		render(<NewsletterSelectionToolbar />);
		expect(screen.getByTestId("alert-dialog")).toBeInTheDocument();
	});

	it("shows delete dialog title 'Supprimer les abonnés'", () => {
		mockSelectedItems.current = ["sub-1"];
		mockIsDeleteOpen.value = true;
		render(<NewsletterSelectionToolbar />);
		expect(screen.getByTestId("alert-dialog-title")).toHaveTextContent("Supprimer les abonnés");
	});

	it("does not render delete AlertDialog when isDeleteOpen is false", () => {
		mockSelectedItems.current = ["sub-1"];
		mockIsDeleteOpen.value = false;
		render(<NewsletterSelectionToolbar />);
		expect(screen.queryByTestId("alert-dialog-title")).not.toBeInTheDocument();
	});

	// ─── Unsubscribe AlertDialog ──────────────────────────────────────────────

	it("renders unsubscribe AlertDialog when isUnsubscribeOpen is true", () => {
		mockSelectedItems.current = ["sub-1"];
		mockIsUnsubscribeOpen.value = true;
		render(<NewsletterSelectionToolbar />);
		expect(screen.getByTestId("alert-dialog-title")).toHaveTextContent("Désabonner les abonnés");
	});
});
