import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockAction, mockIsPending, mockOpenSkuSelector, mockDispatchFlyToCart, chunkGate } =
	vi.hoisted(() => {
		let release: () => void = () => {};
		const gate = {
			promise: Promise.resolve() as Promise<void>,
			open: () => release(),
			hold() {
				this.promise = new Promise<void>((resolve) => {
					release = resolve;
				});
			},
		};
		return {
			mockAction: vi.fn(),
			mockIsPending: { value: false },
			mockOpenSkuSelector: vi.fn(),
			mockDispatchFlyToCart: vi.fn(),
			chunkGate: gate,
		};
	});

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

vi.mock("@/modules/cart/hooks/use-add-to-cart", () => ({
	useAddToCart: () => ({ action: mockAction, isPending: mockIsPending.value }),
}));

vi.mock("@/modules/cart/lib/fly-to-cart", () => ({
	dispatchFlyToCart: mockDispatchFlyToCart,
}));

vi.mock("@/shared/providers/overlay-store-provider", () => ({
	useDialog: () => ({ open: mockOpenSkuSelector }),
}));

// Le bouton ne l'importe plus que dynamiquement, pour PRÉCHARGER le chunk avant
// d'ouvrir le panneau (l'identifiant du dialog, lui, vient du module feuille
// `sku-selector-utils`). `chunkGate` permet de tenir ce chargement en suspens et
// d'observer l'état d'attente que le bouton doit afficher pendant ce temps.
vi.mock("@/modules/cart/components/sku-selector-dialog", async () => {
	await chunkGate.promise;
	return { SkuSelectorDialog: () => null };
});

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		"aria-label": ariaLabel,
		disabled,
		"aria-busy": ariaBusy,
		type,
		onClick,
		className,
	}: {
		children: React.ReactNode;
		"aria-label"?: string;
		disabled?: boolean;
		"aria-busy"?: boolean;
		type?: string;
		onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
		className?: string;
	}) => (
		<button
			aria-label={ariaLabel}
			disabled={disabled}
			aria-busy={ariaBusy}
			type={type as "button" | "submit" | "reset"}
			onClick={onClick}
			className={className}
		>
			{children}
		</button>
	),
}));

vi.mock("@phosphor-icons/react/ssr", () => ({
	ShoppingBagIcon: () => <svg data-testid="icon-shopping-cart" />,
	SpinnerIcon: ({ className }: { className?: string }) => (
		<svg data-testid="icon-loader" className={className} />
	),
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { AddToCartCardButton } from "../add-to-cart-card-button";
import type { Product } from "@/modules/products/types/product.types";

// ============================================================================
// HELPERS
// ============================================================================

function createProduct(overrides: Partial<Product> = {}): Product {
	return {
		id: "p-1",
		title: "Bague en or",
		slug: "bague-en-or",
		skus: [
			{
				id: "sku-1",
				isActive: true,
				priceInclTax: 9900,
				images: [],
			},
		],
		...overrides,
	} as unknown as Product;
}

// ============================================================================
// TESTS
// ============================================================================

afterEach(cleanup);

describe("AddToCartCardButton", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockIsPending.value = false;
	});

	it("renders a form with hidden inputs", () => {
		const product = createProduct();
		const { container } = render(<AddToCartCardButton skuId="sku-1" product={product} />);
		const form = container.querySelector("form");
		expect(form).toBeInTheDocument();
		const skuInput = container.querySelector("input[name='skuId']");
		expect(skuInput).toHaveValue("sku-1");
		const qtyInput = container.querySelector("input[name='quantity']");
		expect(qtyInput).toHaveValue("1");
	});

	it("renders accessible aria-label with product title", () => {
		const product = createProduct({ title: "Collier perles" });
		render(<AddToCartCardButton skuId="sku-1" product={product} productTitle="Collier perles" />);
		expect(
			screen.getByRole("button", { name: /Ajouter Collier perles au panier/i }),
		).toBeInTheDocument();
	});

	it("falls back to 'ce produit' when no productTitle provided", () => {
		const product = createProduct({ title: "Bague" });
		render(<AddToCartCardButton skuId="sku-1" product={product} />);
		expect(
			screen.getByRole("button", { name: /Ajouter ce produit au panier/i }),
		).toBeInTheDocument();
	});

	it("is disabled when isPending", () => {
		mockIsPending.value = true;
		const product = createProduct();
		render(<AddToCartCardButton skuId="sku-1" product={product} />);
		expect(screen.getByRole("button")).toBeDisabled();
	});

	it("shows shopping cart icon when not pending (icon variant)", () => {
		const product = createProduct();
		render(<AddToCartCardButton skuId="sku-1" product={product} />);
		expect(screen.getByTestId("icon-shopping-cart")).toBeInTheDocument();
	});

	// ⚠️ Ce test doit rester AVANT tout autre qui ouvre le sélecteur : la factory du
	// mock ne s'exécute qu'au PREMIER `import()`, ensuite le module est servi depuis
	// le cache de Vitest et `chunkGate.hold()` n'a plus aucune prise.
	it("montre l'attente pendant le chargement du chunk du dialog", async () => {
		// Le tap mort : le chunk du panneau (plusieurs dizaines de kilo-octets) se
		// télécharge APRÈS le clic. Sans état d'attente, le bouton ne bougeait pas et
		// le réflexe était de retaper.
		chunkGate.hold();
		const product = createProduct({
			skus: [
				{ id: "sku-1", isActive: true, priceInclTax: 9900, images: [] },
				{ id: "sku-2", isActive: true, priceInclTax: 12000, images: [] },
			] as unknown as Product["skus"],
		});
		render(<AddToCartCardButton skuId="sku-1" product={product} />);

		await userEvent.click(screen.getByRole("button"));

		const button = screen.getByRole("button");
		expect(button).toBeDisabled();
		expect(button).toHaveAttribute("aria-busy", "true");
		expect(mockOpenSkuSelector).not.toHaveBeenCalled();

		chunkGate.open();

		await waitFor(() => expect(mockOpenSkuSelector).toHaveBeenCalledOnce());
		expect(screen.getByRole("button")).not.toBeDisabled();
	});

	it("opens sku selector when product has multiple active SKUs", async () => {
		const product = createProduct({
			skus: [
				{ id: "sku-1", isActive: true, priceInclTax: 9900, images: [] },
				{ id: "sku-2", isActive: true, priceInclTax: 12000, images: [] },
			] as unknown as Product["skus"],
		});
		render(<AddToCartCardButton skuId="sku-1" product={product} />);
		await userEvent.click(screen.getByRole("button"));
		await waitFor(() => expect(mockOpenSkuSelector).toHaveBeenCalledOnce());
	});

	it("dispatches fly-to-cart when product has a single SKU", async () => {
		const product = createProduct({
			skus: [
				{ id: "sku-1", isActive: true, priceInclTax: 9900, images: [] },
			] as unknown as Product["skus"],
		});
		render(<AddToCartCardButton skuId="sku-1" product={product} />);
		await userEvent.click(screen.getByRole("button"));
		expect(mockDispatchFlyToCart).toHaveBeenCalledOnce();
	});

	it("does not open sku selector when inactive SKUs are excluded", async () => {
		const product = createProduct({
			skus: [
				{ id: "sku-1", isActive: true, priceInclTax: 9900, images: [] },
				{ id: "sku-2", isActive: false, priceInclTax: 12000, images: [] },
			] as unknown as Product["skus"],
		});
		render(<AddToCartCardButton skuId="sku-1" product={product} />);
		await userEvent.click(screen.getByRole("button"));
		// Only 1 active SKU → fly-to-cart, not sku selector
		expect(mockOpenSkuSelector).not.toHaveBeenCalled();
		expect(mockDispatchFlyToCart).toHaveBeenCalledOnce();
	});
});
