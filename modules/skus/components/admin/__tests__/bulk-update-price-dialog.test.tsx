import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockClose, mockClearSelection, mockUpdatePrice } = vi.hoisted(() => ({
	mockClose: vi.fn(),
	mockClearSelection: vi.fn(),
	mockUpdatePrice: vi.fn(),
}));

let mockDialogState: {
	isOpen: boolean;
	data: { skuIds: string[] } | null;
	close: typeof mockClose;
} = {
	isOpen: false,
	data: null,
	close: mockClose,
};

let mockIsPending = false;

vi.mock("@/shared/providers/dialog-store-provider", () => ({
	useDialog: () => mockDialogState,
}));

vi.mock("@/shared/contexts/selection-context", () => ({
	useSelectionContext: () => ({
		selectedItems: [],
		clearSelection: mockClearSelection,
	}),
}));

vi.mock("@/modules/skus/hooks/use-bulk-update-price", () => ({
	useBulkUpdatePrice: () => ({
		updatePrice: mockUpdatePrice,
		isPending: mockIsPending,
	}),
}));

vi.mock("@/shared/components/responsive-dialog", () => ({
	ResponsiveDialog: ({
		children,
		open,
	}: {
		children: React.ReactNode;
		open: boolean;
		onOpenChange?: (open: boolean) => void;
	}) => (open ? <div data-testid="responsive-dialog">{children}</div> : null),
	ResponsiveDialogContent: ({ children }: { children: React.ReactNode; className?: string }) => (
		<div>{children}</div>
	),
	ResponsiveDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	ResponsiveDialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
	ResponsiveDialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
	ResponsiveDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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
	}) => (
		<button disabled={disabled} type={type as "button" | "submit" | undefined} onClick={onClick}>
			{children}
		</button>
	),
}));

vi.mock("@/shared/components/ui/input", () => ({
	Input: (props: Record<string, unknown>) => <input data-testid="price-input" {...props} />,
}));

vi.mock("@/shared/components/ui/label", () => ({
	Label: ({
		children,
		htmlFor,
	}: {
		children: React.ReactNode;
		htmlFor?: string;
		className?: string;
	}) => <label htmlFor={htmlFor}>{children}</label>,
}));

vi.mock("@/shared/components/ui/radio-group", () => ({
	RadioGroup: ({
		children,
		value,
	}: {
		children: React.ReactNode;
		value: string;
		onValueChange: (v: string) => void;
		className?: string;
	}) => (
		<div data-testid="radio-group" data-value={value}>
			{children}
		</div>
	),
	RadioGroupItem: ({ value, id }: { value: string; id: string }) => (
		<input type="radio" value={value} id={id} data-testid={`radio-${value}`} />
	),
}));

vi.mock("@/shared/components/ui/checkbox", () => ({
	Checkbox: ({
		id,
		checked,
		onCheckedChange,
	}: {
		id?: string;
		checked?: boolean;
		onCheckedChange?: (checked: boolean) => void;
	}) => (
		<input
			type="checkbox"
			id={id}
			checked={checked}
			onChange={(e) => onCheckedChange?.(e.target.checked)}
			data-testid="compare-at-price-checkbox"
		/>
	),
}));

vi.mock("lucide-react", () => ({
	DollarSign: ({ className }: { className?: string }) => (
		<span data-testid="icon-dollar" className={className} />
	),
}));

import { BulkUpdatePriceDialog } from "../bulk-update-price-dialog";

// ============================================================================
// TESTS
// ============================================================================

describe("BulkUpdatePriceDialog", () => {
	beforeEach(() => {
		cleanup();
		vi.clearAllMocks();
		mockIsPending = false;
		mockDialogState = {
			isOpen: false,
			data: null,
			close: mockClose,
		};
	});

	// ─── Closed state ─────────────────────────────────────────────────────────

	it("renders nothing when dialog is closed", () => {
		render(<BulkUpdatePriceDialog />);

		expect(screen.queryByTestId("responsive-dialog")).not.toBeInTheDocument();
	});

	// ─── Open state ───────────────────────────────────────────────────────────

	it("renders dialog when open with data", () => {
		mockDialogState = {
			isOpen: true,
			data: { skuIds: ["a", "b"] },
			close: mockClose,
		};

		render(<BulkUpdatePriceDialog />);

		expect(screen.getByTestId("responsive-dialog")).toBeInTheDocument();
	});

	it("shows 'Modifier les prix' title when open", () => {
		mockDialogState = {
			isOpen: true,
			data: { skuIds: ["a", "b"] },
			close: mockClose,
		};

		render(<BulkUpdatePriceDialog />);

		expect(screen.getByText("Modifier les prix")).toBeInTheDocument();
	});

	it("displays count of selected variants in description", () => {
		mockDialogState = {
			isOpen: true,
			data: { skuIds: ["a", "b"] },
			close: mockClose,
		};

		render(<BulkUpdatePriceDialog />);

		expect(screen.getByText(/2 variantes/)).toBeInTheDocument();
	});

	it("uses singular 'variante' for one sku", () => {
		mockDialogState = {
			isOpen: true,
			data: { skuIds: ["a"] },
			close: mockClose,
		};

		render(<BulkUpdatePriceDialog />);

		expect(screen.getByText(/1 variante/)).toBeInTheDocument();
		expect(screen.queryByText(/1 variantes/)).not.toBeInTheDocument();
	});

	it("renders mode radio group", () => {
		mockDialogState = {
			isOpen: true,
			data: { skuIds: ["a", "b"] },
			close: mockClose,
		};

		render(<BulkUpdatePriceDialog />);

		expect(screen.getByTestId("radio-group")).toBeInTheDocument();
	});

	it("renders 'Pourcentage (+/-)' and 'Prix fixe' radio options", () => {
		mockDialogState = {
			isOpen: true,
			data: { skuIds: ["a", "b"] },
			close: mockClose,
		};

		render(<BulkUpdatePriceDialog />);

		expect(screen.getByText("Pourcentage (+/-)")).toBeInTheDocument();
		expect(screen.getByText("Prix fixe")).toBeInTheDocument();
	});

	it("renders checkbox to apply to compare at prices", () => {
		mockDialogState = {
			isOpen: true,
			data: { skuIds: ["a", "b"] },
			close: mockClose,
		};

		render(<BulkUpdatePriceDialog />);

		expect(screen.getByTestId("compare-at-price-checkbox")).toBeInTheDocument();
		expect(screen.getByText("Appliquer également aux prix barrés")).toBeInTheDocument();
	});

	it("renders cancel and apply buttons", () => {
		mockDialogState = {
			isOpen: true,
			data: { skuIds: ["a", "b"] },
			close: mockClose,
		};

		render(<BulkUpdatePriceDialog />);

		expect(screen.getByText("Annuler")).toBeInTheDocument();
		expect(screen.getByText("Appliquer")).toBeInTheDocument();
	});

	// ─── Pending state ────────────────────────────────────────────────────────

	it("shows 'Modification...' when pending", () => {
		mockDialogState = {
			isOpen: true,
			data: { skuIds: ["a", "b"] },
			close: mockClose,
		};
		mockIsPending = true;

		render(<BulkUpdatePriceDialog />);

		expect(screen.getByText("Modification...")).toBeInTheDocument();
	});

	it("disables cancel and apply buttons when pending", () => {
		mockDialogState = {
			isOpen: true,
			data: { skuIds: ["a", "b"] },
			close: mockClose,
		};
		mockIsPending = true;

		render(<BulkUpdatePriceDialog />);

		expect(screen.getByText("Annuler")).toBeDisabled();
		expect(screen.getByText("Modification...")).toBeDisabled();
	});
});
