import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/shared/components/ui/card", () => ({
	Card: ({ children }: any) => <div>{children}</div>,
	CardHeader: ({ children }: any) => <div>{children}</div>,
	CardTitle: ({ children }: any) => <div>{children}</div>,
	CardContent: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({ children, asChild, ...props }: any) => {
		if (asChild) return <div {...props}>{children}</div>;
		return <button {...props}>{children}</button>;
	},
}));

vi.mock("lucide-react", () => ({
	CreditCard: () => <svg aria-hidden="true" />,
	ExternalLink: () => <svg aria-hidden="true" />,
}));

vi.mock("date-fns", () => ({
	format: () => "10 janvier 2026 à 14h00",
}));
vi.mock("date-fns/locale", () => ({ fr: {} }));

vi.mock("@/shared/components/copy-button", () => ({
	CopyButton: ({ label }: any) => <button aria-label={`Copier ${label}`} />,
}));

import { OrderPaymentCard } from "../order-payment-card";

afterEach(cleanup);

function createOrder(overrides = {}) {
	return {
		id: "order-1",
		paymentMethod: "card",
		paidAt: null,
		stripePaymentIntentId: null,
		...overrides,
	} as any;
}

describe("OrderPaymentCard", () => {
	it("renders title Paiement", () => {
		render(<OrderPaymentCard order={createOrder()} />);
		expect(screen.getByText("Paiement")).toBeInTheDocument();
	});

	it("shows payment method", () => {
		render(<OrderPaymentCard order={createOrder({ paymentMethod: "card" })} />);
		expect(screen.getByText("card")).toBeInTheDocument();
	});

	it("shows paid date when paidAt is set", () => {
		render(<OrderPaymentCard order={createOrder({ paidAt: new Date("2026-01-10T14:00:00Z") })} />);
		expect(screen.getByText("Date de paiement")).toBeInTheDocument();
		expect(screen.getByText("10 janvier 2026 à 14h00")).toBeInTheDocument();
	});

	it("hides paid date section when paidAt is null", () => {
		render(<OrderPaymentCard order={createOrder({ paidAt: null })} />);
		expect(screen.queryByText("Date de paiement")).toBeNull();
	});

	it("shows Stripe Payment Intent ID when present", () => {
		render(
			<OrderPaymentCard order={createOrder({ stripePaymentIntentId: "pi_3OxyzABC123456" })} />,
		);
		expect(screen.getByText("pi_3OxyzABC123456")).toBeInTheDocument();
	});

	it("shows Stripe Payment Intent section label when ID present", () => {
		render(
			<OrderPaymentCard order={createOrder({ stripePaymentIntentId: "pi_3OxyzABC123456" })} />,
		);
		expect(screen.getByText("Stripe Payment Intent")).toBeInTheDocument();
	});

	it("shows Stripe dashboard link when stripePaymentIntentId is set", () => {
		render(
			<OrderPaymentCard order={createOrder({ stripePaymentIntentId: "pi_3OxyzABC123456" })} />,
		);
		const link = screen.getByRole("link", { name: /Voir sur Stripe/ });
		expect(link).toHaveAttribute("href", "https://dashboard.stripe.com/payments/pi_3OxyzABC123456");
	});

	it("hides Stripe section when stripePaymentIntentId is null", () => {
		render(<OrderPaymentCard order={createOrder({ stripePaymentIntentId: null })} />);
		expect(screen.queryByText("Stripe Payment Intent")).toBeNull();
	});
});
