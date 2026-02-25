import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Hoisted mocks
const { mockUseAddToCart, mockUseVariantValidation, mockSearchParams } = vi.hoisted(() => ({
	mockUseAddToCart: vi.fn(),
	mockUseVariantValidation: vi.fn(),
	mockSearchParams: vi.fn(),
}));

// Mock useAddToCart hook
vi.mock("@/modules/cart/hooks/use-add-to-cart", () => ({
	useAddToCart: mockUseAddToCart,
}));

// Mock useVariantValidation hook
vi.mock("@/modules/skus/hooks/use-sku-validation", () => ({
	useVariantValidation: mockUseVariantValidation,
}));

// Mock useSearchParams from next/navigation
vi.mock("next/navigation", () => ({
	useSearchParams: mockSearchParams,
}));

// Mock cn
vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

// Mock Button — render a standard button to preserve disabled, type, etc.
vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		disabled,
		type,
		className,
	}: {
		children: React.ReactNode;
		disabled?: boolean;
		type?: "button" | "submit" | "reset";
		className?: string;
	}) => (
		<button type={type} disabled={disabled} className={className}>
			{children}
		</button>
	),
}));

// Mock lucide-react Loader2
vi.mock("lucide-react", () => ({
	Loader2: ({ className }: { className?: string }) => (
		<svg data-testid="loader-icon" className={className} aria-hidden="true" />
	),
}));

import { AddToCartForm } from "../add-to-cart-form";
import type { GetProductReturn, ProductSku } from "@/modules/products/types/product.types";

afterEach(cleanup);

// ─── Fixtures ──────────────────────────────────────────────────────────────

function createSearchParams(params: Record<string, string | null> = {}) {
	return {
		get: (key: string) => params[key] ?? null,
	};
}

function createProduct(overrides: Partial<GetProductReturn> = {}): GetProductReturn {
	return {
		id: "prod-1",
		slug: "bague-lune",
		title: "Bague Lune",
		skus: [],
		type: null,
		...overrides,
	} as unknown as GetProductReturn;
}

function createSku(overrides: Partial<ProductSku> = {}): ProductSku {
	return {
		id: "sku-1",
		inventory: 5,
		isActive: true,
		priceInclTax: 4800,
		compareAtPrice: null,
		color: null,
		material: null,
		size: null,
		...overrides,
	} as unknown as ProductSku;
}

function setupDefaultMocks() {
	mockUseAddToCart.mockReturnValue({
		action: vi.fn(),
		isPending: false,
		state: undefined,
	});
	mockUseVariantValidation.mockReturnValue({
		validationErrors: [],
		isValid: true,
		requiresColor: false,
		requiresMaterial: false,
		requiresSize: false,
	});
	mockSearchParams.mockReturnValue(createSearchParams());
}

// ─── Tests ─────────────────────────────────────────────────────────────────

describe("AddToCartForm", () => {
	describe("when a valid SKU is selected and available", () => {
		it("renders 'Ajouter au panier' button", () => {
			setupDefaultMocks();
			const product = createProduct({ skus: [createSku()] });
			const selectedSku = createSku();

			render(<AddToCartForm product={product} selectedSku={selectedSku} />);

			expect(screen.getByText("Ajouter au panier")).toBeInTheDocument();
		});

		it("renders an enabled submit button", () => {
			setupDefaultMocks();
			const product = createProduct({ skus: [createSku()] });
			const selectedSku = createSku();

			render(<AddToCartForm product={product} selectedSku={selectedSku} />);

			const button = screen.getByRole("button");
			expect(button).not.toBeDisabled();
		});

		it("renders hidden skuId and quantity inputs", () => {
			setupDefaultMocks();
			const sku = createSku({ id: "sku-abc" });
			const product = createProduct({ skus: [sku] });

			const { container } = render(<AddToCartForm product={product} selectedSku={sku} />);

			const skuInput = container.querySelector('input[name="skuId"]') as HTMLInputElement;
			const quantityInput = container.querySelector('input[name="quantity"]') as HTMLInputElement;

			expect(skuInput).not.toBeNull();
			expect(skuInput.value).toBe("sku-abc");
			expect(quantityInput).not.toBeNull();
			expect(quantityInput.value).toBe("1");
		});
	});

	describe("when no SKU is selected (single-SKU product)", () => {
		it("renders 'Produit non disponible' for a product with only one SKU", () => {
			setupDefaultMocks();
			// Single SKU product with no selection
			const product = createProduct({ skus: [createSku()] });

			render(<AddToCartForm product={product} selectedSku={null} />);

			expect(screen.getByText("Produit non disponible")).toBeInTheDocument();
		});

		it("renders disabled button when selectedSku is null", () => {
			setupDefaultMocks();
			const product = createProduct({ skus: [createSku()] });

			render(<AddToCartForm product={product} selectedSku={null} />);

			expect(screen.getByRole("button")).toBeDisabled();
		});
	});

	describe("when no SKU is selected (multi-variant product)", () => {
		it("shows 'Choisissez la couleur' when color is required and not selected", () => {
			mockUseAddToCart.mockReturnValue({ action: vi.fn(), isPending: false, state: undefined });
			mockUseVariantValidation.mockReturnValue({
				validationErrors: ["Veuillez sélectionner une couleur"],
				isValid: false,
				requiresColor: true,
				requiresMaterial: false,
				requiresSize: false,
			});
			mockSearchParams.mockReturnValue(createSearchParams({ color: null }));

			const product = createProduct({ skus: [createSku(), createSku({ id: "sku-2" })] });

			render(<AddToCartForm product={product} selectedSku={null} />);

			expect(screen.getByText("Choisissez la couleur")).toBeInTheDocument();
		});

		it("shows 'Choisissez le matériau' when material is required and not selected", () => {
			mockUseAddToCart.mockReturnValue({ action: vi.fn(), isPending: false, state: undefined });
			mockUseVariantValidation.mockReturnValue({
				validationErrors: ["Veuillez sélectionner un matériau"],
				isValid: false,
				requiresColor: false,
				requiresMaterial: true,
				requiresSize: false,
			});
			mockSearchParams.mockReturnValue(createSearchParams({ material: null }));

			const product = createProduct({ skus: [createSku(), createSku({ id: "sku-2" })] });

			render(<AddToCartForm product={product} selectedSku={null} />);

			expect(screen.getByText("Choisissez le matériau")).toBeInTheDocument();
		});

		it("shows combined message when both color and size are required and missing", () => {
			mockUseAddToCart.mockReturnValue({ action: vi.fn(), isPending: false, state: undefined });
			mockUseVariantValidation.mockReturnValue({
				validationErrors: [],
				isValid: false,
				requiresColor: true,
				requiresMaterial: false,
				requiresSize: true,
			});
			mockSearchParams.mockReturnValue(createSearchParams({ color: null, size: null }));

			const product = createProduct({ skus: [createSku(), createSku({ id: "sku-2" })] });

			render(<AddToCartForm product={product} selectedSku={null} />);

			expect(screen.getByText("Choisissez la couleur et la taille")).toBeInTheDocument();
		});
	});

	describe("when SKU is selected but unavailable", () => {
		it("renders 'Indisponible' when inventory is 0", () => {
			setupDefaultMocks();
			const product = createProduct({ skus: [createSku({ inventory: 0 })] });
			const selectedSku = createSku({ inventory: 0 });

			render(<AddToCartForm product={product} selectedSku={selectedSku} />);

			expect(screen.getByText("Indisponible")).toBeInTheDocument();
		});

		it("renders 'Indisponible' when SKU is inactive", () => {
			setupDefaultMocks();
			const product = createProduct({ skus: [createSku({ isActive: false })] });
			const selectedSku = createSku({ isActive: false });

			render(<AddToCartForm product={product} selectedSku={selectedSku} />);

			expect(screen.getByText("Indisponible")).toBeInTheDocument();
		});

		it("renders a disabled button when SKU is unavailable", () => {
			setupDefaultMocks();
			const product = createProduct({ skus: [createSku({ inventory: 0 })] });
			const selectedSku = createSku({ inventory: 0 });

			render(<AddToCartForm product={product} selectedSku={selectedSku} />);

			expect(screen.getByRole("button")).toBeDisabled();
		});
	});

	describe("loading state", () => {
		it("shows spinner and 'Ajout en cours...' text when isPending", () => {
			mockUseAddToCart.mockReturnValue({
				action: vi.fn(),
				isPending: true,
				state: undefined,
			});
			mockUseVariantValidation.mockReturnValue({
				validationErrors: [],
				isValid: true,
				requiresColor: false,
				requiresMaterial: false,
				requiresSize: false,
			});
			mockSearchParams.mockReturnValue(createSearchParams());

			const product = createProduct({ skus: [createSku()] });
			const selectedSku = createSku();

			render(<AddToCartForm product={product} selectedSku={selectedSku} />);

			expect(screen.getByTestId("loader-icon")).toBeInTheDocument();
			expect(screen.getByText("Ajout en cours...")).toBeInTheDocument();
		});

		it("disables button when isPending", () => {
			mockUseAddToCart.mockReturnValue({
				action: vi.fn(),
				isPending: true,
				state: undefined,
			});
			mockUseVariantValidation.mockReturnValue({
				validationErrors: [],
				isValid: true,
				requiresColor: false,
				requiresMaterial: false,
				requiresSize: false,
			});
			mockSearchParams.mockReturnValue(createSearchParams());

			const product = createProduct({ skus: [createSku()] });
			const selectedSku = createSku();

			render(<AddToCartForm product={product} selectedSku={selectedSku} />);

			expect(screen.getByRole("button")).toBeDisabled();
		});
	});

	describe("form accessibility", () => {
		it("renders a form with the correct id", () => {
			setupDefaultMocks();
			const product = createProduct({ skus: [createSku()] });

			const { container } = render(
				<AddToCartForm product={product} selectedSku={null} />
			);

			const form = container.querySelector("form#add-to-cart-form");
			expect(form).not.toBeNull();
		});

		it("sets aria-label on the form", () => {
			setupDefaultMocks();
			const product = createProduct({ skus: [createSku()] });

			const { container } = render(
				<AddToCartForm product={product} selectedSku={null} />
			);

			const form = container.querySelector("form");
			expect(form?.getAttribute("aria-label")).toBe("Formulaire d'ajout au panier");
		});

		it("sets aria-busy to false when not pending", () => {
			setupDefaultMocks();
			const product = createProduct({ skus: [createSku()] });

			const { container } = render(
				<AddToCartForm product={product} selectedSku={null} />
			);

			const form = container.querySelector("form");
			expect(form?.getAttribute("aria-busy")).toBe("false");
		});

		it("sets aria-busy to true when pending", () => {
			mockUseAddToCart.mockReturnValue({
				action: vi.fn(),
				isPending: true,
				state: undefined,
			});
			mockUseVariantValidation.mockReturnValue({
				validationErrors: [],
				isValid: true,
				requiresColor: false,
				requiresMaterial: false,
				requiresSize: false,
			});
			mockSearchParams.mockReturnValue(createSearchParams());

			const product = createProduct({ skus: [createSku()] });

			const { container } = render(
				<AddToCartForm product={product} selectedSku={null} />
			);

			const form = container.querySelector("form");
			expect(form?.getAttribute("aria-busy")).toBe("true");
		});
	});
});
