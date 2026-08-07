import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockOpen, mockIsOpen, mockCartCount } = vi.hoisted(() => ({
	mockOpen: vi.fn(),
	mockIsOpen: { value: false },
	mockCartCount: { value: 0 },
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

vi.mock("@/shared/providers/overlay-store-provider", () => ({
	useSheet: () => ({ isOpen: mockIsOpen.value, open: mockOpen }),
}));

vi.mock("@/modules/cart/lib/fly-to-cart", () => ({
	CART_TARGET_ATTR: "data-cart-target",
}));

vi.mock("@/shared/stores/badge-counts-store", () => ({
	useBadgeCountsStore: (selector: (s: { cartCount: number }) => unknown) =>
		selector({ cartCount: mockCartCount.value }),
}));

vi.mock("@/modules/cart/components/cart-badge", () => ({
	CartBadge: () => <span data-testid="cart-badge" />,
}));

vi.mock("@phosphor-icons/react/ssr", () => ({
	ShoppingBagIcon: ({ size, className }: { size?: number; className?: string }) => (
		<svg data-testid="shopping-cart-icon" data-size={size} className={className} />
	),
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { CartSheetTrigger } from "../cart-sheet-trigger";

// ============================================================================
// TESTS
// ============================================================================

afterEach(cleanup);

describe("CartSheetTrigger", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockIsOpen.value = false;
		mockCartCount.value = 0;
	});

	it("renders a button with accessible label", () => {
		render(<CartSheetTrigger />);
		expect(screen.getByRole("button", { name: /Ouvrir mon panier/ })).toBeInTheDocument();
	});

	/**
	 * @regression cart-trigger-count-in-name-2026-08-07
	 *
	 * ⚠️ `aria-label="Ouvrir mon panier"` ÉCRASAIT le contenu du bouton : le texte
	 * sr-only du `CountBadge`, pourtant enfant, ne participait pas au nom
	 * accessible. Un utilisateur qui tabulait jusqu'ici n'apprenait jamais combien
	 * d'articles s'y trouvent — le nombre n'était annoncé qu'au moment d'un
	 * CHANGEMENT, par la région live du badge.
	 */
	it("porte le nombre d'articles DANS son nom accessible", () => {
		mockCartCount.value = 3;
		render(<CartSheetTrigger />);

		const name = screen.getByRole("button").getAttribute("aria-label");
		expect(name).toContain("Ouvrir mon panier");
		expect(name).toContain("3 articles");
	});

	it("accorde le singulier et annonce le panier vide", () => {
		mockCartCount.value = 1;
		const { unmount } = render(<CartSheetTrigger />);
		expect(screen.getByRole("button").getAttribute("aria-label")).toContain("1 article");
		expect(screen.getByRole("button").getAttribute("aria-label")).not.toContain("1 articles");
		unmount();

		mockCartCount.value = 0;
		render(<CartSheetTrigger />);
		expect(screen.getByRole("button").getAttribute("aria-label")).toContain("vide");
	});

	it("renders the shopping cart icon", () => {
		render(<CartSheetTrigger />);
		expect(screen.getByTestId("shopping-cart-icon")).toBeInTheDocument();
	});

	it("renders the CartBadge inside", () => {
		render(<CartSheetTrigger />);
		expect(screen.getByTestId("cart-badge")).toBeInTheDocument();
	});

	it("has aria-expanded=false when sheet is closed", () => {
		mockIsOpen.value = false;
		render(<CartSheetTrigger />);
		expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "false");
	});

	it("has aria-expanded=true when sheet is open", () => {
		mockIsOpen.value = true;
		render(<CartSheetTrigger />);
		expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "true");
	});

	it("has aria-haspopup=dialog", () => {
		render(<CartSheetTrigger />);
		expect(screen.getByRole("button")).toHaveAttribute("aria-haspopup", "dialog");
	});

	it("calls open when clicked", async () => {
		render(<CartSheetTrigger />);
		await userEvent.click(screen.getByRole("button"));
		expect(mockOpen).toHaveBeenCalledOnce();
	});

	it("applies additional className", () => {
		render(<CartSheetTrigger className="custom-class" />);
		const btn = screen.getByRole("button");
		expect(btn.className).toContain("custom-class");
	});
});
