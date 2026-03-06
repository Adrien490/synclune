import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ─── Hoisted mocks ──────────────────────────────────────────────────────────

const { mockCalculateShipping, mockFormatEuro, mockOpenCart } = vi.hoisted(() => ({
	mockCalculateShipping: vi.fn(),
	mockFormatEuro: vi.fn((n: number) => `${(n / 100).toFixed(2)} €`),
	mockOpenCart: vi.fn(),
}));

// ─── Module mocks ────────────────────────────────────────────────────────────

vi.mock("@/modules/orders/services/shipping.service", () => ({
	calculateShipping: mockCalculateShipping,
}));

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

vi.mock("@/shared/components/ui/collapsible", () => ({
	Collapsible: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="collapsible">{children}</div>
	),
	CollapsibleContent: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="collapsible-content">{children}</div>
	),
	CollapsibleTrigger: ({
		children,
		className,
	}: {
		children: React.ReactNode;
		className?: string;
	}) => (
		<button data-testid="collapsible-trigger" className={className}>
			{children}
		</button>
	),
}));

vi.mock("@/shared/components/ui/separator", () => ({
	Separator: () => <hr data-testid="separator" />,
}));

vi.mock("@/shared/components/icons/payment-icons", () => ({
	VisaIcon: () => <svg data-testid="visa-icon" />,
	MastercardIcon: () => <svg data-testid="mastercard-icon" />,
	CBIcon: () => <svg data-testid="cb-icon" />,
}));

vi.mock("lucide-react", () => ({
	ChevronDown: () => <svg data-testid="chevron-down" />,
	Pencil: () => <svg data-testid="pencil-icon" />,
	Shield: () => <svg data-testid="shield-icon" />,
	ShoppingBag: () => <svg data-testid="shopping-bag-icon" />,
	Tag: () => <svg data-testid="tag-icon" />,
	TruckIcon: () => <svg data-testid="truck-icon" />,
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

// ─── Import under test ───────────────────────────────────────────────────────

import { CheckoutSummary } from "../checkout-summary";
import type { GetCartReturn } from "@/modules/cart/data/get-cart";
import type { ValidateDiscountCodeReturn } from "@/modules/discounts/types/discount.types";

afterEach(cleanup);

// ─── Fixtures ────────────────────────────────────────────────────────────────

type AppliedDiscount = NonNullable<ValidateDiscountCodeReturn["discount"]>;

function createCartItem(overrides: Record<string, unknown> = {}) {
	return {
		id: "item-1",
		quantity: 1,
		priceAtAdd: 2500,
		sku: {
			id: "sku-1",
			size: null,
			color: null,
			material: null,
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

function createDiscount(overrides: Partial<AppliedDiscount> = {}): AppliedDiscount {
	return {
		id: "disc-1",
		code: "SAVE10",
		type: "PERCENTAGE" as AppliedDiscount["type"],
		value: 10,
		discountAmount: 500,
		excludeSaleItems: false,
		...overrides,
	};
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("CheckoutSummary", () => {
	beforeEach(() => {
		mockCalculateShipping.mockReturnValue(600);
	});

	describe("item rendering", () => {
		it("renders all cart item titles", () => {
			const cart = createCart([
				createCartItem({
					sku: {
						id: "sku-1",
						size: null,
						color: null,
						material: null,
						images: [],
						product: { title: "Bague Lune" },
					},
				}),
				createCartItem({
					id: "item-2",
					sku: {
						id: "sku-2",
						size: null,
						color: null,
						material: null,
						images: [],
						product: { title: "Collier Etoile" },
					},
				}),
			]);

			render(<CheckoutSummary cart={cart} />);

			expect(screen.getAllByText("Bague Lune").length).toBeGreaterThanOrEqual(1);
			expect(screen.getAllByText("Collier Etoile").length).toBeGreaterThanOrEqual(1);
		});

		it("renders item with image when sku has images", () => {
			const item = createCartItem({
				sku: {
					id: "sku-1",
					size: null,
					color: null,
					material: null,
					images: [{ url: "/img/ring.jpg", altText: "Bague" }],
					product: { title: "Bague Lune" },
				},
			});
			const cart = createCart([item]);

			render(<CheckoutSummary cart={cart} />);

			const img = screen.getAllByRole("img")[0]!;
			expect(img.getAttribute("src")).toBe("/img/ring.jpg");
			expect(img.getAttribute("alt")).toBe("Bague");
		});

		it("renders N/A placeholder when sku has no images", () => {
			const cart = createCart([createCartItem()]);

			render(<CheckoutSummary cart={cart} />);

			expect(screen.getAllByText("N/A").length).toBeGreaterThanOrEqual(1);
		});

		it("shows quantity for each item", () => {
			const cart = createCart([createCartItem({ quantity: 3 })]);

			render(<CheckoutSummary cart={cart} />);

			expect(screen.getAllByText("Qté: 3").length).toBeGreaterThanOrEqual(1);
		});

		it("shows size variant when sku has a size", () => {
			const item = createCartItem({
				sku: {
					id: "sku-1",
					size: "M",
					color: null,
					material: null,
					images: [],
					product: { title: "Bague Lune" },
				},
			});
			const cart = createCart([item]);

			render(<CheckoutSummary cart={cart} />);

			expect(screen.getAllByText("Taille: M").length).toBeGreaterThanOrEqual(1);
		});

		it("shows color variant when sku has a color", () => {
			const item = createCartItem({
				sku: {
					id: "sku-1",
					size: null,
					color: { name: "Or" },
					material: null,
					images: [],
					product: { title: "Bague Lune" },
				},
			});
			const cart = createCart([item]);

			render(<CheckoutSummary cart={cart} />);

			expect(screen.getAllByText("Couleur: Or").length).toBeGreaterThanOrEqual(1);
		});

		it("shows material variant when sku has a material", () => {
			const item = createCartItem({
				sku: {
					id: "sku-1",
					size: null,
					color: null,
					material: { name: "Argent 925" },
					images: [],
					product: { title: "Bague Lune" },
				},
			});
			const cart = createCart([item]);

			render(<CheckoutSummary cart={cart} />);

			expect(screen.getAllByText("Matière: Argent 925").length).toBeGreaterThanOrEqual(1);
		});

		it("does not render size line when size is null", () => {
			const cart = createCart([createCartItem()]);

			render(<CheckoutSummary cart={cart} />);

			expect(screen.queryAllByText(/Taille:/)).toHaveLength(0);
		});

		it("does not render color line when color is null", () => {
			const cart = createCart([createCartItem()]);

			render(<CheckoutSummary cart={cart} />);

			expect(screen.queryAllByText(/Couleur:/)).toHaveLength(0);
		});

		it("does not render material line when material is null", () => {
			const cart = createCart([createCartItem()]);

			render(<CheckoutSummary cart={cart} />);

			expect(screen.queryAllByText(/Matière:/)).toHaveLength(0);
		});
	});

	describe("totals calculation", () => {
		it("calculates subtotal as sum of priceAtAdd * quantity for each item", () => {
			const cart = createCart([
				createCartItem({ id: "item-1", priceAtAdd: 2500, quantity: 2 }),
				createCartItem({ id: "item-2", priceAtAdd: 1000, quantity: 1 }),
			]);

			render(<CheckoutSummary cart={cart} />);

			// subtotal = 2500*2 + 1000*1 = 6000
			expect(mockFormatEuro).toHaveBeenCalledWith(6000);
		});

		it("shows total items count in singular for one item", () => {
			const cart = createCart([createCartItem({ quantity: 1 })]);

			render(<CheckoutSummary cart={cart} />);

			expect(screen.getAllByText(/Sous-total \(1 article\)/).length).toBeGreaterThanOrEqual(1);
		});

		it("shows total items count in plural for multiple items", () => {
			const cart = createCart([
				createCartItem({ id: "item-1", quantity: 2 }),
				createCartItem({ id: "item-2", quantity: 3 }),
			]);

			render(<CheckoutSummary cart={cart} />);

			// totalItems = 2 + 3 = 5
			expect(screen.getAllByText(/Sous-total \(5 articles\)/).length).toBeGreaterThanOrEqual(1);
		});

		it("calls calculateShipping with selectedCountry and postalCode", () => {
			const cart = createCart([createCartItem()]);

			render(<CheckoutSummary cart={cart} selectedCountry="BE" postalCode="1000" />);

			expect(mockCalculateShipping).toHaveBeenCalledWith("BE", "1000");
		});

		it("calls calculateShipping with default FR country when not provided", () => {
			const cart = createCart([createCartItem()]);

			render(<CheckoutSummary cart={cart} />);

			expect(mockCalculateShipping).toHaveBeenCalledWith("FR", undefined);
		});

		it("displays shipping cost from calculateShipping", () => {
			mockCalculateShipping.mockReturnValue(600);
			const cart = createCart([createCartItem()]);

			render(<CheckoutSummary cart={cart} />);

			expect(mockFormatEuro).toHaveBeenCalledWith(600);
		});

		it("calculates total as subtotal - discountAmount + shipping", () => {
			mockCalculateShipping.mockReturnValue(600);
			const cart = createCart([createCartItem({ priceAtAdd: 5000, quantity: 1 })]);
			const discount = createDiscount({ discountAmount: 500 });

			render(<CheckoutSummary cart={cart} appliedDiscount={discount} />);

			// total = 5000 - 500 + 600 = 5100
			expect(mockFormatEuro).toHaveBeenCalledWith(5100);
		});

		it("calculates total without discount when no discount applied", () => {
			mockCalculateShipping.mockReturnValue(600);
			const cart = createCart([createCartItem({ priceAtAdd: 5000, quantity: 1 })]);

			render(<CheckoutSummary cart={cart} />);

			// total = 5000 - 0 + 600 = 5600
			expect(mockFormatEuro).toHaveBeenCalledWith(5600);
		});
	});

	describe("discount display", () => {
		it("shows discount line when appliedDiscount is provided with discountAmount > 0", () => {
			const cart = createCart([createCartItem()]);
			const discount = createDiscount({ code: "SAVE10", discountAmount: 500 });

			render(<CheckoutSummary cart={cart} appliedDiscount={discount} />);

			expect(screen.getAllByText(/Réduction \(SAVE10\)/).length).toBeGreaterThanOrEqual(1);
		});

		it("shows formatted discount amount with negative sign", () => {
			mockFormatEuro.mockImplementation((n: number) => `${(n / 100).toFixed(2)} €`);
			const cart = createCart([createCartItem()]);
			const discount = createDiscount({ discountAmount: 500 });

			render(<CheckoutSummary cart={cart} appliedDiscount={discount} />);

			expect(screen.getAllByText(/-5\.00 €/).length).toBeGreaterThanOrEqual(1);
		});

		it("hides discount line when appliedDiscount is null", () => {
			const cart = createCart([createCartItem()]);

			render(<CheckoutSummary cart={cart} appliedDiscount={null} />);

			expect(screen.queryAllByText(/Réduction/)).toHaveLength(0);
		});

		it("hides discount line when appliedDiscount is undefined", () => {
			const cart = createCart([createCartItem()]);

			render(<CheckoutSummary cart={cart} />);

			expect(screen.queryAllByText(/Réduction/)).toHaveLength(0);
		});

		it("hides discount line when discountAmount is 0", () => {
			const cart = createCart([createCartItem()]);
			const discount = createDiscount({ discountAmount: 0 });

			render(<CheckoutSummary cart={cart} appliedDiscount={discount} />);

			expect(screen.queryAllByText(/Réduction/)).toHaveLength(0);
		});

		it("shows discount code in the reduction label", () => {
			const cart = createCart([createCartItem()]);
			const discount = createDiscount({ code: "SUMMER20", discountAmount: 1000 });

			render(<CheckoutSummary cart={cart} appliedDiscount={discount} />);

			expect(screen.getAllByText(/SUMMER20/).length).toBeGreaterThanOrEqual(1);
		});
	});

	describe("desktop layout", () => {
		it("renders a sticky card on desktop", () => {
			const cart = createCart([createCartItem()]);

			const { container } = render(<CheckoutSummary cart={cart} />);

			const stickyCard = container.querySelector('[class*="sticky"]');
			expect(stickyCard).not.toBeNull();
		});

		it("renders the 'Votre commande' heading on desktop", () => {
			const cart = createCart([createCartItem()]);

			render(<CheckoutSummary cart={cart} />);

			expect(screen.getByText("Votre commande")).toBeInTheDocument();
		});
	});

	describe("mobile layout", () => {
		it("renders a collapsible for mobile", () => {
			const cart = createCart([createCartItem()]);

			render(<CheckoutSummary cart={cart} />);

			expect(screen.getByTestId("collapsible")).toBeInTheDocument();
		});

		it("shows total item count in the collapsible trigger", () => {
			const cart = createCart([
				createCartItem({ id: "item-1", quantity: 2 }),
				createCartItem({ id: "item-2", quantity: 1 }),
			]);

			render(<CheckoutSummary cart={cart} />);

			expect(screen.getByTestId("collapsible-trigger").textContent).toContain("3 articles");
		});
	});

	describe("security and trust elements", () => {
		it("renders payment icons", () => {
			const cart = createCart([createCartItem()]);

			render(<CheckoutSummary cart={cart} />);

			expect(screen.getAllByTestId("visa-icon").length).toBeGreaterThanOrEqual(1);
			expect(screen.getAllByTestId("mastercard-icon").length).toBeGreaterThanOrEqual(1);
			expect(screen.getAllByTestId("cb-icon").length).toBeGreaterThanOrEqual(1);
		});

		it("renders secure payment message", () => {
			const cart = createCart([createCartItem()]);

			render(<CheckoutSummary cart={cart} />);

			expect(screen.getAllByText("Paiement 100% sécurisé").length).toBeGreaterThanOrEqual(1);
		});

		it("renders return policy and CGV links", () => {
			const cart = createCart([createCartItem()]);

			render(<CheckoutSummary cart={cart} />);

			expect(screen.getAllByText("Politique de retour").length).toBeGreaterThanOrEqual(1);
			expect(screen.getAllByText("CGV").length).toBeGreaterThanOrEqual(1);
		});

		it("renders the TVA notice", () => {
			const cart = createCart([createCartItem()]);

			render(<CheckoutSummary cart={cart} />);

			expect(
				screen.getAllByText("TVA non applicable, art. 293 B du CGI").length,
			).toBeGreaterThanOrEqual(1);
		});
	});

	describe("edit cart button", () => {
		it("renders the edit cart button", () => {
			const cart = createCart([createCartItem()]);

			render(<CheckoutSummary cart={cart} />);

			expect(
				screen.getAllByRole("button", { name: "Modifier mon panier" }).length,
			).toBeGreaterThanOrEqual(1);
		});
	});
});
