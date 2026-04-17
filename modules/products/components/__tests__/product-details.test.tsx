import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Hoisted mocks
const { mockUseSelectedSku, mockUseReducedMotion } = vi.hoisted(() => ({
	mockUseSelectedSku: vi.fn(),
	mockUseReducedMotion: vi.fn(() => false),
}));

vi.mock("@/modules/skus/hooks/use-selected-sku", () => ({
	useSelectedSku: mockUseSelectedSku,
}));

vi.mock("motion/react", () => ({
	m: new Proxy(
		{},
		{
			get:
				(_target, tag: string) =>
				({ children, ...rest }: { children?: React.ReactNode; [key: string]: unknown }) => {
					const Tag = tag as keyof React.JSX.IntrinsicElements;
					return <Tag {...rest}>{children}</Tag>;
				},
		},
	),
	AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	useReducedMotion: mockUseReducedMotion,
}));

// Stub child components — not under test
vi.mock("../product-price-display", () => ({
	ProductPriceDisplay: ({
		selectedSku,
		cartsCount,
		isInWishlist,
	}: {
		selectedSku: { id: string };
		product: unknown;
		cartsCount?: number;
		isInWishlist?: boolean;
	}) => (
		<div data-testid="product-price-display">
			<span data-testid="sku-id">{selectedSku.id}</span>
			{cartsCount !== undefined && <span data-testid="carts-count">{cartsCount}</span>}
			{isInWishlist && <span data-testid="in-wishlist">in wishlist</span>}
		</div>
	),
}));

vi.mock("../product-characteristics", () => ({
	ProductCharacteristics: ({ selectedSku }: { selectedSku: { id: string } }) => (
		<div data-testid="product-characteristics" data-sku-id={selectedSku.id} />
	),
}));

vi.mock("../product-reassurance", () => ({
	ProductReassurance: () => <div data-testid="product-reassurance" />,
}));

vi.mock("../delivery-estimator", () => ({
	DeliveryEstimator: () => <div data-testid="delivery-estimator" />,
}));

vi.mock("../product-customization-link", () => ({
	ProductCustomizationLink: ({ product }: { product: { slug: string } }) => (
		<div data-testid="product-customization-link" data-slug={product.slug} />
	),
}));

vi.mock("../product-highlights", () => ({
	ProductHighlights: ({ product: _product }: { product: unknown }) => (
		<div data-testid="product-highlights" />
	),
}));

vi.mock("@/modules/cart/components/add-to-cart-form", () => ({
	AddToCartForm: ({ selectedSku }: { product: unknown; selectedSku: { id: string } }) => (
		<div data-testid="add-to-cart-form" data-sku-id={selectedSku.id} />
	),
}));

vi.mock("../product-care-info", () => ({
	ProductCareInfo: ({ primaryMaterial }: { primaryMaterial?: string }) => (
		<div data-testid="product-care-info" data-material={primaryMaterial} />
	),
}));

vi.mock("@/modules/skus/components/sku-selector", () => ({
	VariantSelector: () => <div data-testid="variant-selector" />,
}));

vi.mock("@/shared/components/ui/separator", () => ({
	Separator: () => <hr data-testid="separator" />,
}));

import { ProductDetails } from "../product-details";
import type { GetProductReturn, ProductSku } from "@/modules/products/types/product.types";

afterEach(cleanup);

// ─── Fixtures ──────────────────────────────────────────────────────────────

function makeProductSku(overrides: Partial<ProductSku> = {}): ProductSku {
	return {
		id: "sku-1",
		price: 4800,
		compareAtPrice: null,
		material: { id: "m1", name: "Argent 925", slug: "argent-925" },
		color: null,
		size: null,
		inventory: 10,
		sku: "BAGUE-001",
		images: [],
		...overrides,
	} as unknown as ProductSku;
}

function makeProduct(overrides: Partial<GetProductReturn> = {}): GetProductReturn {
	return {
		id: "prod-1",
		slug: "bague-lune-argent",
		title: "Bague Lune Argent",
		description: "Une belle bague en argent.",
		status: "PUBLIC",
		skus: [makeProductSku()],
		...overrides,
	} as unknown as GetProductReturn;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ProductDetails", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockUseReducedMotion.mockReturnValue(false);
		mockUseSelectedSku.mockReturnValue({ selectedSku: null });
	});

	it("renders ProductPriceDisplay with defaultSku when no selectedSku", () => {
		const defaultSku = makeProductSku({ id: "sku-default" });
		mockUseSelectedSku.mockReturnValue({ selectedSku: null });

		render(<ProductDetails product={makeProduct()} defaultSku={defaultSku} />);

		expect(screen.getByTestId("product-price-display")).toBeInTheDocument();
		expect(screen.getByTestId("sku-id").textContent).toBe("sku-default");
	});

	it("renders ProductPriceDisplay with selectedSku when available", () => {
		const selectedSku = makeProductSku({ id: "sku-selected" });
		mockUseSelectedSku.mockReturnValue({ selectedSku });

		render(<ProductDetails product={makeProduct()} defaultSku={makeProductSku()} />);

		expect(screen.getByTestId("sku-id").textContent).toBe("sku-selected");
	});

	it("passes cartsCount to ProductPriceDisplay", () => {
		mockUseSelectedSku.mockReturnValue({ selectedSku: null });

		render(<ProductDetails product={makeProduct()} defaultSku={makeProductSku()} cartsCount={7} />);

		expect(screen.getByTestId("carts-count").textContent).toBe("7");
	});

	it("passes isInWishlist to ProductPriceDisplay", () => {
		mockUseSelectedSku.mockReturnValue({ selectedSku: null });

		render(
			<ProductDetails product={makeProduct()} defaultSku={makeProductSku()} isInWishlist={true} />,
		);

		expect(screen.getByTestId("in-wishlist")).toBeInTheDocument();
	});

	it("renders VariantSelector", () => {
		mockUseSelectedSku.mockReturnValue({ selectedSku: null });

		render(<ProductDetails product={makeProduct()} defaultSku={makeProductSku()} />);

		expect(screen.getByTestId("variant-selector")).toBeInTheDocument();
	});

	it("renders AddToCartForm with current sku", () => {
		const selectedSku = makeProductSku({ id: "sku-selected" });
		mockUseSelectedSku.mockReturnValue({ selectedSku });

		render(<ProductDetails product={makeProduct()} defaultSku={makeProductSku()} />);

		const form = screen.getByTestId("add-to-cart-form");
		expect(form).toHaveAttribute("data-sku-id", "sku-selected");
	});

	it("renders DeliveryEstimator", () => {
		mockUseSelectedSku.mockReturnValue({ selectedSku: null });

		render(<ProductDetails product={makeProduct()} defaultSku={makeProductSku()} />);

		expect(screen.getByTestId("delivery-estimator")).toBeInTheDocument();
	});

	it("renders ProductReassurance", () => {
		mockUseSelectedSku.mockReturnValue({ selectedSku: null });

		render(<ProductDetails product={makeProduct()} defaultSku={makeProductSku()} />);

		expect(screen.getByTestId("product-reassurance")).toBeInTheDocument();
	});

	it("renders ProductCharacteristics with current sku", () => {
		const selectedSku = makeProductSku({ id: "sku-chars" });
		mockUseSelectedSku.mockReturnValue({ selectedSku });

		render(<ProductDetails product={makeProduct()} defaultSku={makeProductSku()} />);

		const chars = screen.getByTestId("product-characteristics");
		expect(chars).toHaveAttribute("data-sku-id", "sku-chars");
	});

	it("renders a separator", () => {
		mockUseSelectedSku.mockReturnValue({ selectedSku: null });

		render(<ProductDetails product={makeProduct()} defaultSku={makeProductSku()} />);

		expect(screen.getByTestId("separator")).toBeInTheDocument();
	});

	it("renders ProductHighlights", () => {
		mockUseSelectedSku.mockReturnValue({ selectedSku: null });

		render(<ProductDetails product={makeProduct()} defaultSku={makeProductSku()} />);

		expect(screen.getByTestId("product-highlights")).toBeInTheDocument();
	});

	describe("product description", () => {
		it("renders the description when provided", () => {
			mockUseSelectedSku.mockReturnValue({ selectedSku: null });

			render(
				<ProductDetails
					product={makeProduct({ description: "Une belle bague en argent." })}
					defaultSku={makeProductSku()}
				/>,
			);

			expect(screen.getByText("Une belle bague en argent.")).toBeInTheDocument();
		});

		it("renders multi-line description as separate paragraphs", () => {
			mockUseSelectedSku.mockReturnValue({ selectedSku: null });

			render(
				<ProductDetails
					product={makeProduct({ description: "Ligne 1\nLigne 2\nLigne 3" })}
					defaultSku={makeProductSku()}
				/>,
			);

			expect(screen.getByText("Ligne 1")).toBeInTheDocument();
			expect(screen.getByText("Ligne 2")).toBeInTheDocument();
			expect(screen.getByText("Ligne 3")).toBeInTheDocument();
		});

		it("does not render description section when description is null", () => {
			mockUseSelectedSku.mockReturnValue({ selectedSku: null });

			const { container } = render(
				<ProductDetails
					product={makeProduct({ description: null })}
					defaultSku={makeProductSku()}
				/>,
			);

			expect(container.querySelector("#product-description")).not.toBeInTheDocument();
		});

		it("does not render description section when description is empty string", () => {
			mockUseSelectedSku.mockReturnValue({ selectedSku: null });

			const { container } = render(
				<ProductDetails product={makeProduct({ description: "" })} defaultSku={makeProductSku()} />,
			);

			expect(container.querySelector("#product-description")).not.toBeInTheDocument();
		});

		it("description container has id='product-description' and itemProp='description'", () => {
			mockUseSelectedSku.mockReturnValue({ selectedSku: null });

			const { container } = render(
				<ProductDetails
					product={makeProduct({ description: "Desc." })}
					defaultSku={makeProductSku()}
				/>,
			);

			const descEl = container.querySelector("#product-description");
			expect(descEl).toBeInTheDocument();
			expect(descEl).toHaveAttribute("itemprop", "description");
		});
	});

	describe("ProductCareInfo", () => {
		it("renders ProductCareInfo with material name from current sku", () => {
			mockUseSelectedSku.mockReturnValue({ selectedSku: null });

			render(
				<ProductDetails
					product={makeProduct()}
					defaultSku={makeProductSku({
						material: {
							id: "m1",
							name: "Or 18k",
							slug: "or-18k",
						} as unknown as ProductSku["material"],
					})}
				/>,
			);

			const careInfo = screen.getByTestId("product-care-info");
			expect(careInfo).toHaveAttribute("data-material", "Or 18k");
		});

		it("renders ProductCareInfo with no material when sku has no material", () => {
			mockUseSelectedSku.mockReturnValue({ selectedSku: null });

			render(
				<ProductDetails product={makeProduct()} defaultSku={makeProductSku({ material: null })} />,
			);

			const careInfo = screen.getByTestId("product-care-info");
			expect(careInfo).not.toHaveAttribute("data-material");
		});
	});

	describe("reduced motion", () => {
		it("renders correctly with reduced motion preference", () => {
			mockUseReducedMotion.mockReturnValue(true);
			mockUseSelectedSku.mockReturnValue({ selectedSku: null });

			render(<ProductDetails product={makeProduct()} defaultSku={makeProductSku()} />);

			// Component should still render all required children
			expect(screen.getByTestId("product-price-display")).toBeInTheDocument();
			expect(screen.getByTestId("add-to-cart-form")).toBeInTheDocument();
		});
	});
});
