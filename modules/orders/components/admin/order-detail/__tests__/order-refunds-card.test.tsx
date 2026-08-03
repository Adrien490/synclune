import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/shared/components/ui/card", () => ({
	Card: ({ children }: any) => <div>{children}</div>,
	CardHeader: ({ children }: any) => <div>{children}</div>,
	CardTitle: ({ children }: any) => <div>{children}</div>,
	CardContent: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@/shared/components/ui/badge", () => ({
	Badge: ({ children, variant }: any) => <span data-variant={variant}>{children}</span>,
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({ children, asChild, ...props }: any) => {
		if (asChild) return <div {...props}>{children}</div>;
		return <button {...props}>{children}</button>;
	},
}));

vi.mock("lucide-react", () => ({
	RotateCcw: () => <svg aria-hidden="true" />,
	ExternalLink: () => <svg aria-hidden="true" />,
	Plus: () => <svg aria-hidden="true" />,
	Banknote: () => <svg aria-hidden="true" />,
}));

vi.mock("next/link", () => ({
	default: ({ children, href, ...props }: any) => (
		<a href={href} {...props}>
			{children}
		</a>
	),
}));

vi.mock("@/shared/utils/format-euro", () => ({
	formatEuro: (cents: number) => `${(cents / 100).toFixed(2)} €`,
}));

vi.mock("@/shared/utils/dates", () => ({
	formatDateShort: () => "1 janv. 2026",
}));

vi.mock("@/modules/refunds/constants/refund.constants", () => ({
	REFUND_STATUS_LABELS: {
		PENDING: "En attente",
		APPROVED: "Approuvé",
		COMPLETED: "Remboursé",
		REJECTED: "Refusé",
		FAILED: "Échoué",
		CANCELLED: "Annulé",
	},
	REFUND_STATUS_VARIANTS: {
		PENDING: "warning",
		APPROVED: "default",
		COMPLETED: "success",
		REJECTED: "destructive",
		FAILED: "destructive",
		CANCELLED: "secondary",
	},
	REFUND_REASON_LABELS: {
		CUSTOMER_REQUEST: "Rétractation client",
		DEFECTIVE: "Produit défectueux",
		WRONG_ITEM: "Erreur de préparation",
		LOST_IN_TRANSIT: "Colis perdu",
		FRAUD: "Fraude",
		OTHER: "Autre",
	},
}));

vi.mock("@/app/generated/prisma/browser", () => ({
	RefundStatus: {
		PENDING: "PENDING",
		APPROVED: "APPROVED",
		COMPLETED: "COMPLETED",
		REJECTED: "REJECTED",
		FAILED: "FAILED",
		CANCELLED: "CANCELLED",
	},
}));

import { OrderRefundsCard } from "../order-refunds-card";

afterEach(cleanup);

function createRefund(overrides = {}) {
	return {
		id: "refund-1",
		status: "PENDING",
		amount: 1500,
		reason: "CUSTOMER_REQUEST",
		createdAt: new Date("2026-01-01T10:00:00Z"),
		...overrides,
	} as any;
}

const PI = "pi_test_123";

describe("OrderRefundsCard", () => {
	it("returns null when no refunds and no canRefund", () => {
		const { container } = render(
			<OrderRefundsCard refunds={[]} canRefund={false} stripePaymentIntentId={PI} />,
		);
		expect(container.innerHTML).toBe("");
	});

	it("renders title Remboursements when refunds exist", () => {
		render(
			<OrderRefundsCard refunds={[createRefund()]} canRefund={false} stripePaymentIntentId={PI} />,
		);
		expect(screen.getByText("Remboursements")).toBeInTheDocument();
	});

	it("shows count badge when refunds exist", () => {
		render(
			<OrderRefundsCard
				refunds={[createRefund(), createRefund({ id: "refund-2" })]}
				canRefund={false}
				stripePaymentIntentId={PI}
			/>,
		);
		expect(screen.getByText("2")).toBeInTheDocument();
	});

	// Lot 2 S3.3 : le remboursement se fait dans le dashboard Stripe — la carte
	// porte un lien externe vers le PaymentIntent, plus de création in-app.
	it("shows the Stripe dashboard link when canRefund and a PaymentIntent exists", () => {
		render(<OrderRefundsCard refunds={[]} canRefund={true} stripePaymentIntentId={PI} />);
		const link = screen.getByRole("link", { name: /Rembourser dans Stripe/ });
		expect(link).toHaveAttribute("href", `https://dashboard.stripe.com/payments/${PI}`);
		expect(link).toHaveAttribute("target", "_blank");
		expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
	});

	it("hides the Stripe link when canRefund is false", () => {
		render(
			<OrderRefundsCard refunds={[createRefund()]} canRefund={false} stripePaymentIntentId={PI} />,
		);
		expect(screen.queryByText(/Rembourser dans Stripe/)).toBeNull();
	});

	it("hides the Stripe link when the order has no PaymentIntent", () => {
		render(
			<OrderRefundsCard refunds={[createRefund()]} canRefund={true} stripePaymentIntentId={null} />,
		);
		expect(screen.queryByText(/Rembourser dans Stripe/)).toBeNull();
	});

	it("shows Aucun remboursement text when refunds empty but canRefund is true", () => {
		render(<OrderRefundsCard refunds={[]} canRefund={true} stripePaymentIntentId={PI} />);
		expect(screen.getByText("Aucun remboursement pour cette commande.")).toBeInTheDocument();
	});

	it("shows refund status badge and amount", () => {
		render(
			<OrderRefundsCard
				refunds={[createRefund({ status: "COMPLETED", amount: 2000 })]}
				canRefund={false}
				stripePaymentIntentId={PI}
			/>,
		);
		expect(screen.getByText("Remboursé")).toBeInTheDocument();
		expect(screen.getByText("20.00 €")).toBeInTheDocument();
	});

	// Audit 2026-07-26 : « Marquer remboursée » a été retirée du header de cette
	// carte (bouton `outline`, même niveau visuel qu'un « Modifier ») pour la section
	// `danger` du menu d'actions — elle annule la facture et émet un avoir gap-free.
	it("n'expose PAS « Marquer remboursée » dans le header de la carte", () => {
		render(
			<OrderRefundsCard refunds={[createRefund()]} canRefund={true} stripePaymentIntentId={PI} />,
		);
		expect(screen.queryByText(/Marquer rembours/i)).toBeNull();
		// Le lien Stripe (remboursement réversible) reste bien exposé.
		expect(screen.getByText(/Rembourser dans Stripe/)).toBeInTheDocument();
	});
});
