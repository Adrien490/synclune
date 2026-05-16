import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockAction, mockIsPending } = vi.hoisted(() => ({
	mockAction: vi.fn(),
	mockIsPending: false,
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/modules/cart/hooks/use-add-to-cart", () => ({
	useAddToCart: () => ({
		action: mockAction,
		isPending: mockIsPending,
	}),
}));

vi.mock("@/modules/skus/hooks/use-selected-sku", () => ({
	useSelectedSku: ({ defaultSku }: { product: unknown; defaultSku: unknown }) => ({
		selectedSku: defaultSku ?? null,
	}),
}));

vi.mock("@/shared/utils/format-euro", () => ({
	formatEuro: (value: number) => `${(value / 100).toFixed(2)} €`,
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@/shared/hooks", () => ({
	useBottomBarHeight: vi.fn(),
}));

vi.mock("motion/react", () => ({
	AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	m: {
		div: ({
			children,
			className,
			initial: _initial,
			animate: _animate,
			exit: _exit,
			transition: _transition,
			variants: _variants,
			...props
		}: React.HTMLAttributes<HTMLDivElement> & {
			children?: React.ReactNode;
			initial?: unknown;
			animate?: unknown;
			exit?: unknown;
			transition?: unknown;
			variants?: unknown;
		}) => (
			<div className={className} data-testid="sticky-cta-panel" {...props}>
				{children}
			</div>
		),
	},
	useReducedMotion: () => false,
}));

vi.mock("next/image", () => ({
	default: ({
		src,
		alt,
		fill: _fill,
		...props
	}: {
		src: string;
		alt: string;
		fill?: boolean;
		[key: string]: unknown;
	}) => (
		// eslint-disable-next-line @next/next/no-img-element
		<img src={src} alt={alt} {...props} />
	),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		type,
		disabled,
		"aria-busy": ariaBusy,
		className,
	}: {
		children: React.ReactNode;
		type?: string;
		disabled?: boolean;
		"aria-busy"?: boolean;
		className?: string;
	}) => (
		<button
			type={type as "submit" | "button" | "reset"}
			disabled={disabled}
			aria-busy={ariaBusy}
			className={className}
		>
			{children}
		</button>
	),
}));

vi.mock("@/shared/components/animations/motion.config", () => ({
	MOTION_CONFIG: {
		spring: { bar: {} },
	},
}));

// ============================================================================
// COMPONENT IMPORT (after mocks)
// ============================================================================

import { StickyCartCTA } from "../sticky-cart-cta";
import type { GetProductReturn, ProductSku } from "@/modules/products/types/product.types";

// ============================================================================
// FIXTURES
// ============================================================================

function createSku(overrides: Partial<ProductSku> = {}): ProductSku {
	return {
		id: "sku-1",
		sku: "BAGUE-OR-SM",
		priceInclTax: 4800,
		compareAtPrice: null,
		inventory: 5,
		isActive: true,
		isDefault: true,
		colors: [
			{ colorId: "c-1", position: 0, color: { id: "c-1", slug: "or", name: "Or", hex: "#FFD700" } },
		],
		material: null,
		size: null,
		images: [],
		...overrides,
	} as unknown as ProductSku;
}

function createProduct(overrides: Partial<GetProductReturn> = {}): GetProductReturn {
	return {
		id: "prod-1",
		slug: "bague-lune-or",
		title: "Bague Lune Or",
		description: null,
		status: "PUBLIC",
		type: { id: "t-1", slug: "bague", label: "Bague", isActive: true },
		skus: [createSku()],
		collections: [],
		createdAt: new Date("2025-01-01"),
		updatedAt: new Date("2025-01-01"),
		...overrides,
	} as unknown as GetProductReturn;
}

// ============================================================================
// INTERSECTION OBSERVER SETUP
// ============================================================================

/**
 * Installs a constructor-compatible IntersectionObserver mock.
 * When observe() is called, immediately invokes the callback with
 * isIntersecting=false so the CTA becomes visible.
 */
function setupNotIntersectingObserver() {
	const instances: { disconnect: ReturnType<typeof vi.fn> }[] = [];

	class MockIntersectionObserver {
		private callback: (entries: { isIntersecting: boolean }[]) => void;
		disconnect = vi.fn();

		constructor(callback: (entries: { isIntersecting: boolean }[]) => void) {
			this.callback = callback;
			instances.push(this);
		}

		observe(_target: Element) {
			// Fire immediately: target is NOT intersecting → CTA visible
			this.callback([{ isIntersecting: false }]);
		}

		unobserve = vi.fn();
	}

	vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
	return instances;
}

/**
 * Installs a constructor-compatible IntersectionObserver mock that
 * never fires the callback (CTA stays hidden).
 */
function setupSilentObserver() {
	class SilentIntersectionObserver {
		disconnect = vi.fn();
		observe = vi.fn();
		unobserve = vi.fn();
		constructor(_callback: unknown) {}
	}

	vi.stubGlobal("IntersectionObserver", SilentIntersectionObserver);
}

// ============================================================================
// HELPERS
// ============================================================================

function renderVisible(props: Partial<React.ComponentProps<typeof StickyCartCTA>> = {}) {
	const defaultSku = props.defaultSku ?? createSku();
	const product = props.product ?? createProduct({ skus: [defaultSku] });

	// Create a real DOM element for the observer target so observe() is called
	const targetId = props.targetId ?? "add-to-cart-form";
	const targetEl = document.createElement("div");
	targetEl.id = targetId;
	document.body.appendChild(targetEl);

	setupNotIntersectingObserver();

	const result = render(<StickyCartCTA product={product} defaultSku={defaultSku} {...props} />);

	return { ...result, targetEl };
}

// ============================================================================
// TESTS
// ============================================================================

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	vi.unstubAllGlobals();
	// Remove any leftover target elements
	document.querySelectorAll("#add-to-cart-form").forEach((el) => el.remove());
});

describe("StickyCartCTA", () => {
	describe("visibility based on IntersectionObserver", () => {
		it("does not render the CTA when target element is not found (isVisible stays false)", () => {
			// No DOM element for targetId — observer is installed but observe() is never called
			setupSilentObserver();
			const { container } = render(
				<StickyCartCTA product={createProduct()} defaultSku={createSku()} />,
			);
			expect(container.querySelector("[data-testid='sticky-cta-panel']")).not.toBeInTheDocument();
		});

		it("renders the CTA panel when target element is not intersecting", () => {
			const { container } = renderVisible();
			expect(container.querySelector("[data-testid='sticky-cta-panel']")).toBeInTheDocument();
		});
	});

	describe("price display", () => {
		it("displays the SKU price in euros", () => {
			renderVisible({ defaultSku: createSku({ priceInclTax: 4800 }) });
			expect(screen.getByText("48.00 €")).toBeInTheDocument();
		});

		it("displays compareAtPrice with strikethrough when it is higher than price", () => {
			renderVisible({
				defaultSku: createSku({ priceInclTax: 3600, compareAtPrice: 4800 }),
			});
			// The regular price
			expect(screen.getByText("36.00 €")).toBeInTheDocument();
			// The strikethrough price
			expect(screen.getByText("48.00 €")).toBeInTheDocument();
		});

		it("does not display compareAtPrice when it equals priceInclTax", () => {
			renderVisible({
				defaultSku: createSku({ priceInclTax: 4800, compareAtPrice: 4800 }),
			});
			// compareAtPrice is not strictly greater, so no extra price shown
			const prices = screen.getAllByText("48.00 €");
			expect(prices).toHaveLength(1);
		});
	});

	describe("add to cart button", () => {
		it("renders 'Ajouter au panier' when SKU is available", () => {
			renderVisible({ defaultSku: createSku({ inventory: 5, isActive: true }) });
			expect(screen.getByRole("button", { name: "Ajouter au panier" })).toBeInTheDocument();
		});

		it("renders 'Indisponible' when SKU inventory is 0", () => {
			renderVisible({ defaultSku: createSku({ inventory: 0, isActive: true }) });
			expect(screen.getByRole("button", { name: "Indisponible" })).toBeInTheDocument();
		});

		it("disables the button when SKU inventory is 0", () => {
			renderVisible({ defaultSku: createSku({ inventory: 0, isActive: true }) });
			expect(screen.getByRole("button", { name: "Indisponible" })).toBeDisabled();
		});

		it("disables the button when SKU is not active", () => {
			renderVisible({ defaultSku: createSku({ inventory: 5, isActive: false }) });
			expect(screen.getByRole("button")).toBeDisabled();
		});

		it("button is enabled when SKU is available", () => {
			renderVisible({ defaultSku: createSku({ inventory: 3, isActive: true }) });
			const button = screen.getByRole("button", { name: "Ajouter au panier" });
			expect(button).not.toBeDisabled();
		});
	});

	describe("form", () => {
		it("renders a form with aria-label 'Ajout rapide au panier'", () => {
			renderVisible();
			expect(screen.getByRole("form", { name: "Ajout rapide au panier" })).toBeInTheDocument();
		});

		it("includes a hidden skuId field with the current SKU id", () => {
			const sku = createSku({ id: "sku-xyz" });
			const { container } = renderVisible({ defaultSku: sku });
			const skuInput = container.querySelector('input[name="skuId"]') as HTMLInputElement;
			expect(skuInput).toBeInTheDocument();
			expect(skuInput.value).toBe("sku-xyz");
		});

		it("includes a hidden quantity field with value '1'", () => {
			const { container } = renderVisible();
			const qtyInput = container.querySelector('input[name="quantity"]') as HTMLInputElement;
			expect(qtyInput).toBeInTheDocument();
			expect(qtyInput.value).toBe("1");
		});
	});

	describe("product image thumbnail", () => {
		it("renders the product thumbnail when the SKU has an image", () => {
			const sku = createSku({
				images: [
					{
						url: "https://example.com/bague.jpg",
						thumbnailUrl: null,
						id: "img-1",
						blurDataUrl: null,
						altText: null,
						mediaType: "IMAGE" as const,
						isPrimary: true,
					},
				],
			} as any);
			const { container } = renderVisible({ defaultSku: sku });
			// The image wrapper is aria-hidden, so query via DOM directly
			const img = container.querySelector("img") as HTMLImageElement;
			expect(img).toBeInTheDocument();
			expect(img.src).toContain("bague.jpg");
		});

		it("does not render an image when SKU has no images", () => {
			const sku = createSku({ images: [] });
			const { container } = renderVisible({ defaultSku: sku });
			expect(container.querySelector("img")).not.toBeInTheDocument();
		});

		it("prefers thumbnailUrl over url for the image src", () => {
			const sku = createSku({
				images: [
					{
						url: "https://example.com/full.jpg",
						thumbnailUrl: "https://example.com/thumb.jpg",
						id: "img-2",
						blurDataUrl: null,
						altText: null,
						mediaType: "IMAGE" as const,
						isPrimary: true,
					},
				],
			} as any);
			const { container } = renderVisible({ defaultSku: sku });
			const img = container.querySelector("img") as HTMLImageElement;
			expect(img).toBeInTheDocument();
			expect(img.src).toContain("thumb.jpg");
		});
	});

	describe("SKU label", () => {
		it("shows the color name when SKU has a color", () => {
			const sku = createSku({
				colors: [
					{
						colorId: "c-1",
						position: 0,
						color: { id: "c-1", slug: "or", name: "Or", hex: "#FFD700" },
					},
				],
			});
			renderVisible({ defaultSku: sku });
			expect(screen.getByText("Or")).toBeInTheDocument();
		});

		it("shows the product title when SKU has no color", () => {
			const sku = createSku({ colors: [] });
			const product = createProduct({ title: "Bague Lune Or", skus: [sku] });
			renderVisible({ defaultSku: sku, product });
			expect(screen.getByText("Bague Lune Or")).toBeInTheDocument();
		});
	});
});
