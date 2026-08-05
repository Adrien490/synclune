import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ─── Hoisted mocks ──────────────────────────────────────────────────────────

const { mockFormatEuro, mockOpenCart } = vi.hoisted(() => ({
	mockFormatEuro: vi.fn((n: number) => `${(n / 100).toFixed(2)} €`),
	mockOpenCart: vi.fn(),
}));

// ─── Module mocks ────────────────────────────────────────────────────────────

vi.mock("@/shared/utils/format-euro", () => ({
	formatEuro: mockFormatEuro,
}));

vi.mock("@/shared/providers/sheet-store-provider", () => ({
	useSheet: vi.fn(() => ({ open: mockOpenCart })),
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

vi.mock("@/shared/components/ui/card", () => ({
	Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<div data-testid="card" className={className}>
			{children}
		</div>
	),
	CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<div data-testid="card-content" className={className}>
			{children}
		</div>
	),
	CardHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<div data-testid="card-header" className={className}>
			{children}
		</div>
	),
	CardTitle: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<div data-testid="card-title" className={className}>
			{children}
		</div>
	),
}));

vi.mock("@/shared/components/ui/separator", () => ({
	Separator: () => <hr data-testid="separator" />,
}));

vi.mock("@/shared/components/ui/tooltip", () => ({
	TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	TooltipTrigger: ({ children }: { children: React.ReactNode; asChild?: boolean }) => (
		<>{children}</>
	),
	TooltipContent: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="tooltip-content">{children}</div>
	),
}));

vi.mock("@/shared/utils/view-transition", () => ({
	withViewTransition: (cb: () => void) => cb(),
}));

vi.mock("@/shared/components/icons/payment-icons", () => ({
	VisaIcon: () => <svg data-testid="visa-icon" />,
	MastercardIcon: () => <svg data-testid="mastercard-icon" />,
	CBIcon: () => <svg data-testid="cb-icon" />,
}));

vi.mock("@phosphor-icons/react/ssr", () => ({
	CaretDownIcon: () => <svg data-testid="chevron-down" />,
	ArrowSquareOutIcon: () => <svg data-testid="external-link-icon" />,
	InfoIcon: () => <svg data-testid="info-icon" />,
	PencilSimpleIcon: () => <svg data-testid="pencil-icon" />,
	ShieldIcon: () => <svg data-testid="shield-icon" />,
	ShoppingBagIcon: () => <svg data-testid="shopping-bag-icon" />,
	TagIcon: () => <svg data-testid="tag-icon" />,
	TruckIcon: () => <svg data-testid="truck-icon" />,
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

// ─── Import under test ───────────────────────────────────────────────────────

import { CheckoutSummary } from "../checkout-summary";
import type { GetCartReturn } from "@/modules/cart/data/get-cart";

afterEach(cleanup);

// ─── Fixtures ────────────────────────────────────────────────────────────────

function createCartItem(overrides: Record<string, unknown> = {}) {
	return {
		id: "item-1",
		quantity: 1,
		priceAtAdd: 2500,
		sku: {
			id: "sku-1",
			size: null,
			colors: [],
			materials: [],
			images: [],
			product: {
				title: "Bague Lune",
			},
		},
		...overrides,
	};
}

function createCart(items: ReturnType<typeof createCartItem>[] = []): NonNullable<GetCartReturn> {
	return {
		id: "cart-1",
		items,
	} as unknown as NonNullable<GetCartReturn>;
}

const defaultProps = {
	subtotal: 2500,
	shipping: 600,
	shippingUnavailable: false,
	shippingInfo: null,
	total: 3100,
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("CheckoutSummary", () => {
	describe("item rendering", () => {
		it("renders all cart item titles", () => {
			const cart = createCart([
				createCartItem({
					sku: {
						id: "sku-1",
						size: null,
						colors: [],
						materials: [],
						images: [],
						product: { title: "Bague Lune" },
					},
				}),
				createCartItem({
					id: "item-2",
					sku: {
						id: "sku-2",
						size: null,
						colors: [],
						materials: [],
						images: [],
						product: { title: "Collier Etoile" },
					},
				}),
			]);

			render(<CheckoutSummary cart={cart} {...defaultProps} />);

			expect(screen.getAllByText("Bague Lune").length).toBeGreaterThanOrEqual(1);
			expect(screen.getAllByText("Collier Etoile").length).toBeGreaterThanOrEqual(1);
		});

		it("renders item with image when sku has images", () => {
			const item = createCartItem({
				sku: {
					id: "sku-1",
					size: null,
					colors: [],
					materials: [],
					images: [{ url: "/img/ring.jpg", altText: "Bague" }],
					product: { title: "Bague Lune" },
				},
			});
			const cart = createCart([item]);

			render(<CheckoutSummary cart={cart} {...defaultProps} />);

			const img = screen.getAllByRole("img")[0]!;
			expect(img.getAttribute("src")).toBe("/img/ring.jpg");
			expect(img.getAttribute("alt")).toBe("Bague");
		});

		it("renders N/A placeholder when sku has no images", () => {
			const cart = createCart([createCartItem()]);

			render(<CheckoutSummary cart={cart} {...defaultProps} />);

			expect(screen.getAllByText("N/A").length).toBeGreaterThanOrEqual(1);
		});

		it("shows quantity for each item", () => {
			const cart = createCart([createCartItem({ quantity: 3 })]);

			render(<CheckoutSummary cart={cart} {...defaultProps} />);

			expect(screen.getAllByText("Qté: 3").length).toBeGreaterThanOrEqual(1);
		});

		it("shows size variant when sku has a size", () => {
			const item = createCartItem({
				sku: {
					id: "sku-1",
					size: "M",
					colors: [],
					materials: [],
					images: [],
					product: { title: "Bague Lune" },
				},
			});
			const cart = createCart([item]);

			render(<CheckoutSummary cart={cart} {...defaultProps} />);

			expect(screen.getAllByText("Taille: M").length).toBeGreaterThanOrEqual(1);
		});

		it("shows color variant when sku has a color", () => {
			const item = createCartItem({
				sku: {
					id: "sku-1",
					size: null,
					colors: [{ color: { name: "Or" } }],
					materials: [],
					images: [],
					product: { title: "Bague Lune" },
				},
			});
			const cart = createCart([item]);

			render(<CheckoutSummary cart={cart} {...defaultProps} />);

			expect(screen.getAllByText("Couleur: Or").length).toBeGreaterThanOrEqual(1);
		});

		it("shows material variant when sku has a material", () => {
			const item = createCartItem({
				sku: {
					id: "sku-1",
					size: null,
					colors: [],
					materials: [
						{
							materialId: "mat-1",
							position: 0,
							material: { id: "mat-1", name: "Argent 925" },
						},
					],
					images: [],
					product: { title: "Bague Lune" },
				},
			});
			const cart = createCart([item]);

			render(<CheckoutSummary cart={cart} {...defaultProps} />);

			expect(screen.getAllByText("Matière: Argent 925").length).toBeGreaterThanOrEqual(1);
		});

		it("does not render size line when size is null", () => {
			const cart = createCart([createCartItem()]);

			render(<CheckoutSummary cart={cart} {...defaultProps} />);

			expect(screen.queryAllByText(/Taille:/)).toHaveLength(0);
		});

		it("does not render color line when color is null", () => {
			const cart = createCart([createCartItem()]);

			render(<CheckoutSummary cart={cart} {...defaultProps} />);

			expect(screen.queryAllByText(/Couleur:/)).toHaveLength(0);
		});

		it("does not render material line when material is null", () => {
			const cart = createCart([createCartItem()]);

			render(<CheckoutSummary cart={cart} {...defaultProps} />);

			expect(screen.queryAllByText(/Matière:/)).toHaveLength(0);
		});
	});

	describe("totals display", () => {
		it("formats and displays the passed subtotal", () => {
			const cart = createCart([createCartItem()]);

			render(<CheckoutSummary cart={cart} {...defaultProps} subtotal={6000} />);

			expect(mockFormatEuro).toHaveBeenCalledWith(6000);
		});

		it("shows total items count in singular for one item", () => {
			const cart = createCart([createCartItem({ quantity: 1 })]);

			render(<CheckoutSummary cart={cart} {...defaultProps} />);

			expect(screen.getAllByText(/Sous-total \(1 article\)/).length).toBeGreaterThanOrEqual(1);
		});

		it("shows total items count in plural for multiple items", () => {
			const cart = createCart([
				createCartItem({ id: "item-1", quantity: 2 }),
				createCartItem({ id: "item-2", quantity: 3 }),
			]);

			render(<CheckoutSummary cart={cart} {...defaultProps} />);

			// totalItems = 2 + 3 = 5
			expect(screen.getAllByText(/Sous-total \(5 articles\)/).length).toBeGreaterThanOrEqual(1);
		});

		it("displays the passed shipping cost", () => {
			const cart = createCart([createCartItem()]);

			render(<CheckoutSummary cart={cart} {...defaultProps} shipping={600} />);

			expect(mockFormatEuro).toHaveBeenCalledWith(600);
		});

		it("displays the passed total", () => {
			const cart = createCart([createCartItem()]);

			render(<CheckoutSummary cart={cart} {...defaultProps} total={5100} />);

			expect(mockFormatEuro).toHaveBeenCalledWith(5100);
		});
	});

	describe("shipping unavailable", () => {
		it("shows the SSOT 'Zone non livrable' label when shippingUnavailable is true", () => {
			const cart = createCart([createCartItem()]);

			render(<CheckoutSummary cart={cart} {...defaultProps} shippingUnavailable={true} />);

			expect(screen.getAllByText("Zone non livrable").length).toBeGreaterThanOrEqual(1);
		});

		it("shows shipping info when provided", () => {
			const cart = createCart([createCartItem()]);
			const shippingInfo = {
				estimatedDays: "2-3 jours ouvrés",
				amount: 600,
				displayName: "France",
			};

			render(
				<CheckoutSummary cart={cart} {...defaultProps} shippingInfo={shippingInfo as never} />,
			);

			expect(screen.getAllByText(/Délai estimé : 2-3 jours ouvrés/).length).toBeGreaterThanOrEqual(
				1,
			);
		});
	});

	describe("discount display", () => {
		it("hides discount line when appliedDiscount is null", () => {
			const cart = createCart([createCartItem()]);

			render(<CheckoutSummary cart={cart} {...defaultProps} />);

			expect(screen.queryAllByText(/Réduction/)).toHaveLength(0);
		});

		it("hides discount line when appliedDiscount is undefined", () => {
			const cart = createCart([createCartItem()]);

			render(<CheckoutSummary cart={cart} {...defaultProps} />);

			expect(screen.queryAllByText(/Réduction/)).toHaveLength(0);
		});
	});

	describe("desktop layout", () => {
		it("renders a sticky card on desktop", () => {
			const cart = createCart([createCartItem()]);

			const { container } = render(<CheckoutSummary cart={cart} {...defaultProps} />);

			const stickyCard = container.querySelector('[class*="sticky"]');
			expect(stickyCard).not.toBeNull();
		});

		it("renders the 'Ta commande' artisan heading on desktop", () => {
			const cart = createCart([createCartItem()]);

			render(<CheckoutSummary cart={cart} {...defaultProps} />);

			expect(screen.getByText("Ta commande")).toBeInTheDocument();
		});
	});

	describe("mobile layout", () => {
		it("renders a mobile summary section", () => {
			const cart = createCart([createCartItem()]);

			render(<CheckoutSummary cart={cart} {...defaultProps} />);

			expect(screen.getByLabelText("Récapitulatif de ta commande")).toBeInTheDocument();
		});

		it("ne nomme la section qu'UNE fois (pas aria-label + h2 sr-only en double)", () => {
			// La section portait à la fois un `aria-label` et un `<h2 class="sr-only">`
			// au libellé identique : le lecteur d'écran annonçait la région puis le
			// titre, soit deux fois le même texte. Un seul nom, via aria-labelledby.
			const cart = createCart([createCartItem()]);

			render(<CheckoutSummary cart={cart} {...defaultProps} />);

			const section = screen.getByLabelText("Récapitulatif de ta commande");
			expect(section.tagName).toBe("SECTION");
			expect(section).not.toHaveAttribute("aria-label");
			expect(section).toHaveAttribute("aria-labelledby");
			expect(screen.getAllByText("Récapitulatif de ta commande")).toHaveLength(1);
		});

		it("le titre visible du résumé desktop est un vrai heading", () => {
			// `CardTitle` rend un <div> : le titre affiché n'était pas un heading, et un
			// `h2 sr-only` au libellé DIFFÉRENT tenait ce rôle en doublon.
			const cart = createCart([createCartItem()]);

			render(<CheckoutSummary cart={cart} {...defaultProps} />);

			expect(screen.getByRole("heading", { level: 2, name: "Ta commande" })).toBeInTheDocument();
		});

		it("shows total item count in the mobile toggle", () => {
			const cart = createCart([
				createCartItem({ id: "item-1", quantity: 2 }),
				createCartItem({ id: "item-2", quantity: 1 }),
			]);

			render(<CheckoutSummary cart={cart} {...defaultProps} />);

			// Replié par défaut (F6) : le mini-total reste visible dans le header collapsed.
			const toggle = screen.getByRole("button", { expanded: false });
			expect(toggle.textContent).toContain("3 articles");
		});
	});

	describe("security and trust elements", () => {
		it("renders payment icons", () => {
			const cart = createCart([createCartItem()]);

			render(<CheckoutSummary cart={cart} {...defaultProps} />);

			expect(screen.getAllByTestId("visa-icon").length).toBeGreaterThanOrEqual(1);
			expect(screen.getAllByTestId("mastercard-icon").length).toBeGreaterThanOrEqual(1);
			expect(screen.getAllByTestId("cb-icon").length).toBeGreaterThanOrEqual(1);
		});

		it("ne réintroduit PAS de mention de sécurité dans le résumé", () => {
			// Le tunnel affichait QUATRE promesses de sécurité simultanément sur
			// desktop — en-tête, ce résumé, l'intro de la section Paiement et un strip
			// sous les champs — dont deux quasi identiques. Il en reste deux, aux rôles
			// distincts : l'en-tête (« suis-je dans un tunnel sûr ? ») et la section
			// Paiement (« que devient ma carte ? »). Le résumé n'en porte plus.
			// Les logos de cartes RESTENT : ils portent une information, pas un slogan.
			const cart = createCart([createCartItem()]);

			render(<CheckoutSummary cart={cart} {...defaultProps} />);

			expect(screen.queryByText(/sécurisé/i)).not.toBeInTheDocument();
			expect(screen.getAllByTestId("visa-icon").length).toBeGreaterThanOrEqual(1);
		});

		it("renders return policy and CGV links", () => {
			const cart = createCart([createCartItem()]);

			render(<CheckoutSummary cart={cart} {...defaultProps} />);

			expect(screen.getAllByText("Politique de retour").length).toBeGreaterThanOrEqual(1);
			expect(screen.getAllByText("CGV").length).toBeGreaterThanOrEqual(1);
		});

		it("renders the TVA notice", () => {
			const cart = createCart([createCartItem()]);

			render(<CheckoutSummary cart={cart} {...defaultProps} />);

			expect(
				screen.getAllByText("TVA non applicable, art. 293 B du CGI").length,
			).toBeGreaterThanOrEqual(1);
		});
	});

	describe("edit cart button", () => {
		it("renders the edit cart button", () => {
			const cart = createCart([createCartItem()]);

			render(<CheckoutSummary cart={cart} {...defaultProps} />);

			expect(
				screen.getAllByRole("button", { name: "Modifier mon panier" }).length,
			).toBeGreaterThanOrEqual(1);
		});
	});
});
