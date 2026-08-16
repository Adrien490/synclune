import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockAction, mockIsPending } = vi.hoisted(() => ({
	mockAction: vi.fn(),
	mockIsPending: { value: false },
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/modules/cart/hooks/use-update-cart-prices", () => ({
	useUpdateCartPrices: () => ({
		action: mockAction,
		isPending: mockIsPending.value,
	}),
}));

vi.mock("@/shared/utils/format-euro", () => ({
	formatEuro: vi.fn((cents: number) => `${(cents / 100).toFixed(2)} €`),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		disabled,
		onClick,
	}: {
		children: React.ReactNode;
		disabled?: boolean;
		onClick?: () => void;
		[key: string]: unknown;
	}) => (
		<button disabled={disabled} onClick={onClick}>
			{children}
		</button>
	),
}));

vi.mock("@phosphor-icons/react/ssr", () => ({
	ArrowsClockwiseIcon: ({ className }: { className?: string }) => (
		<svg data-testid="refresh-icon" className={className} />
	),
	PiggyBankIcon: ({ className }: { className?: string }) => (
		<svg data-testid="piggy-bank-icon" className={className} />
	),
	WarningIcon: ({ className }: { className?: string }) => (
		<svg data-testid="warning-icon" className={className} />
	),
}));

// cart-pricing-calculator.service is NOT mocked — real implementation is used
// to drive visibility logic

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { CartPriceChangeAlert } from "../cart-price-change-alert";

// ============================================================================
// TEST HELPERS
// ============================================================================

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	mockIsPending.value = false;
});

type PriceItem = {
	id: string;
	priceAtAdd: number;
	quantity: number;
	variant: { priceCents: number; product: { title: string } };
};

function createItem(id: string, priceAtAdd: number, priceCents: number, quantity = 1): PriceItem {
	return {
		id,
		priceAtAdd,
		quantity,
		variant: { priceCents, product: { title: `Produit ${id}` } },
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("CartPriceChangeAlert", () => {
	it("renders nothing when all prices are unchanged", () => {
		const items = [createItem("1", 2500, 2500), createItem("2", 1500, 1500)];
		const { container } = render(<CartPriceChangeAlert items={items as never} />);
		expect(container.firstChild).toBeNull();
	});

	it("renders the alert when a price has increased", () => {
		const items = [createItem("1", 2000, 2500)];
		render(<CartPriceChangeAlert items={items as never} />);
		expect(screen.getByRole("alert")).toBeInTheDocument();
	});

	it("renders a positive status message when prices have only decreased", () => {
		const items = [createItem("1", 3000, 2500)];
		render(<CartPriceChangeAlert items={items as never} />);
		// When only decreases: uses role="status" (non-blocking, positive tone)
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
		expect(screen.getByRole("status")).toBeInTheDocument();
		expect(screen.getByText(/Des prix ont baissé/i)).toBeInTheDocument();
	});

	it("lists changed items with old and new price", () => {
		const items = [createItem("1", 2000, 2500)];
		render(<CartPriceChangeAlert items={items as never} />);
		// old price formatted
		expect(screen.getByText("20.00 €")).toBeInTheDocument();
		// new price formatted
		expect(screen.getByText("↑ 25.00 €")).toBeInTheDocument();
	});

	it("renders the 'Actualiser les prix' button", () => {
		const items = [createItem("1", 2000, 2500)];
		render(<CartPriceChangeAlert items={items as never} />);
		expect(screen.getByRole("button", { name: /Actualiser les prix/i })).toBeInTheDocument();
	});

	it("calls the action when the button is clicked", () => {
		const items = [createItem("1", 2000, 2500)];
		render(<CartPriceChangeAlert items={items as never} />);
		fireEvent.click(screen.getByRole("button", { name: /Actualiser les prix/i }));
		expect(mockAction).toHaveBeenCalledOnce();
	});

	it("disables the button when isPending is true", () => {
		mockIsPending.value = true;
		const items = [createItem("1", 2000, 2500)];
		render(<CartPriceChangeAlert items={items as never} />);
		expect(screen.getByRole("button", { name: /Mise à jour…/i })).toBeDisabled();
	});

	it("shows savings message when price decreased", () => {
		// priceAtAdd=3000, priceCents=2500 → savings = 500
		const items = [createItem("1", 3000, 2500, 1)];
		render(<CartPriceChangeAlert items={items as never} />);
		// The savings paragraph contains both the icon and the formatted saving amount
		const savingsText = screen.getByText(/Économise.*en actualisant/i);
		expect(savingsText).toBeInTheDocument();
	});

	it("ne double PAS role='alert' d'un aria-live redondant", () => {
		// `role="alert"` implique deja `aria-live="assertive"`. Le
		// `aria-live="polite"` qui l'accompagnait DEGRADAIT l'urgence qu'on venait
		// de declarer — l'attribut explicite l'emporte sur celui du role.
		const items = [createItem("1", 2000, 2500)];
		render(<CartPriceChangeAlert items={items as never} />);
		expect(screen.getByRole("alert")).not.toHaveAttribute("aria-live");
	});

	it("shows downward arrow for price decrease", () => {
		const items = [createItem("1", 3000, 2500)];
		render(<CartPriceChangeAlert items={items as never} />);
		expect(screen.getByText("↓ 25.00 €")).toBeInTheDocument();
	});

	/**
	 * @regression cart-price-copy-matches-billing-2026-08-15
	 *
	 * `createCheckoutSession` facture TOUJOURS le prix courant en base — jamais le
	 * témoin `priceAtAdd`. La copy de la branche « hausse » a longtemps affirmé le
	 * contraire (« Ton panier garde le prix du jour où tu les as ajoutées, pour
	 * éviter toute surprise ») : la cliente découvrait le vrai montant sur
	 * `/paiement`, exactement la surprise promise impossible. La copy doit dire la
	 * vérité (prix du jour facturé, actualisation requise) et l'alerte doit rester
	 * la cible de focus du CTA bloqué (`CartSheetFooter`).
	 */
	describe("@regression la copy hausse dit la vérité sur la facturation", () => {
		it("ne promet jamais de garder l'ancien prix", () => {
			const items = [createItem("1", 2000, 2500)];
			render(<CartPriceChangeAlert items={items as never} />);
			expect(screen.queryByText(/garde le prix/i)).toBeNull();
		});

		it("annonce le prix du jour et l'actualisation nécessaire pour continuer", () => {
			const items = [createItem("1", 2000, 2500)];
			render(<CartPriceChangeAlert items={items as never} />);
			expect(screen.getByText(/prix facturé est toujours le prix du jour/i)).toBeInTheDocument();
			expect(screen.getByText(/Actualise ton panier pour continuer/i)).toBeInTheDocument();
		});

		it("porte l'id et le tabIndex ciblés par le CTA bloqué quand une hausse existe", () => {
			const items = [createItem("1", 2000, 2500)];
			render(<CartPriceChangeAlert items={items as never} />);
			const alert = screen.getByRole("alert");
			expect(alert.id).toBe("price-increase-alert");
			expect(alert.tabIndex).toBe(-1);
		});

		it("ne porte pas l'id de blocage quand seules des baisses existent", () => {
			const items = [createItem("1", 3000, 2500)];
			render(<CartPriceChangeAlert items={items as never} />);
			expect(screen.getByRole("status").id).toBe("");
		});
	});
});
