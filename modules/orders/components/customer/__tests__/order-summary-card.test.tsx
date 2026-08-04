import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

vi.mock("@/shared/components/ui/separator", () => ({
	Separator: () => <hr />,
}));

vi.mock("@/shared/utils/format-euro", () => ({
	formatEuro: (cents: number) => `${(cents / 100).toFixed(2)} €`,
}));

vi.mock("date-fns", () => ({
	format: (_date: unknown, _fmt: string, _options?: unknown) => "1 janvier 2026",
}));

vi.mock("date-fns/locale", () => ({
	fr: {},
}));

import { OrderSummaryCard } from "../order-summary-card";

afterEach(cleanup);

// ============================================================================
// HELPERS
// ============================================================================

function createOrder(
	overrides: Partial<{
		orderNumber: string;
		createdAt: Date;
		subtotal: number;
		discountAmount: number;
		discountCode: string | null;
		shippingCost: number;
		total: number;
		currency: string;
		paymentMethod: string | null;
	}> = {},
) {
	return {
		orderNumber: "CMD-2026-001",
		createdAt: new Date("2026-01-01"),
		subtotal: 5000,
		discountAmount: 0,
		discountCode: null,
		shippingCost: 500,
		total: 5500,
		paymentMethod: null,
		...overrides,
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("OrderSummaryCard", () => {
	it("renders 'Récapitulatif' heading", () => {
		render(<OrderSummaryCard order={createOrder()} />);
		expect(screen.getByRole("heading", { name: "Récapitulatif" })).toBeInTheDocument();
	});

	it("shows the subtotal formatted in euros", () => {
		render(<OrderSummaryCard order={createOrder({ subtotal: 4800 })} />);
		expect(screen.getByText("Sous-total")).toBeInTheDocument();
		expect(screen.getByText("48.00 €")).toBeInTheDocument();
	});

	it("shows the shipping cost formatted in euros when non-zero", () => {
		render(<OrderSummaryCard order={createOrder({ shippingCost: 500 })} />);
		expect(screen.getByText("Livraison")).toBeInTheDocument();
		expect(screen.getByText("5.00 €")).toBeInTheDocument();
	});

	it("shows 'Offerte' when shipping cost is zero", () => {
		render(<OrderSummaryCard order={createOrder({ shippingCost: 0 })} />);
		expect(screen.getByText("Offerte")).toBeInTheDocument();
	});

	it("shows the total formatted in euros", () => {
		render(<OrderSummaryCard order={createOrder({ total: 5300 })} />);
		expect(screen.getByText("Total")).toBeInTheDocument();
		expect(screen.getByText("53.00 €")).toBeInTheDocument();
	});

	it("hides the discount row when discountAmount is zero", () => {
		render(<OrderSummaryCard order={createOrder({ discountAmount: 0 })} />);
		expect(screen.queryByText(/Réduction/)).not.toBeInTheDocument();
	});

	it("shows the order number", () => {
		render(<OrderSummaryCard order={createOrder({ orderNumber: "CMD-2026-042" })} />);
		expect(screen.getByText("CMD-2026-042")).toBeInTheDocument();
	});

	it("shows the payment method when provided", () => {
		render(<OrderSummaryCard order={createOrder({ paymentMethod: "card" })} />);
		expect(screen.getByText("Paiement")).toBeInTheDocument();
		expect(screen.getByText("card")).toBeInTheDocument();
	});

	it("hides the payment method row when paymentMethod is null", () => {
		render(<OrderSummaryCard order={createOrder({ paymentMethod: null })} />);
		expect(screen.queryByText("Paiement")).not.toBeInTheDocument();
	});
});
