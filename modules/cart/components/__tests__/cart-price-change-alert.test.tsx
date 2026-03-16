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

vi.mock("lucide-react", () => ({
	RefreshCw: ({ className }: { className?: string }) => (
		<svg data-testid="refresh-icon" className={className} />
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
	sku: { priceInclTax: number; product: { title: string } };
};

function createItem(id: string, priceAtAdd: number, priceInclTax: number, quantity = 1): PriceItem {
	return {
		id,
		priceAtAdd,
		quantity,
		sku: { priceInclTax, product: { title: `Produit ${id}` } },
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

	it("renders the alert when a price has decreased", () => {
		const items = [createItem("1", 3000, 2500)];
		render(<CartPriceChangeAlert items={items as never} />);
		expect(screen.getByRole("alert")).toBeInTheDocument();
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
		expect(screen.getByRole("button", { name: /Mise à jour\.\.\./i })).toBeDisabled();
	});

	it("shows savings message when price decreased", () => {
		// priceAtAdd=3000, priceInclTax=2500 → savings = 500
		const items = [createItem("1", 3000, 2500, 1)];
		render(<CartPriceChangeAlert items={items as never} />);
		// The savings paragraph contains both the icon and the formatted saving amount
		const savingsText = screen.getByText(/Économise.*en actualisant/i);
		expect(savingsText).toBeInTheDocument();
	});

	it("has aria-live='polite' on the alert container", () => {
		const items = [createItem("1", 2000, 2500)];
		render(<CartPriceChangeAlert items={items as never} />);
		expect(screen.getByRole("alert")).toHaveAttribute("aria-live", "polite");
	});

	it("shows downward arrow for price decrease", () => {
		const items = [createItem("1", 3000, 2500)];
		render(<CartPriceChangeAlert items={items as never} />);
		expect(screen.getByText("↓ 25.00 €")).toBeInTheDocument();
	});
});
