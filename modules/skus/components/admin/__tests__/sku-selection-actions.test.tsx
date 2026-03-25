import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockClearSelection, mockOpenDialog, mockActivateSkus, mockDeactivateSkus, mockDeleteSkus } =
	vi.hoisted(() => ({
		mockClearSelection: vi.fn(),
		mockOpenDialog: vi.fn(),
		mockActivateSkus: vi.fn(),
		mockDeactivateSkus: vi.fn(),
		mockDeleteSkus: vi.fn(),
	}));

let mockSelectedItems: string[] = [];

// Mock sibling components (imported for their exported constants) to avoid
// transitive auth/Stripe/form imports
vi.mock("../bulk-adjust-stock-dialog", () => ({
	BULK_ADJUST_STOCK_DIALOG_ID: "bulk-adjust-sku-stock",
}));
vi.mock("../bulk-update-price-dialog", () => ({
	BULK_UPDATE_PRICE_DIALOG_ID: "bulk-update-sku-price",
}));

vi.mock("@/shared/contexts/selection-context", () => ({
	useSelectionContext: () => ({
		selectedItems: mockSelectedItems,
		clearSelection: mockClearSelection,
	}),
}));

vi.mock("@/shared/providers/dialog-store-provider", () => ({
	useDialog: () => ({
		isOpen: false,
		data: null,
		close: vi.fn(),
		open: mockOpenDialog,
	}),
}));

vi.mock("@/modules/skus/hooks/use-bulk-activate-skus", () => ({
	useBulkActivateSkus: () => ({
		activateSkus: mockActivateSkus,
		isPending: false,
	}),
}));

vi.mock("@/modules/skus/hooks/use-bulk-deactivate-skus", () => ({
	useBulkDeactivateSkus: () => ({
		deactivateSkus: mockDeactivateSkus,
		isPending: false,
	}),
}));

vi.mock("@/modules/skus/hooks/use-bulk-delete-skus", () => ({
	useBulkDeleteSkus: () => ({
		deleteSkus: mockDeleteSkus,
		isPending: false,
	}),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		disabled,
		type,
		onClick,
		variant,
		size,
		className,
	}: {
		children: React.ReactNode;
		disabled?: boolean;
		type?: string;
		onClick?: () => void;
		variant?: string;
		size?: string;
		className?: string;
	}) => (
		<button
			disabled={disabled}
			type={type as "button" | "submit" | undefined}
			onClick={onClick}
			data-variant={variant}
			data-size={size}
			className={className}
		>
			{children}
		</button>
	),
}));

vi.mock("@/shared/components/ui/dropdown-menu", () => ({
	DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	DropdownMenuContent: ({
		children,
	}: {
		children: React.ReactNode;
		align?: string;
		className?: string;
	}) => <div data-testid="dropdown-content">{children}</div>,
	DropdownMenuItem: ({
		children,
		onClick,
		disabled,
	}: {
		children: React.ReactNode;
		onClick?: () => void;
		disabled?: boolean;
		variant?: string;
	}) => (
		<button onClick={onClick} disabled={disabled} data-testid="dropdown-item">
			{children}
		</button>
	),
	DropdownMenuSeparator: () => <hr />,
	DropdownMenuTrigger: ({ children }: { children: React.ReactNode; asChild?: boolean }) => (
		<div data-testid="dropdown-trigger">{children}</div>
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
	}) => (
		<div data-testid="alert-dialog" data-open={open}>
			{children}
		</div>
	),
	AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
	AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
	AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	AlertDialogCancel: ({
		children,
		disabled,
	}: {
		children: React.ReactNode;
		disabled?: boolean;
	}) => <button disabled={disabled}>{children}</button>,
}));

vi.mock("lucide-react", () => ({
	CircleCheck: () => <span data-testid="icon-check-circle" />,
	DollarSign: () => <span data-testid="icon-dollar" />,
	FileDown: () => <span data-testid="icon-file-down" />,
	LoaderCircle: ({ className }: { className?: string }) => (
		<span data-testid="icon-loader" className={className} />
	),
	EllipsisVertical: () => <span data-testid="icon-more-vertical" />,
	Package: () => <span data-testid="icon-package" />,
	Trash2: () => <span data-testid="icon-trash" />,
	CircleX: () => <span data-testid="icon-x-circle" />,
}));

vi.mock("sonner", () => ({
	toast: {
		error: vi.fn(),
		info: vi.fn(),
		success: vi.fn(),
	},
}));

import { ProductVariantSelectionActions } from "../sku-selection-actions";

// ============================================================================
// TESTS
// ============================================================================

describe("ProductVariantSelectionActions", () => {
	beforeEach(() => {
		cleanup();
		vi.clearAllMocks();
		mockSelectedItems = [];
	});

	// ─── Empty selection ───────────────────────────────────────────────────────

	it("renders null when no items are selected", () => {
		const { container } = render(<ProductVariantSelectionActions />);

		expect(container).toBeEmptyDOMElement();
	});

	it("renders null when selectedItems is empty array", () => {
		mockSelectedItems = [];

		const { container } = render(<ProductVariantSelectionActions />);

		expect(container.firstChild).toBeNull();
	});

	// ─── With selection ───────────────────────────────────────────────────────

	it("renders dropdown trigger when items are selected", () => {
		mockSelectedItems = ["sku_1", "sku_2"];

		render(<ProductVariantSelectionActions />);

		expect(screen.getByTestId("dropdown-trigger")).toBeInTheDocument();
	});

	it("renders menu trigger button with sr-only label when items are selected", () => {
		mockSelectedItems = ["sku_1", "sku_2"];

		render(<ProductVariantSelectionActions />);

		expect(screen.getByText("Ouvrir le menu")).toBeInTheDocument();
	});

	it("renders dropdown content with menu items when items are selected", () => {
		mockSelectedItems = ["sku_1", "sku_2"];

		render(<ProductVariantSelectionActions />);

		expect(screen.getByTestId("dropdown-content")).toBeInTheDocument();
	});

	it("shows 'Exporter CSV' menu item", () => {
		mockSelectedItems = ["sku_1", "sku_2"];

		render(<ProductVariantSelectionActions />);

		expect(screen.getByText("Exporter CSV")).toBeInTheDocument();
	});

	it("shows 'Ajuster le stock' menu item", () => {
		mockSelectedItems = ["sku_1", "sku_2"];

		render(<ProductVariantSelectionActions />);

		expect(screen.getByText("Ajuster le stock")).toBeInTheDocument();
	});

	it("shows 'Modifier le prix' menu item", () => {
		mockSelectedItems = ["sku_1", "sku_2"];

		render(<ProductVariantSelectionActions />);

		expect(screen.getByText("Modifier le prix")).toBeInTheDocument();
	});

	it("shows 'Activer' menu item", () => {
		mockSelectedItems = ["sku_1", "sku_2"];

		render(<ProductVariantSelectionActions />);

		expect(screen.getByText("Activer")).toBeInTheDocument();
	});

	it("shows 'Désactiver' menu item", () => {
		mockSelectedItems = ["sku_1", "sku_2"];

		render(<ProductVariantSelectionActions />);

		expect(screen.getByText("Désactiver")).toBeInTheDocument();
	});

	it("shows 'Supprimer' menu item", () => {
		mockSelectedItems = ["sku_1", "sku_2"];

		render(<ProductVariantSelectionActions />);

		// "Supprimer" appears in the dropdown and in the alert dialog confirm button
		const items = screen.getAllByText("Supprimer");
		expect(items.length).toBeGreaterThanOrEqual(1);
	});

	// ─── Alert dialog ─────────────────────────────────────────────────────────

	it("renders alert dialog element alongside dropdown", () => {
		mockSelectedItems = ["sku_1", "sku_2"];

		render(<ProductVariantSelectionActions />);

		expect(screen.getByTestId("alert-dialog")).toBeInTheDocument();
	});
});
