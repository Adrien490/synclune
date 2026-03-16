import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Stub shipping helpers — values are exercised in product-care-info tests
vi.mock("@/modules/orders/services/shipping.service", () => ({
	formatShippingPrice: (cents: number) => `${(cents / 100).toFixed(2)} €`,
}));

vi.mock("@/modules/orders/constants/shipping-rates", () => ({
	SHIPPING_RATES: {
		FR: { amount: 499 },
		EU: { amount: 950 },
	},
}));

// Stub Lucide icons — not under test
vi.mock("lucide-react", () => ({
	Truck: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="icon-truck" {...props} />,
	RotateCcw: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="icon-rotate" {...props} />,
	ShieldCheck: (props: React.SVGProps<SVGSVGElement>) => (
		<svg data-testid="icon-shield" {...props} />
	),
}));

// Stub payment icons — render accessible images
vi.mock("@/shared/components/icons/payment-icons", () => ({
	VisaIcon: (props: React.SVGProps<SVGSVGElement>) => (
		<img role="img" alt="Visa" {...(props as React.ImgHTMLAttributes<HTMLImageElement>)} />
	),
	MastercardIcon: (props: React.SVGProps<SVGSVGElement>) => (
		<img role="img" alt="Mastercard" {...(props as React.ImgHTMLAttributes<HTMLImageElement>)} />
	),
	CBIcon: (props: React.SVGProps<SVGSVGElement>) => (
		<img role="img" alt="CB" {...(props as React.ImgHTMLAttributes<HTMLImageElement>)} />
	),
}));

// Stub StripeWordmark
vi.mock("@/modules/payments/components/stripe-wordmark", () => ({
	StripeWordmark: (props: React.SVGProps<SVGSVGElement>) => (
		<svg data-testid="stripe-wordmark" {...props} />
	),
}));

import { ProductReassurance } from "../product-reassurance";

afterEach(cleanup);

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("ProductReassurance", () => {
	it("renders the three trust-badge list items", () => {
		render(<ProductReassurance />);

		const items = screen.getAllByRole("listitem");
		expect(items).toHaveLength(3);
	});

	it("displays the French shipping price", () => {
		render(<ProductReassurance />);

		// FR: 499 cents → "4.99 €"
		expect(screen.getByText(/4\.99 €/)).toBeInTheDocument();
	});

	it("displays the EU shipping price", () => {
		render(<ProductReassurance />);

		// EU: 950 cents → "9.50 €"
		expect(screen.getByText(/9\.50 €/)).toBeInTheDocument();
	});

	it("displays the returns policy text", () => {
		render(<ProductReassurance />);

		expect(screen.getByText(/Retours et échanges sous 14 jours/i)).toBeInTheDocument();
	});

	it("displays the secure payment text", () => {
		render(<ProductReassurance />);

		expect(screen.getByText(/Paiement sécurisé/i)).toBeInTheDocument();
	});

	it("renders the three trust icons", () => {
		render(<ProductReassurance />);

		expect(screen.getByTestId("icon-truck")).toBeInTheDocument();
		expect(screen.getByTestId("icon-rotate")).toBeInTheDocument();
		expect(screen.getByTestId("icon-shield")).toBeInTheDocument();
	});

	it("renders the Visa, Mastercard and CB payment icons", () => {
		render(<ProductReassurance />);

		expect(screen.getByRole("img", { name: "Visa" })).toBeInTheDocument();
		expect(screen.getByRole("img", { name: "Mastercard" })).toBeInTheDocument();
		expect(screen.getByRole("img", { name: "CB" })).toBeInTheDocument();
	});

	it("renders the Stripe wordmark", () => {
		render(<ProductReassurance />);

		expect(screen.getByTestId("stripe-wordmark")).toBeInTheDocument();
	});
});
