import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Locale-independent price formatting
vi.mock("@/shared/utils/format-euro", () => ({
	formatEuro: (cents: number) => `${(cents / 100).toFixed(2)} €`,
}));

// Stub out the motion library — animation not relevant for unit tests
vi.mock("motion/react", () => ({
	m: new Proxy(
		{},
		{
			get:
				(_target, tag: string) =>
				({ children, ...rest }: any) => {
					const Tag = tag as keyof React.JSX.IntrinsicElements;
					return <Tag {...rest}>{children}</Tag>;
				},
		},
	),
	useReducedMotion: () => false,
}));

// Stub out the NotifyBackInStockButton — not under test
vi.mock("@/modules/wishlist/components/notify-back-in-stock-button", () => ({
	NotifyBackInStockButton: ({
		productTitle,
	}: {
		productId: string;
		productTitle: string;
		isInWishlist: boolean;
	}) => <button data-testid="notify-btn">{`Notifier : ${productTitle}`}</button>,
}));

// Stub out Badge — pass-through so text assertions still work
vi.mock("@/shared/components/ui/badge", () => ({
	Badge: ({
		children,
		role,
		"aria-label": ariaLabel,
	}: {
		children: React.ReactNode;
		role?: string;
		"aria-label"?: string;
		[key: string]: unknown;
	}) => (
		<span role={role} aria-label={ariaLabel}>
			{children}
		</span>
	),
}));

// Real pricing service — we want the actual logic exercised
vi.unmock("@/modules/products/services/product-pricing.service");

import { ProductPriceDisplay } from "../product-price-display";
import type { GetProductReturn, ProductSku } from "@/modules/products/types/product.types";

afterEach(cleanup);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeSku(overrides: Partial<ProductSku> = {}): ProductSku {
	return {
		id: "sku-1",
		sku: "TEST-SKU",
		priceInclTax: 4999,
		compareAtPrice: null,
		inventory: 10,
		isActive: true,
		isDefault: true,
		size: null,
		colorId: null,
		materialId: null,
		material: null,
		color: null,
		media: [],
		...overrides,
	} as unknown as ProductSku;
}

function makeProduct(skus: ProductSku[] = [makeSku()]): GetProductReturn {
	return {
		id: "prod-1",
		title: "Bracelet Lune",
		slug: "bracelet-lune",
		skus,
		collections: [],
		type: null,
	} as unknown as GetProductReturn;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("ProductPriceDisplay", () => {
	describe("when no SKU is selected", () => {
		it("renders the minimum price from available SKUs", () => {
			const skus = [makeSku({ priceInclTax: 3000 }), makeSku({ id: "sku-2", priceInclTax: 5000 })];
			render(<ProductPriceDisplay selectedSku={null} product={makeProduct(skus)} />);

			expect(screen.getByText("30.00 €")).toBeInTheDocument();
		});

		it('shows the "À partir de" badge when multiple SKU prices differ', () => {
			const skus = [makeSku({ priceInclTax: 3000 }), makeSku({ id: "sku-2", priceInclTax: 5000 })];
			render(<ProductPriceDisplay selectedSku={null} product={makeProduct(skus)} />);

			expect(screen.getByText("À partir de")).toBeInTheDocument();
		});

		it("shows a dash when no SKUs exist", () => {
			render(<ProductPriceDisplay selectedSku={null} product={makeProduct([])} />);

			expect(screen.getByText("—")).toBeInTheDocument();
		});
	});

	describe("when a SKU is selected", () => {
		it("renders the selected SKU price", () => {
			const sku = makeSku({ priceInclTax: 4999 });
			render(<ProductPriceDisplay selectedSku={sku} product={makeProduct([sku])} />);

			expect(screen.getByText("49.99 €")).toBeInTheDocument();
		});

		it("renders a discount badge and savings message when compareAtPrice is set", () => {
			const sku = makeSku({ priceInclTax: 3500, compareAtPrice: 5000 });
			render(<ProductPriceDisplay selectedSku={sku} product={makeProduct([sku])} />);

			// Discount badge: -30% (round((5000-3500)/5000*100))
			expect(screen.getByText(/-30%/)).toBeInTheDocument();

			// Savings message
			expect(screen.getByText(/Économisez/)).toBeInTheDocument();
			expect(screen.getByText(/15\.00 €/)).toBeInTheDocument();
		});

		it("shows the in-stock badge when inventory is above the low-stock threshold", () => {
			const sku = makeSku({ inventory: 10, isActive: true });
			render(<ProductPriceDisplay selectedSku={sku} product={makeProduct([sku])} />);

			expect(screen.getByText("En stock")).toBeInTheDocument();
		});

		it("shows the low-stock badge when inventory is limited (≤ threshold)", () => {
			const sku = makeSku({ inventory: 2, isActive: true });
			render(<ProductPriceDisplay selectedSku={sku} product={makeProduct([sku])} />);

			expect(screen.getByText(/Plus que/i)).toBeInTheDocument();
			expect(screen.getByText(/2/)).toBeInTheDocument();
		});

		it("shows the out-of-stock badge and notify button when inventory is 0", () => {
			const sku = makeSku({ inventory: 0, isActive: true });
			render(
				<ProductPriceDisplay selectedSku={sku} product={makeProduct([sku])} isInWishlist={false} />,
			);

			expect(screen.getByText("Rupture de stock")).toBeInTheDocument();
			expect(screen.getByTestId("notify-btn")).toBeInTheDocument();
		});

		it("renders the FOMO carts badge when cartsCount is provided and product is in stock", () => {
			const sku = makeSku({ inventory: 10, isActive: true });
			render(<ProductPriceDisplay selectedSku={sku} product={makeProduct([sku])} cartsCount={3} />);

			expect(screen.getByText(/3/)).toBeInTheDocument();
			// Should use plural form
			expect(screen.getByText(/paniers/i)).toBeInTheDocument();
		});

		it("does not render the FOMO badge when cartsCount is 0", () => {
			const sku = makeSku({ inventory: 10, isActive: true });
			render(<ProductPriceDisplay selectedSku={sku} product={makeProduct([sku])} cartsCount={0} />);

			expect(screen.queryByText(/panier/i)).not.toBeInTheDocument();
		});
	});
});
