import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockClose, mockUpdatePrice } = vi.hoisted(() => ({
	mockClose: vi.fn(),
	mockUpdatePrice: vi.fn(),
}));

let mockDialogState: {
	isOpen: boolean;
	data: {
		skuId: string;
		skuName: string;
		currentPrice: number;
		currentCompareAtPrice: number | null;
	} | null;
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

vi.mock("@/modules/skus/hooks/use-update-sku-price", () => ({
	useUpdateSkuPrice: () => ({
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
	Input: (props: Record<string, unknown>) => <input data-testid="input" {...props} />,
}));

vi.mock("@/shared/components/ui/label", () => ({
	Label: ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
		<label htmlFor={htmlFor}>{children}</label>
	),
}));

import { UpdatePriceDialog } from "../update-price-dialog";

// ============================================================================
// TESTS
// ============================================================================

describe("UpdatePriceDialog", () => {
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
		render(<UpdatePriceDialog />);

		expect(screen.queryByTestId("responsive-dialog")).not.toBeInTheDocument();
	});

	// ─── Open state ───────────────────────────────────────────────────────────

	it("renders dialog when open", () => {
		mockDialogState = {
			isOpen: true,
			data: {
				skuId: "sku_1",
				skuName: "Bague Or - T52",
				currentPrice: 5000,
				currentCompareAtPrice: null,
			},
			close: mockClose,
		};

		render(<UpdatePriceDialog />);

		expect(screen.getByTestId("responsive-dialog")).toBeInTheDocument();
	});

	it("shows 'Modifier le prix' title when open", () => {
		mockDialogState = {
			isOpen: true,
			data: {
				skuId: "sku_1",
				skuName: "Bague Or - T52",
				currentPrice: 5000,
				currentCompareAtPrice: null,
			},
			close: mockClose,
		};

		render(<UpdatePriceDialog />);

		expect(screen.getByText("Modifier le prix")).toBeInTheDocument();
	});

	it("displays sku name in description", () => {
		mockDialogState = {
			isOpen: true,
			data: {
				skuId: "sku_1",
				skuName: "Bague Or - T52",
				currentPrice: 5000,
				currentCompareAtPrice: null,
			},
			close: mockClose,
		};

		render(<UpdatePriceDialog />);

		expect(screen.getByText("Bague Or - T52")).toBeInTheDocument();
	});

	it("renders price input", () => {
		mockDialogState = {
			isOpen: true,
			data: {
				skuId: "sku_1",
				skuName: "Bague Or - T52",
				currentPrice: 5000,
				currentCompareAtPrice: null,
			},
			close: mockClose,
		};

		render(<UpdatePriceDialog />);

		expect(screen.getByLabelText("Prix final (€)")).toBeInTheDocument();
	});

	it("renders compare at price input", () => {
		mockDialogState = {
			isOpen: true,
			data: {
				skuId: "sku_1",
				skuName: "Bague Or - T52",
				currentPrice: 5000,
				currentCompareAtPrice: null,
			},
			close: mockClose,
		};

		render(<UpdatePriceDialog />);

		expect(screen.getByLabelText("Prix barré (optionnel)")).toBeInTheDocument();
	});

	it("renders cancel and save buttons", () => {
		mockDialogState = {
			isOpen: true,
			data: {
				skuId: "sku_1",
				skuName: "Bague Or - T52",
				currentPrice: 5000,
				currentCompareAtPrice: null,
			},
			close: mockClose,
		};

		render(<UpdatePriceDialog />);

		expect(screen.getByText("Annuler")).toBeInTheDocument();
		expect(screen.getByText("Enregistrer")).toBeInTheDocument();
	});

	// ─── Pending state ────────────────────────────────────────────────────────

	it("shows 'Enregistrement...' when pending", () => {
		mockDialogState = {
			isOpen: true,
			data: {
				skuId: "sku_1",
				skuName: "Bague Or - T52",
				currentPrice: 5000,
				currentCompareAtPrice: null,
			},
			close: mockClose,
		};
		mockIsPending = true;

		render(<UpdatePriceDialog />);

		expect(screen.getByText("Enregistrement...")).toBeInTheDocument();
	});

	it("disables buttons when pending", () => {
		mockDialogState = {
			isOpen: true,
			data: {
				skuId: "sku_1",
				skuName: "Bague Or - T52",
				currentPrice: 5000,
				currentCompareAtPrice: null,
			},
			close: mockClose,
		};
		mockIsPending = true;

		render(<UpdatePriceDialog />);

		expect(screen.getByText("Annuler")).toBeDisabled();
		expect(screen.getByText("Enregistrement...")).toBeDisabled();
	});
});
