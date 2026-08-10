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
		position: 0,
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

		it("ne rend ni badge de remise ni message d'économie (retrait Omnibus 2026-08-08)", () => {
			const sku = makeSku({ priceInclTax: 3500, compareAtPrice: 5000 });
			render(<ProductPriceDisplay selectedSku={sku} product={makeProduct([sku])} />);

			expect(screen.getByText("35.00 €")).toBeInTheDocument();
			expect(screen.queryByText(/-\d+%/)).toBeNull();
			expect(screen.queryByText(/Tu économises/)).toBeNull();
			expect(screen.queryByText(/50\.00 €/)).toBeNull();
		});

		it("shows the in-stock badge when inventory is above the low-stock threshold", () => {
			const sku = makeSku({ inventory: 10, isActive: true });
			render(<ProductPriceDisplay selectedSku={sku} product={makeProduct([sku])} />);

			expect(screen.getByText("En stock")).toBeInTheDocument();
		});

		it("shows the low-stock badge when inventory is limited (≤ threshold)", () => {
			const sku = makeSku({ inventory: 2, isActive: true });
			render(<ProductPriceDisplay selectedSku={sku} product={makeProduct([sku])} />);

			// Le libellé visible ET son équivalent lu (l'annonce unique du bloc) portent
			// tous deux « plus que 2 » : on cible le libellé accessible du visible.
			expect(
				screen.getByLabelText("Attention, plus que 2 exemplaires en stock"),
			).toBeInTheDocument();
			expect(screen.getAllByText(/Plus que/i).length).toBeGreaterThan(0);
		});

		it("shows the out-of-stock badge and message when inventory is 0", () => {
			const sku = makeSku({ inventory: 0, isActive: true });
			render(<ProductPriceDisplay selectedSku={sku} product={makeProduct([sku])} />);

			expect(screen.getByText("Rupture de stock")).toBeInTheDocument();
			// Plus de bouton « prévenez-moi » : la notification de réassort a été
			// retirée en V1. Le message d'attente reste la seule affordance.
			expect(screen.getByRole("alert")).toHaveTextContent(
				"Cette petite merveille sera bientôt de retour !",
			);
		});

		// `children`, c'est le `DeliveryEstimator` : il était rendu dans les DEUX
		// branches, donc une variante épuisée affichait « Livraison estimée entre le
		// X et le Y » juste au-dessus de « Cette petite merveille sera bientôt de
		// retour ! ». On ne promet pas une date de livraison pour une pièce qu'on ne
		// peut pas acheter.
		it("n'affiche pas l'estimation de livraison quand la variante est en rupture", () => {
			const sku = makeSku({ inventory: 0, isActive: true });
			render(
				<ProductPriceDisplay selectedSku={sku} product={makeProduct([sku])}>
					<p>Livraison estimée entre le 11 août et le 17 août</p>
				</ProductPriceDisplay>,
			);

			expect(screen.queryByText(/livraison estimée/i)).not.toBeInTheDocument();
			expect(screen.getByRole("alert")).toBeInTheDocument();
		});

		it("affiche l'estimation de livraison quand la variante est disponible", () => {
			const sku = makeSku({ inventory: 10, isActive: true });
			render(
				<ProductPriceDisplay selectedSku={sku} product={makeProduct([sku])}>
					<p>Livraison estimée entre le 11 août et le 17 août</p>
				</ProductPriceDisplay>,
			);

			expect(screen.getByText(/livraison estimée/i)).toBeInTheDocument();
		});

		// Le badge FOMO « Dans X paniers » a été RETIRÉ avec le passage du panier en
		// cookie (2026-08-04) : il comptait les paniers des AUTRES visiteurs, ce
		// qu'un cookie ne permet structurellement pas — le serveur ne voit que le
		// cookie de la requête courante. Ne pas le réintroduire sans une source de
		// données côté serveur (arbitrage Adrien : suppression, pas remplacement).
		it("n'affiche aucun badge « dans X paniers »", () => {
			const sku = makeSku({ inventory: 10, isActive: true });
			render(<ProductPriceDisplay selectedSku={sku} product={makeProduct([sku])} />);

			expect(screen.queryByText(/panier/i)).not.toBeInTheDocument();
		});

		// UN SEUL porteur d'annonce. La région entière était `aria-live` +
		// `aria-atomic`, et une région atomique restitue TOUT son contenu : le prix y
		// était écrit deux fois (résumé sr-only + `aria-label` du prix), suivi du
		// stock et de la date de livraison, avec cinq `role="status"` imbriqués
		// par-dessus. L'annonce vit maintenant dans le seul `span.sr-only`.
		it("n'expose qu'UNE live region, hors de la région prix elle-même", () => {
			const sku = makeSku({ priceInclTax: 4999 });
			const { container } = render(
				<ProductPriceDisplay selectedSku={sku} product={makeProduct([sku])} />,
			);
			const region = container.querySelector(
				'[role="region"][aria-labelledby="product-price-selected"]',
			);
			expect(region).not.toHaveAttribute("aria-live");
			expect(region).not.toHaveAttribute("aria-atomic");

			const liveRegions = container.querySelectorAll('[aria-live], [role="status"]');
			expect(liveRegions).toHaveLength(1);
			expect(liveRegions[0]).toHaveClass("sr-only");
			expect(liveRegions[0]?.textContent).toMatch(/prix mis à jour/i);
		});

		it("includes an sr-only announce with the updated price on variant change", () => {
			const sku = makeSku({ priceInclTax: 4999 });
			const { container } = render(
				<ProductPriceDisplay selectedSku={sku} product={makeProduct([sku])} />,
			);
			const srOnly = container.querySelector(".sr-only");
			expect(srOnly?.textContent).toMatch(/prix mis à jour/i);
			expect(srOnly?.textContent).toMatch(/49\.99 €/);
		});
	});
});
