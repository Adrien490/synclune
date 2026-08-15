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
vi.mock("@/modules/variants/hooks/use-variant-validation", () => ({
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

// Mock Button — render a standard button to preserve disabled, type, ARIA, etc.
vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		disabled,
		type,
		className,
		"aria-invalid": ariaInvalid,
		"aria-describedby": ariaDescribedBy,
	}: {
		children: React.ReactNode;
		disabled?: boolean;
		type?: "button" | "submit" | "reset";
		className?: string;
		"aria-invalid"?: boolean;
		"aria-describedby"?: string;
	}) => (
		// eslint-disable-next-line jsx-a11y/role-supports-aria-props -- test mock exposes aria-invalid for assertions
		<button
			type={type}
			disabled={disabled}
			className={className}
			aria-invalid={ariaInvalid}
			aria-describedby={ariaDescribedBy}
		>
			{children}
		</button>
	),
}));

// Mock des icônes Phosphor (SpinnerIcon pour le CTA)
vi.mock("@phosphor-icons/react/ssr", () => ({
	SpinnerIcon: ({ className }: { className?: string }) => (
		<svg data-testid="loader-icon" className={className} aria-hidden="true" />
	),
}));

import { AddToCartForm } from "../add-to-cart-form";
import type { GetProductReturn, ProductVariant } from "@/modules/products/types/product.types";

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
		variants: [],
		type: null,
		...overrides,
	} as unknown as GetProductReturn;
}

function createVariant(overrides: Partial<ProductVariant> = {}): ProductVariant {
	return {
		id: "variant-1",
		stock: 5,
		active: true,
		priceCents: 4800,
		compareAtPrice: null,
		color: null,
		material: null,
		size: null,
		...overrides,
	} as unknown as ProductVariant;
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
	describe("when a valid VARIANT is selected and available", () => {
		it("renders 'Ajouter au panier' button", () => {
			setupDefaultMocks();
			const product = createProduct({ variants: [createVariant()] });
			const selectedVariant = createVariant();

			render(<AddToCartForm product={product} selectedVariant={selectedVariant} />);

			expect(screen.getByText("Ajouter au panier")).toBeInTheDocument();
		});

		it("renders an enabled submit button", () => {
			setupDefaultMocks();
			const product = createProduct({ variants: [createVariant()] });
			const selectedVariant = createVariant();

			render(<AddToCartForm product={product} selectedVariant={selectedVariant} />);

			const button = screen.getByRole("button");
			expect(button).not.toBeDisabled();
		});

		it("renders hidden variantId and quantity inputs", () => {
			setupDefaultMocks();
			const variant = createVariant({ id: "variant-abc" });
			const product = createProduct({ variants: [variant] });

			const { container } = render(<AddToCartForm product={product} selectedVariant={variant} />);

			const variantInput = container.querySelector('input[name="variantId"]') as HTMLInputElement;
			const quantityInput = container.querySelector('input[name="quantity"]') as HTMLInputElement;

			expect(variantInput).not.toBeNull();
			expect(variantInput.value).toBe("variant-abc");
			expect(quantityInput).not.toBeNull();
			expect(quantityInput.value).toBe("1");
		});
	});

	describe("when no VARIANT is selected (single-VARIANT product)", () => {
		it("renders 'Pièce non disponible' for a product with only one VARIANT", () => {
			setupDefaultMocks();
			// Single VARIANT product with no selection
			const product = createProduct({ variants: [createVariant()] });

			render(<AddToCartForm product={product} selectedVariant={null} />);

			expect(screen.getByText("Pièce non disponible")).toBeInTheDocument();
		});

		it("renders disabled button when selectedVariant is null", () => {
			setupDefaultMocks();
			const product = createProduct({ variants: [createVariant()] });

			render(<AddToCartForm product={product} selectedVariant={null} />);

			expect(screen.getByRole("button")).toBeDisabled();
		});
	});

	describe("when no VARIANT is selected (multi-variant product)", () => {
		it("shows 'Choisis la couleur' when color is required and not selected", () => {
			mockUseAddToCart.mockReturnValue({ action: vi.fn(), isPending: false, state: undefined });
			mockUseVariantValidation.mockReturnValue({
				validationErrors: ["Choisis une couleur"],
				isValid: false,
				requiresColor: true,
				requiresMaterial: false,
				requiresSize: false,
			});
			mockSearchParams.mockReturnValue(createSearchParams({ color: null }));

			const product = createProduct({
				variants: [createVariant(), createVariant({ id: "variant-2" })],
			});

			render(<AddToCartForm product={product} selectedVariant={null} />);

			expect(screen.getByText("Choisis la couleur")).toBeInTheDocument();
		});

		it("shows 'Choisis le matériau' when material is required and not selected", () => {
			mockUseAddToCart.mockReturnValue({ action: vi.fn(), isPending: false, state: undefined });
			mockUseVariantValidation.mockReturnValue({
				validationErrors: ["Choisis un matériau"],
				isValid: false,
				requiresColor: false,
				requiresMaterial: true,
				requiresSize: false,
			});
			mockSearchParams.mockReturnValue(createSearchParams({ material: null }));

			const product = createProduct({
				variants: [createVariant(), createVariant({ id: "variant-2" })],
			});

			render(<AddToCartForm product={product} selectedVariant={null} />);

			expect(screen.getByText("Choisis le matériau")).toBeInTheDocument();
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

			const product = createProduct({
				variants: [createVariant(), createVariant({ id: "variant-2" })],
			});

			render(<AddToCartForm product={product} selectedVariant={null} />);

			expect(screen.getByText("Choisis la couleur et la taille")).toBeInTheDocument();
		});
	});

	describe("when VARIANT is selected but unavailable", () => {
		it("renders 'Indisponible' when stock is 0", () => {
			setupDefaultMocks();
			const product = createProduct({ variants: [createVariant({ stock: 0 })] });
			const selectedVariant = createVariant({ stock: 0 });

			render(<AddToCartForm product={product} selectedVariant={selectedVariant} />);

			expect(screen.getByText("Indisponible")).toBeInTheDocument();
		});

		it("renders 'Indisponible' when VARIANT is inactive", () => {
			setupDefaultMocks();
			const product = createProduct({ variants: [createVariant({ active: false })] });
			const selectedVariant = createVariant({ active: false });

			render(<AddToCartForm product={product} selectedVariant={selectedVariant} />);

			expect(screen.getByText("Indisponible")).toBeInTheDocument();
		});

		it("renders a disabled button when VARIANT is unavailable", () => {
			setupDefaultMocks();
			const product = createProduct({ variants: [createVariant({ stock: 0 })] });
			const selectedVariant = createVariant({ stock: 0 });

			render(<AddToCartForm product={product} selectedVariant={selectedVariant} />);

			expect(screen.getByRole("button")).toBeDisabled();
		});
	});

	describe("loading state", () => {
		it("shows spinner and 'Ajout en cours…' text when isPending", () => {
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

			const product = createProduct({ variants: [createVariant()] });
			const selectedVariant = createVariant();

			render(<AddToCartForm product={product} selectedVariant={selectedVariant} />);

			expect(screen.getByTestId("loader-icon")).toBeInTheDocument();
			expect(screen.getByText("Ajout en cours…")).toBeInTheDocument();
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

			const product = createProduct({ variants: [createVariant()] });
			const selectedVariant = createVariant();

			render(<AddToCartForm product={product} selectedVariant={selectedVariant} />);

			expect(screen.getByRole("button")).toBeDisabled();
		});
	});

	describe("form accessibility", () => {
		it("renders a form with the correct id", () => {
			setupDefaultMocks();
			const product = createProduct({ variants: [createVariant()] });

			const { container } = render(<AddToCartForm product={product} selectedVariant={null} />);

			const form = container.querySelector("form#add-to-cart-form");
			expect(form).not.toBeNull();
		});

		it("sets aria-label on the form", () => {
			setupDefaultMocks();
			const product = createProduct({ variants: [createVariant()] });

			const { container } = render(<AddToCartForm product={product} selectedVariant={null} />);

			const form = container.querySelector("form");
			expect(form?.getAttribute("aria-label")).toBe("Formulaire d'ajout au panier");
		});

		it("sets aria-busy to false when not pending", () => {
			setupDefaultMocks();
			const product = createProduct({ variants: [createVariant()] });

			const { container } = render(<AddToCartForm product={product} selectedVariant={null} />);

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

			const product = createProduct({ variants: [createVariant()] });

			const { container } = render(<AddToCartForm product={product} selectedVariant={null} />);

			const form = container.querySelector("form");
			expect(form?.getAttribute("aria-busy")).toBe("true");
		});
	});

	describe("error state accessibility", () => {
		function setupErrorState(message = "Stock insuffisant") {
			mockUseAddToCart.mockReturnValue({
				action: vi.fn(),
				isPending: false,
				state: { status: "error", message },
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

		it("renders the inline error message with role=alert and stable id", () => {
			setupErrorState("Stock insuffisant");
			const product = createProduct({ variants: [createVariant()] });
			const selectedVariant = createVariant();

			render(<AddToCartForm product={product} selectedVariant={selectedVariant} />);

			const alert = screen.getByRole("alert");
			expect(alert).toHaveTextContent("Stock insuffisant");
			expect(alert).toHaveAttribute("id", "add-to-cart-error");
		});

		it("links the submit button to the error via aria-invalid + aria-describedby", () => {
			setupErrorState();
			const product = createProduct({ variants: [createVariant()] });
			const selectedVariant = createVariant();

			render(<AddToCartForm product={product} selectedVariant={selectedVariant} />);

			const button = screen.getByRole("button");
			expect(button).toHaveAttribute("aria-invalid", "true");
			expect(button).toHaveAttribute("aria-describedby", "add-to-cart-error");
		});

		it("omits aria-invalid and aria-describedby on the submit button when no error", () => {
			setupDefaultMocks();
			const product = createProduct({ variants: [createVariant()] });
			const selectedVariant = createVariant();

			render(<AddToCartForm product={product} selectedVariant={selectedVariant} />);

			const button = screen.getByRole("button");
			expect(button).not.toHaveAttribute("aria-invalid");
			expect(button).not.toHaveAttribute("aria-describedby");
		});
	});
});
