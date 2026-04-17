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

vi.mock("motion/react", () => ({
	AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	m: {
		aside: ({
			children,
			className,
			initial: _initial,
			animate: _animate,
			exit: _exit,
			transition: _transition,
			variants: _variants,
			...props
		}: React.HTMLAttributes<HTMLElement> & {
			children?: React.ReactNode;
			initial?: unknown;
			animate?: unknown;
			exit?: unknown;
			transition?: unknown;
			variants?: unknown;
		}) => (
			<aside className={className} data-testid="sticky-cta-desktop-panel" {...props}>
				{children}
			</aside>
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

import { StickyCartCTADesktop } from "../sticky-cart-cta-desktop";
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
		color: { id: "c-1", slug: "or", name: "Or", hex: "#FFD700" },
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

function setupNotIntersectingObserver() {
	class MockIntersectionObserver {
		private callback: (entries: { isIntersecting: boolean }[]) => void;
		disconnect = vi.fn();

		constructor(callback: (entries: { isIntersecting: boolean }[]) => void) {
			this.callback = callback;
		}

		observe(_target: Element) {
			this.callback([{ isIntersecting: false }]);
		}

		unobserve = vi.fn();
	}

	vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
}

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

function renderVisible(props: Partial<React.ComponentProps<typeof StickyCartCTADesktop>> = {}) {
	const defaultSku = props.defaultSku ?? createSku();
	const product = props.product ?? createProduct({ skus: [defaultSku] });

	const targetId = props.targetId ?? "add-to-cart-form";
	const targetEl = document.createElement("div");
	targetEl.id = targetId;
	// Simulate offsetTop=100 so window.scrollY > 100 triggers visibility
	Object.defineProperty(targetEl, "offsetTop", { value: 100, configurable: true });
	document.body.appendChild(targetEl);
	// Simulate user scrolled past the target
	Object.defineProperty(window, "scrollY", { value: 500, configurable: true, writable: true });

	setupNotIntersectingObserver();

	const result = render(
		<StickyCartCTADesktop product={product} defaultSku={defaultSku} {...props} />,
	);

	return { ...result, targetEl };
}

// ============================================================================
// TESTS
// ============================================================================

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	vi.unstubAllGlobals();
	document.querySelectorAll("#add-to-cart-form").forEach((el) => el.remove());
});

describe("StickyCartCTADesktop", () => {
	describe("visibility", () => {
		it("stays hidden when the target element is not in the DOM", () => {
			setupSilentObserver();
			Object.defineProperty(window, "scrollY", { value: 0, configurable: true, writable: true });
			const { container } = render(
				<StickyCartCTADesktop product={createProduct()} defaultSku={createSku()} />,
			);
			expect(
				container.querySelector("[data-testid='sticky-cta-desktop-panel']"),
			).not.toBeInTheDocument();
		});

		it("renders the aside when target is not intersecting AND user scrolled past", () => {
			const { container } = renderVisible();
			expect(
				container.querySelector("[data-testid='sticky-cta-desktop-panel']"),
			).toBeInTheDocument();
		});

		it("exposes role=complementary with a descriptive aria-label", () => {
			renderVisible();
			expect(
				screen.getByRole("complementary", { name: /ajout rapide au panier/i }),
			).toBeInTheDocument();
		});

		it("is hidden below the lg breakpoint via the 'hidden lg:block' class", () => {
			const { container } = renderVisible();
			const panel = container.querySelector("[data-testid='sticky-cta-desktop-panel']");
			expect(panel?.className).toContain("hidden");
			expect(panel?.className).toContain("lg:block");
		});
	});

	describe("price display", () => {
		it("displays the SKU price in euros", () => {
			renderVisible({ defaultSku: createSku({ priceInclTax: 4800 }) });
			expect(screen.getByText("48.00 €")).toBeInTheDocument();
		});

		it("displays compareAtPrice strikethrough when higher than price", () => {
			renderVisible({
				defaultSku: createSku({ priceInclTax: 3600, compareAtPrice: 4800 }),
			});
			expect(screen.getByText("36.00 €")).toBeInTheDocument();
			expect(screen.getByText("48.00 €")).toBeInTheDocument();
		});
	});

	describe("variant summary", () => {
		it("renders 'color · material · Taille X' when all variants are set", () => {
			const sku = createSku({
				color: { id: "c", slug: "rose", name: "Rose", hex: "#f7b2c5" } as any,
				material: { id: "m", slug: "argent", name: "Argent" } as any,
				size: "M" as any,
			});
			renderVisible({ defaultSku: sku });
			expect(screen.getByText(/Rose · Argent · Taille M/)).toBeInTheDocument();
		});

		it("renders only available variant fields (e.g. color only)", () => {
			const sku = createSku({
				color: { id: "c", slug: "or", name: "Or", hex: "#FFD700" } as any,
				material: null,
				size: null,
			});
			renderVisible({ defaultSku: sku });
			expect(screen.getByText("Or")).toBeInTheDocument();
		});

		it("shows the product title", () => {
			const sku = createSku({ color: null, material: null, size: null });
			const product = createProduct({ title: "Collier Étoile", skus: [sku] });
			renderVisible({ defaultSku: sku, product });
			expect(screen.getByText("Collier Étoile")).toBeInTheDocument();
		});
	});

	describe("add to cart button", () => {
		it("renders 'Ajouter au panier' when SKU is available", () => {
			renderVisible({ defaultSku: createSku({ inventory: 5, isActive: true }) });
			expect(screen.getByRole("button", { name: "Ajouter au panier" })).toBeInTheDocument();
		});

		it("renders 'Indisponible' and disables when inventory is 0", () => {
			renderVisible({ defaultSku: createSku({ inventory: 0, isActive: true }) });
			const btn = screen.getByRole("button", { name: "Indisponible" });
			expect(btn).toBeInTheDocument();
			expect(btn).toBeDisabled();
		});

		it("disables the button when SKU is not active", () => {
			renderVisible({ defaultSku: createSku({ inventory: 5, isActive: false }) });
			expect(screen.getByRole("button")).toBeDisabled();
		});
	});

	describe("form fields", () => {
		it("includes hidden skuId and quantity fields", () => {
			const sku = createSku({ id: "sku-xyz" });
			const { container } = renderVisible({ defaultSku: sku });
			const skuInput = container.querySelector('input[name="skuId"]') as HTMLInputElement;
			const qtyInput = container.querySelector('input[name="quantity"]') as HTMLInputElement;
			expect(skuInput.value).toBe("sku-xyz");
			expect(qtyInput.value).toBe("1");
		});
	});
});
