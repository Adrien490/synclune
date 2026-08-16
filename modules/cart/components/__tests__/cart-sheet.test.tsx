import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockClose, mockFooterProps, mockRemoveUnavailableProps } = vi.hoisted(() => ({
	mockClose: vi.fn(),
	mockFooterProps: vi.fn(),
	mockRemoveUnavailableProps: vi.fn(),
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/providers/overlay-store-provider", () => ({
	useSheet: () => ({ isOpen: true, close: mockClose }),
}));

vi.mock("@/shared/hooks/use-mobile", () => ({
	useIsMobile: () => false,
}));

vi.mock("@/shared/hooks/use-haptic", () => ({
	useHaptic: () => vi.fn(),
	triggerHaptic: vi.fn(),
}));

vi.mock("motion/react", () => ({
	AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	m: {
		li: ({
			children,
			className,
		}: React.HTMLAttributes<HTMLLIElement> & { children?: React.ReactNode }) => (
			<li className={className}>{children}</li>
		),
	},
	useReducedMotion: () => false,
}));

vi.mock("@/shared/components/ui/sheet", () => ({
	Sheet: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	SheetContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<div data-testid="sheet-content" className={className}>
			{children}
		</div>
	),
	SheetHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	SheetTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
	SheetDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
	SheetClose: ({ children }: { children: React.ReactNode }) => (
		<button type="button">{children}</button>
	),
}));

vi.mock("@/shared/components/ui/drawer", () => ({
	Drawer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	DrawerContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	DrawerHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	DrawerTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
	DrawerDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
	DrawerClose: ({ children }: { children: React.ReactNode }) => (
		<button type="button">{children}</button>
	),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({ children }: { children: React.ReactNode }) => (
		<button type="button">{children}</button>
	),
}));

vi.mock("@/shared/components/ui/empty", () => ({
	Empty: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	EmptyActions: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	EmptyDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
	EmptyHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	EmptyMedia: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	EmptyTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
}));

vi.mock("next/link", () => ({
	default: ({ href, children }: { href: string; children: React.ReactNode }) => (
		<a href={href}>{children}</a>
	),
}));

vi.mock("@phosphor-icons/react/ssr", () => ({
	ShoppingBagIcon: () => <svg data-testid="bag-icon" />,
	XIcon: () => <svg data-testid="x-icon" />,
}));

vi.mock("@/shared/utils/format-euro", () => ({
	formatEuro: (cents: number) => `${(cents / 100).toFixed(2)} €`,
}));

vi.mock("../cart-sheet-item-row", () => ({
	CartSheetItemRow: ({ item }: { item: { id: string } }) => (
		<div data-testid={`item-row-${item.id}`} />
	),
}));

vi.mock("../cart-sheet-footer", () => ({
	CartSheetFooter: (props: Record<string, unknown>) => {
		mockFooterProps(props);
		return <div data-testid="cart-sheet-footer" />;
	},
}));

vi.mock("../cart-price-change-alert", () => ({
	CartPriceChangeAlert: () => <div data-testid="price-change-alert" />,
}));

vi.mock("../cart-clear-button", () => ({
	CartClearButton: () => <button type="button">Vider</button>,
}));

vi.mock("../cart-remove-unavailable-button", () => ({
	CartRemoveUnavailableButton: (props: { itemsWithIssues: { id: string }[] }) => {
		mockRemoveUnavailableProps(props);
		return <button type="button" data-testid="remove-unavailable-button" />;
	},
}));

vi.mock("../clear-cart-alert-dialog", () => ({
	ClearCartAlertDialog: () => null,
}));

vi.mock("../remove-cart-item-alert-dialog", () => ({
	RemoveCartItemAlertDialog: () => null,
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { CartSheet } from "../cart-sheet";
import type { CartItem } from "../../types/cart.types";

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

function createItem(
	overrides?: Partial<{
		id: string;
		quantity: number;
		priceAtAdd: number;
		priceCents: number | null;
		productPriceCents: number;
		stock: number;
		active: boolean;
		productActive: boolean;
	}>,
): CartItem {
	const id = overrides?.id ?? "variant-1";
	return {
		id,
		quantity: overrides?.quantity ?? 1,
		priceAtAdd: overrides?.priceAtAdd ?? 2500,
		variant: {
			id,
			priceCents: overrides?.priceCents ?? 2500,
			stock: overrides?.stock ?? 10,
			active: overrides?.active ?? true,
			size: null,
			color: null,
			material: null,
			product: {
				id: "prod-1",
				name: "Bracelet Lune",
				slug: "bracelet-lune",
				active: overrides?.productActive ?? true,
				priceCents: overrides?.productPriceCents ?? 2500,
				media: [],
			},
		} as unknown as CartItem["variant"],
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("CartSheet", () => {
	it("rend l'état vide quand le panier n'a pas d'articles", () => {
		render(<CartSheet cart={{ items: [] }} />);
		expect(screen.getByText("Ton panier est encore vide")).toBeInTheDocument();
		expect(screen.queryByTestId("cart-sheet-footer")).toBeNull();
	});

	it("rend une ligne par article et le footer quand le panier est rempli", () => {
		render(<CartSheet cart={{ items: [createItem({ id: "v1" }), createItem({ id: "v2" })] }} />);
		expect(screen.getByTestId("item-row-v1")).toBeInTheDocument();
		expect(screen.getByTestId("item-row-v2")).toBeInTheDocument();
		expect(screen.getByTestId("cart-sheet-footer")).toBeInTheDocument();
	});

	/**
	 * @regression cart-sheet-list-not-clipped-2026-08-04
	 *
	 * La ligne d'article peint VOLONTAIREMENT hors de sa boîte : rotation ±0,4° du
	 * tirage (1,19 px de débord au coin), `shadow-sm`, halo de survol de
	 * `CARD_SURFACE_HOVER` (30 px de flou) et ombre de focus de
	 * `CARD_SURFACE_FOCUS`. Un `overflow-hidden` sur la liste ou ses items rognait
	 * les quatre — dont une affordance CLAVIER (l'ombre de focus), pas seulement de
	 * l'esthétique. Il ne protégerait rien : l'animation de sortie est
	 * `opacity + scale`, jamais `height`.
	 *
	 * Le conteneur de défilement, lui, DOIT garder `overflow-x-hidden` explicite
	 * (le débord de rotation créerait une scrollbar horizontale parasite) et
	 * `overscroll-contain` (sans lui, le bout de liste propage le scroll à la page
	 * derrière le panneau — chaînage iOS).
	 *
	 * (Ce describe avait été promis par le commentaire de `cart-sheet.tsx` sous le
	 * nom `__tests__/cart-sheet.test.tsx` mais n'a jamais existé avant le
	 * 2026-08-15 — le tag était pendu dans le vide.)
	 */
	describe("@regression la liste du panier n'est pas clipée", () => {
		it("ni la liste ni ses items ne portent overflow-hidden", () => {
			const { container } = render(<CartSheet cart={{ items: [createItem()] }} />);
			const list = container.querySelector("ul");
			expect(list).not.toBeNull();
			expect(list!.className).not.toContain("overflow-hidden");
			for (const li of Array.from(list!.querySelectorAll("li"))) {
				expect(li.className).not.toContain("overflow-hidden");
			}
		});

		it("le conteneur de défilement garde overflow-x-hidden et overscroll-contain", () => {
			const { container } = render(<CartSheet cart={{ items: [createItem()] }} />);
			const scroller = container.querySelector("ul")!.parentElement!;
			expect(scroller.className).toContain("overflow-x-hidden");
			expect(scroller.className).toContain("overflow-y-auto");
			expect(scroller.className).toContain("overscroll-contain");
		});
	});

	describe("blocage du CTA (props du footer)", () => {
		it("passe hasPriceIncrease=false quand aucun prix n'a bougé", () => {
			render(<CartSheet cart={{ items: [createItem()] }} />);
			expect(mockFooterProps).toHaveBeenCalledWith(
				expect.objectContaining({ hasPriceIncrease: false, hasStockIssues: false }),
			);
		});

		it("passe hasPriceIncrease=true quand un prix a monté sur une ligne active", () => {
			render(<CartSheet cart={{ items: [createItem({ priceAtAdd: 2000, priceCents: 2500 })] }} />);
			expect(mockFooterProps).toHaveBeenCalledWith(
				expect.objectContaining({ hasPriceIncrease: true }),
			);
		});

		it("ignore la hausse d'une ligne inactive — `updateCartPrices` ne la rafraîchit pas, et elle bloque déjà via hasStockIssues", () => {
			render(
				<CartSheet
					cart={{ items: [createItem({ priceAtAdd: 2000, priceCents: 2500, active: false })] }}
				/>,
			);
			expect(mockFooterProps).toHaveBeenCalledWith(
				expect.objectContaining({ hasPriceIncrease: false, hasStockIssues: true }),
			);
		});
	});

	describe("alerte stock", () => {
		it("liste les lignes fautives et rend le bouton de retrait en un clic", () => {
			render(
				<CartSheet
					cart={{
						items: [createItem({ id: "v1", stock: 0, quantity: 1 }), createItem({ id: "v2" })],
					}}
				/>,
			);
			expect(screen.getByText("Ajuste ton panier pour continuer")).toBeInTheDocument();
			expect(screen.getByTestId("remove-unavailable-button")).toBeInTheDocument();
			expect(mockRemoveUnavailableProps).toHaveBeenCalledWith(
				expect.objectContaining({
					itemsWithIssues: [expect.objectContaining({ id: "v1" })],
				}),
			);
		});

		it("ne rend pas l'alerte quand toutes les lignes sont servables", () => {
			render(<CartSheet cart={{ items: [createItem()] }} />);
			expect(screen.queryByText("Ajuste ton panier pour continuer")).toBeNull();
		});
	});
});
