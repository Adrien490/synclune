import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockClose } = vi.hoisted(() => ({
	mockClose: vi.fn(),
}));

let mockDialogState: {
	isOpen: boolean;
	data: { skuId: string; skuName: string; currentStock: number } | null;
	close: typeof mockClose;
} = {
	isOpen: false,
	data: null,
	close: mockClose,
};

let mockFormState = {
	form: {
		reset: vi.fn(),
		setFieldValue: vi.fn(),
		Field: ({
			children,
		}: {
			name: string;
			children: (
				field: { state: { value: number | string } } & Record<string, unknown>,
			) => React.ReactNode;
		}) =>
			children({
				state: { value: 0 },
				handleChange: vi.fn(),
			}),
	},
	action: vi.fn(),
	isPending: false,
	adjustment: 0,
	newStock: 10,
	isValid: false,
};

vi.mock("@/shared/providers/dialog-store-provider", () => ({
	useDialog: () => mockDialogState,
}));

vi.mock("@/modules/skus/hooks/use-adjust-stock-form", () => ({
	useAdjustStockForm: () => mockFormState,
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
	ResponsiveDialogTitle: ({ children }: { children: React.ReactNode; className?: string }) => (
		<h2>{children}</h2>
	),
	ResponsiveDialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
	ResponsiveDialogFooter: ({ children }: { children: React.ReactNode; className?: string }) => (
		<div>{children}</div>
	),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		disabled,
		type,
		onClick,
		"aria-label": ariaLabel,
	}: {
		children: React.ReactNode;
		disabled?: boolean;
		type?: string;
		onClick?: () => void;
		"aria-label"?: string;
	}) => (
		<button
			disabled={disabled}
			type={type as "button" | "submit" | undefined}
			onClick={onClick}
			aria-label={ariaLabel}
		>
			{children}
		</button>
	),
}));

vi.mock("@/shared/components/ui/input", () => ({
	Input: (props: Record<string, unknown>) => <input {...props} />,
}));

vi.mock("@/shared/components/ui/label", () => ({
	Label: ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
		<label htmlFor={htmlFor}>{children}</label>
	),
}));

vi.mock("lucide-react", () => ({
	ArrowRight: () => <span data-testid="icon-arrow-right" />,
	Minus: () => <span data-testid="icon-minus" />,
	Package: ({ className }: { className?: string }) => (
		<span data-testid="icon-package" className={className} />
	),
	Plus: () => <span data-testid="icon-plus" />,
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(" "),
}));

import { AdjustStockDialog } from "../adjust-stock-dialog";

// ============================================================================
// TESTS
// ============================================================================

describe("AdjustStockDialog", () => {
	beforeEach(() => {
		cleanup();
		vi.clearAllMocks();
		mockFormState = {
			form: {
				reset: vi.fn(),
				setFieldValue: vi.fn(),
				Field: ({
					children,
				}: {
					name: string;
					children: (
						field: { state: { value: number | string } } & Record<string, unknown>,
					) => React.ReactNode;
				}) =>
					children({
						state: { value: 0 },
						handleChange: vi.fn(),
					}),
			},
			action: vi.fn(),
			isPending: false,
			adjustment: 0,
			newStock: 10,
			isValid: false,
		};
		mockDialogState = {
			isOpen: false,
			data: null,
			close: mockClose,
		};
	});

	// ─── Closed state ─────────────────────────────────────────────────────────

	it("renders nothing when dialog is closed", () => {
		render(<AdjustStockDialog />);

		expect(screen.queryByTestId("responsive-dialog")).not.toBeInTheDocument();
	});

	it("renders nothing when dialog is open but data is null", () => {
		mockDialogState = { ...mockDialogState, isOpen: true, data: null };

		render(<AdjustStockDialog />);

		expect(screen.queryByText("Ajuster le stock")).not.toBeInTheDocument();
	});

	// ─── Open state ───────────────────────────────────────────────────────────

	it("renders dialog when open with data", () => {
		mockDialogState = {
			isOpen: true,
			data: { skuId: "sku_1", skuName: "Bague Or - T52", currentStock: 10 },
			close: mockClose,
		};

		render(<AdjustStockDialog />);

		expect(screen.getByTestId("responsive-dialog")).toBeInTheDocument();
	});

	it("shows 'Ajuster le stock' title when open", () => {
		mockDialogState = {
			isOpen: true,
			data: { skuId: "sku_1", skuName: "Bague Or - T52", currentStock: 10 },
			close: mockClose,
		};

		render(<AdjustStockDialog />);

		expect(screen.getByText("Ajuster le stock")).toBeInTheDocument();
	});

	it("displays sku name in description", () => {
		mockDialogState = {
			isOpen: true,
			data: { skuId: "sku_1", skuName: "Bague Or - T52", currentStock: 10 },
			close: mockClose,
		};

		render(<AdjustStockDialog />);

		expect(screen.getByText("Bague Or - T52")).toBeInTheDocument();
	});

	it("shows current stock value", () => {
		mockDialogState = {
			isOpen: true,
			data: { skuId: "sku_1", skuName: "Bague Or - T52", currentStock: 10 },
			close: mockClose,
		};

		render(<AdjustStockDialog />);

		// Both "Actuel" and "Nouveau" panels display 10 (adjustment=0, newStock=10)
		const matches = screen.getAllByText("10");
		expect(matches.length).toBeGreaterThanOrEqual(1);
	});

	it("renders decrement and increment buttons", () => {
		mockDialogState = {
			isOpen: true,
			data: { skuId: "sku_1", skuName: "Bague Or - T52", currentStock: 10 },
			close: mockClose,
		};

		render(<AdjustStockDialog />);

		expect(screen.getByLabelText("Diminuer de 1")).toBeInTheDocument();
		expect(screen.getByLabelText("Augmenter de 1")).toBeInTheDocument();
	});

	it("renders cancel and confirm buttons", () => {
		mockDialogState = {
			isOpen: true,
			data: { skuId: "sku_1", skuName: "Bague Or - T52", currentStock: 10 },
			close: mockClose,
		};

		render(<AdjustStockDialog />);

		expect(screen.getByText("Annuler")).toBeInTheDocument();
		expect(screen.getByText("Confirmer")).toBeInTheDocument();
	});

	// ─── Pending state ────────────────────────────────────────────────────────

	it("shows 'Ajustement…' text when pending", () => {
		mockDialogState = {
			isOpen: true,
			data: { skuId: "sku_1", skuName: "Bague Or - T52", currentStock: 10 },
			close: mockClose,
		};
		mockFormState = { ...mockFormState, isPending: true };

		render(<AdjustStockDialog />);

		expect(screen.getByText("Ajustement…")).toBeInTheDocument();
	});
});
