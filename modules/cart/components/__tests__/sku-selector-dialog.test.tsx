import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockIsOpen, mockDialogData, mockClose } = vi.hoisted(() => ({
	mockIsOpen: { value: false },
	mockDialogData: { value: null as Record<string, unknown> | null },
	mockClose: vi.fn(),
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

vi.mock("@/shared/providers/dialog-store-provider", () => ({
	useDialog: () => ({
		isOpen: mockIsOpen.value,
		data: mockDialogData.value,
		close: mockClose,
	}),
}));

vi.mock("@/modules/cart/hooks/use-add-to-cart", () => ({
	useAddToCart: () => ({ action: vi.fn(), isPending: false }),
}));

vi.mock("@/shared/components/forms", () => ({
	useAppForm: () => ({
		Field: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
		AppField: ({ children }: { name: string; children: (field: unknown) => React.ReactNode }) =>
			children({
				state: { value: null, meta: { errors: [] } },
				handleChange: vi.fn(),
			}),
		Subscribe: ({
			children,
		}: {
			children: (v: unknown) => React.ReactNode;
			selector?: (s: unknown) => unknown;
		}) =>
			children({ color: null, material: null, size: null, quantity: 1, _validationError: null }),
		handleSubmit: vi.fn(),
		reset: vi.fn(),
		setFieldValue: vi.fn(),
		state: {
			values: { color: null, material: null, size: null, quantity: 1, _validationError: null },
		},
	}),
}));

vi.mock("@/shared/components/responsive-dialog", () => ({
	ResponsiveDialog: ({
		open,
		children,
	}: {
		open: boolean;
		onOpenChange?: (v: boolean) => void;
		children: React.ReactNode;
	}) => (open ? <div data-testid="responsive-dialog">{children}</div> : null),
	ResponsiveDialogContent: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="dialog-content">{children}</div>
	),
	ResponsiveDialogHeader: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="dialog-header">{children}</div>
	),
	ResponsiveDialogTitle: ({ children }: { children: React.ReactNode }) => (
		<h2 data-testid="dialog-title">{children}</h2>
	),
	ResponsiveDialogDescription: ({ children }: { children: React.ReactNode }) => (
		<p data-testid="dialog-description">{children}</p>
	),
	ResponsiveDialogFooter: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="dialog-footer">{children}</div>
	),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		disabled,
		type,
		onClick,
		"aria-busy": ariaBusy,
	}: {
		children: React.ReactNode;
		disabled?: boolean;
		type?: string;
		onClick?: () => void;
		"aria-busy"?: boolean;
	}) => (
		<button
			disabled={disabled}
			type={type as "button" | "submit" | "reset"}
			onClick={onClick}
			aria-busy={ariaBusy}
		>
			{children}
		</button>
	),
}));

vi.mock("@/shared/components/ui/skeleton", () => ({
	Skeleton: ({ className }: { className?: string }) => (
		<div data-testid="skeleton" className={className} />
	),
}));

vi.mock("next/image", () => ({
	default: ({ src, alt }: { src: string; alt: string }) => (
		// eslint-disable-next-line @next/next/no-img-element
		<img src={src} alt={alt} />
	),
}));

vi.mock("next/link", () => ({
	default: ({ href, children }: { href: string; children: React.ReactNode }) => (
		<a href={href}>{children}</a>
	),
}));

vi.mock("next/dynamic", () => ({
	default: () => () => <div data-testid="dynamic-component" />,
}));

vi.mock("motion/react", () => ({
	m: {
		div: ({ children, className }: { children: React.ReactNode; className?: string }) => (
			<div className={className}>{children}</div>
		),
	},
	AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	useReducedMotion: () => false,
}));

vi.mock("lucide-react", () => ({
	ArrowRight: () => <svg data-testid="icon-arrow-right" />,
	Check: () => <svg data-testid="icon-check" />,
	Minus: () => <svg data-testid="icon-minus" />,
	Plus: () => <svg data-testid="icon-plus" />,
}));

vi.mock("@/shared/components/scroll-fade", () => ({
	default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/modules/products/services/product-display.service", () => ({
	getPrimaryImageForList: () => ({
		url: "https://example.com/photo.jpg",
		alt: "Photo produit",
		blurDataUrl: null,
	}),
}));

vi.mock("@/modules/products/services/product-pricing.service", () => ({
	hasActiveDiscount: () => false,
	calculateDiscountPercent: () => 0,
}));

vi.mock("@/modules/colors/utils/color-contrast.utils", () => ({
	isLightColor: () => false,
}));

vi.mock("@/shared/hooks/use-radio-group-keyboard", () => ({
	useRadioGroupKeyboard: () => ({ handleKeyDown: vi.fn() }),
}));

vi.mock("@/shared/utils/format-euro", () => ({
	formatEuro: (cents: number) => `${(cents / 100).toFixed(2)} €`,
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@/shared/utils/generate-slug", () => ({
	slugify: (s: string) => s,
}));

vi.mock("@/modules/products/constants/product-texts.constants", () => ({
	PRODUCT_TYPES_REQUIRING_SIZE: [],
}));

vi.mock("@/shared/constants/cache-tags", () => ({
	STOCK_THRESHOLDS: { LOW: 3 },
}));

vi.mock("@/modules/cart/constants/cart", () => ({
	MAX_QUANTITY_PER_ORDER: 10,
	MAX_CART_ITEMS: 50,
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { SkuSelectorDialog } from "../sku-selector-dialog";

// ============================================================================
// TESTS
// ============================================================================

afterEach(cleanup);

describe("SkuSelectorDialog", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockIsOpen.value = false;
		mockDialogData.value = null;
	});

	it("renders nothing when dialog is closed", () => {
		mockIsOpen.value = false;
		const { container } = render(
			<SkuSelectorDialog
				cart={{ items: [], appliedDiscountCode: null, discountAmountCache: null }}
			/>,
		);
		expect(container.firstChild).toBeNull();
	});

	it("renders dialog when open with product data", () => {
		mockIsOpen.value = true;
		mockDialogData.value = {
			product: {
				id: "p-1",
				title: "Bague étoile",
				slug: "bague-etoile",
				skus: [
					{
						id: "sku-1",
						isActive: true,
						priceInclTax: 9900,
						images: [],
						colors: [],
						materials: [],
						size: null,
					},
				],
			},
			preselectedColor: null,
		};
		render(
			<SkuSelectorDialog
				cart={{ items: [], appliedDiscountCode: null, discountAmountCache: null }}
			/>,
		);
		expect(screen.getByTestId("responsive-dialog")).toBeInTheDocument();
	});

	it("renders dialog title with product name", () => {
		mockIsOpen.value = true;
		mockDialogData.value = {
			product: {
				id: "p-1",
				title: "Bague étoile",
				slug: "bague-etoile",
				skus: [
					{
						id: "sku-1",
						isActive: true,
						priceInclTax: 9900,
						images: [],
						colors: [],
						materials: [],
						size: null,
					},
				],
			},
			preselectedColor: null,
		};
		render(
			<SkuSelectorDialog
				cart={{ items: [], appliedDiscountCode: null, discountAmountCache: null }}
			/>,
		);
		expect(screen.getByTestId("dialog-title")).toHaveTextContent("Bague étoile");
	});
});
