import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockOpenAlert, mockOpenDialog, mockSetAsDefault, mockToggleStatus, mockDuplicate } =
	vi.hoisted(() => ({
		mockOpenAlert: vi.fn(),
		mockOpenDialog: vi.fn(),
		mockSetAsDefault: vi.fn(),
		mockToggleStatus: vi.fn(),
		mockDuplicate: vi.fn(),
	}));

// Mock sibling components (imported for their exported constants) to avoid
// transitive auth/Stripe/form imports
vi.mock("../delete-sku-alert-dialog", () => ({
	DELETE_PRODUCT_SKU_DIALOG_ID: "delete-product-sku",
}));
vi.mock("../adjust-stock-dialog", () => ({
	ADJUST_STOCK_DIALOG_ID: "adjust-sku-stock",
}));
vi.mock("../update-price-dialog", () => ({
	UPDATE_PRICE_DIALOG_ID: "update-sku-price",
}));

vi.mock("@/shared/providers/alert-dialog-store-provider", () => ({
	useAlertDialog: () => ({
		isOpen: false,
		data: null,
		close: vi.fn(),
		open: mockOpenAlert,
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

vi.mock("@/modules/skus/hooks/use-set-default-sku", () => ({
	useSetDefaultSku: () => ({
		setAsDefault: mockSetAsDefault,
		isPending: false,
	}),
}));

vi.mock("@/modules/skus/hooks/use-update-sku-status", () => ({
	useUpdateProductSkuStatus: () => ({
		toggleStatus: mockToggleStatus,
		isPending: false,
	}),
}));

vi.mock("@/modules/skus/hooks/use-duplicate-sku", () => ({
	useDuplicateSku: () => ({
		duplicate: mockDuplicate,
		isPending: false,
	}),
}));

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/shared/hooks/use-haptic", () => ({
	useHaptic: () => vi.fn(),
	triggerHaptic: vi.fn(),
}));

vi.mock("@/shared/utils/toast", () => ({
	toast: { success: vi.fn(), error: vi.fn(), loading: vi.fn(), dismiss: vi.fn() },
}));

vi.mock("@/shared/utils/with-view-transition", () => ({
	withViewTransition: (fn: () => void) => fn(),
}));

vi.mock("next/link", () => ({
	default: ({ href, children }: { href: string; children: React.ReactNode }) => (
		<a href={href}>{children}</a>
	),
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
		"aria-label": ariaLabel,
	}: {
		children: React.ReactNode;
		disabled?: boolean;
		type?: string;
		onClick?: () => void;
		variant?: string;
		size?: string;
		className?: string;
		"aria-label"?: string;
	}) => (
		<button
			disabled={disabled}
			type={type as "button" | "submit" | undefined}
			onClick={onClick}
			data-variant={variant}
			data-size={size}
			className={className}
			aria-label={ariaLabel}
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

vi.mock("lucide-react", () => ({
	Check: () => <span data-testid="icon-check" />,
	Copy: () => <span data-testid="icon-copy" />,
	DollarSign: () => <span data-testid="icon-dollar" />,
	EllipsisVertical: () => <span data-testid="icon-more-vertical" />,
	Eye: () => <span data-testid="icon-eye" />,
	Package: () => <span data-testid="icon-package" />,
	Pencil: () => <span data-testid="icon-pencil" />,
	Power: () => <span data-testid="icon-power" />,
	PowerOff: () => <span data-testid="icon-power-off" />,
	Trash2: () => <span data-testid="icon-trash" />,
}));

import { ProductSkuRowActions } from "../sku-row-actions";

// ============================================================================
// HELPERS
// ============================================================================

const defaultProps = {
	skuId: "sku_1",
	skuName: "Bague Or - T52",
	productSlug: "bague-or",
	isDefault: false,
	isActive: true,
	inventory: 5,
	priceInclTax: 5000,
	compareAtPrice: null,
};

// ============================================================================
// TESTS
// ============================================================================

describe("ProductSkuRowActions", () => {
	beforeEach(() => {
		cleanup();
		vi.clearAllMocks();
	});

	// ─── Trigger button ───────────────────────────────────────────────────────

	it("renders trigger button with aria-label", () => {
		render(<ProductSkuRowActions {...defaultProps} />);

		expect(screen.getByLabelText("Actions pour cette variante")).toBeInTheDocument();
	});

	it("renders the action menu", () => {
		render(<ProductSkuRowActions {...defaultProps} />);

		expect(screen.getByRole("menu", { name: "Actions variante" })).toBeInTheDocument();
	});

	// ─── Common actions (always present) ──────────────────────────────────────

	it("renders 'Modifier' link item", () => {
		render(<ProductSkuRowActions {...defaultProps} />);

		expect(screen.getByText("Modifier")).toBeInTheDocument();
	});

	it("'Modifier' link points to correct edit URL", () => {
		render(<ProductSkuRowActions {...defaultProps} />);

		const link = screen.getByText("Modifier").closest("a");
		expect(link).toHaveAttribute(
			"href",
			"/admin/catalogue/produits/bague-or/variantes/sku_1/modifier",
		);
	});

	it("renders 'Ajuster le stock' item", () => {
		render(<ProductSkuRowActions {...defaultProps} />);

		expect(screen.getByText("Ajuster le stock")).toBeInTheDocument();
	});

	it("renders 'Modifier le prix' item", () => {
		render(<ProductSkuRowActions {...defaultProps} />);

		expect(screen.getByText("Modifier le prix")).toBeInTheDocument();
	});

	it("renders 'Dupliquer' item", () => {
		render(<ProductSkuRowActions {...defaultProps} />);

		expect(screen.getByText("Dupliquer")).toBeInTheDocument();
	});

	// ─── Non-default SKU ──────────────────────────────────────────────────────

	it("shows 'Désactiver' for active non-default sku", () => {
		render(<ProductSkuRowActions {...defaultProps} isActive={true} isDefault={false} />);

		expect(screen.getByText("Désactiver")).toBeInTheDocument();
	});

	it("shows 'Activer' for inactive non-default sku", () => {
		render(<ProductSkuRowActions {...defaultProps} isActive={false} isDefault={false} />);

		expect(screen.getByText("Activer")).toBeInTheDocument();
	});

	it("renders 'Définir par défaut' for non-default sku", () => {
		render(<ProductSkuRowActions {...defaultProps} isDefault={false} />);

		expect(screen.getByText("Définir par défaut")).toBeInTheDocument();
	});

	it("renders 'Supprimer' for non-default sku", () => {
		render(<ProductSkuRowActions {...defaultProps} isDefault={false} />);

		expect(screen.getByText("Supprimer")).toBeInTheDocument();
	});

	// ─── Default SKU ──────────────────────────────────────────────────────────

	it("shows 'Variante par défaut' disabled item for default sku", () => {
		render(<ProductSkuRowActions {...defaultProps} isDefault={true} />);

		expect(screen.getByText("Variante par défaut")).toBeInTheDocument();
	});

	it("does not show 'Désactiver' for default sku", () => {
		render(<ProductSkuRowActions {...defaultProps} isDefault={true} />);

		expect(screen.queryByText("Désactiver")).not.toBeInTheDocument();
	});

	it("does not show 'Activer' for default sku", () => {
		render(<ProductSkuRowActions {...defaultProps} isDefault={true} isActive={false} />);

		expect(screen.queryByText("Activer")).not.toBeInTheDocument();
	});

	it("does not show 'Définir par défaut' for default sku", () => {
		render(<ProductSkuRowActions {...defaultProps} isDefault={true} />);

		expect(screen.queryByText("Définir par défaut")).not.toBeInTheDocument();
	});

	it("does not show 'Supprimer' for default sku", () => {
		render(<ProductSkuRowActions {...defaultProps} isDefault={true} />);

		expect(screen.queryByText("Supprimer")).not.toBeInTheDocument();
	});
});
