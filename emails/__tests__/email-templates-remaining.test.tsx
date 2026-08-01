import { describe, it, expect } from "vitest";
import { render } from "@react-email/render";
import { CancelOrderConfirmationEmail } from "../cancel-order-confirmation-email";
import { PaymentFailedEmail } from "../payment-failed-email";
import { RefundConfirmedEmail } from "../refund-confirmed-email";
import { AdminAlertEmail } from "../admin-alert-email";

// ---------------------------------------------------------------------------
// CancelOrderConfirmationEmail
// ---------------------------------------------------------------------------

describe("CancelOrderConfirmationEmail", () => {
	const baseProps = {
		orderNumber: "CMD-2024-ABCD1234",
		customerName: "Marie",
		orderTotal: 8990,
		reason: "Demande client",
		wasRefunded: true,
		orderDetailsUrl: "https://synclune.fr/commandes/CMD-2024-ABCD1234",
	};

	it("renders without error", async () => {
		const html = await render(<CancelOrderConfirmationEmail {...baseProps} />);
		expect(html).toContain("<!DOCTYPE");
		expect(html.length).toBeGreaterThan(100);
	});

	it("contains expected heading", async () => {
		const html = await render(<CancelOrderConfirmationEmail {...baseProps} />);
		expect(html).toContain("Commande annulée");
	});

	it("contains dynamic data", async () => {
		const html = await render(<CancelOrderConfirmationEmail {...baseProps} />);
		expect(html).toContain("CMD-2024-ABCD1234");
		expect(html).toContain("Marie");
		expect(html).toContain("Demande client");
	});

	it("shows refund section when wasRefunded is true", async () => {
		const html = await render(<CancelOrderConfirmationEmail {...baseProps} />);
		expect(html).toContain("Remboursement");
	});

	it("does not show refund section when wasRefunded is false", async () => {
		const html = await render(<CancelOrderConfirmationEmail {...baseProps} wasRefunded={false} />);
		expect(html).not.toContain("Remboursement");
	});
});

// ---------------------------------------------------------------------------
// PaymentFailedEmail
// ---------------------------------------------------------------------------

describe("PaymentFailedEmail", () => {
	const baseProps = {
		orderNumber: "CMD-2024-ABCD1234",
		customerName: "Marie",
		retryUrl: "https://synclune.fr/creations",
	};

	it("renders without error", async () => {
		const html = await render(<PaymentFailedEmail {...baseProps} />);
		expect(html).toContain("<!DOCTYPE");
		expect(html.length).toBeGreaterThan(100);
	});

	it("contains expected heading", async () => {
		const html = await render(<PaymentFailedEmail {...baseProps} />);
		expect(html).toContain("Paiement échoué");
	});

	it("contains dynamic data", async () => {
		const html = await render(<PaymentFailedEmail {...baseProps} />);
		expect(html).toContain("CMD-2024-ABCD1234");
		expect(html).toContain("Marie");
		expect(html).toContain("https://synclune.fr/creations");
	});
});

// ---------------------------------------------------------------------------
// RefundConfirmedEmail
// ---------------------------------------------------------------------------

describe("RefundConfirmedEmail", () => {
	const baseProps = {
		orderNumber: "CMD-2024-ABCD1234",
		customerName: "Marie",
		refundAmount: 8990,
		reason: "CUSTOMER_REQUEST",
		orderDetailsUrl: "https://synclune.fr/commandes/CMD-2024-ABCD1234",
	};

	it("renders without error", async () => {
		const html = await render(<RefundConfirmedEmail {...baseProps} />);
		expect(html).toContain("<!DOCTYPE");
		expect(html.length).toBeGreaterThan(100);
	});

	it("contains expected heading", async () => {
		const html = await render(<RefundConfirmedEmail {...baseProps} />);
		expect(html).toContain("Remboursement effectué");
	});

	it("contains dynamic data", async () => {
		const html = await render(<RefundConfirmedEmail {...baseProps} />);
		expect(html).toContain("CMD-2024-ABCD1234");
		expect(html).toContain("Marie");
	});
});

// ---------------------------------------------------------------------------
// AdminAlertEmail (merged template, 7 variants)
// ---------------------------------------------------------------------------

describe("AdminAlertEmail", () => {
	const baseProps = {
		context: "Commande : CMD-1730000000-ABCD\nClient   : marie@example.com",
		summary: "Résumé de l'alerte pour l'admin.",
		ctaUrl: "https://synclune.fr/admin",
		ctaLabel: "Voir le dashboard",
	} as const;

	it("renders without error", async () => {
		const html = await render(<AdminAlertEmail {...baseProps} type="refund" />);
		expect(html).toContain("<!DOCTYPE");
		expect(html.length).toBeGreaterThan(100);
	});

	it("uses header specific to type=cron", async () => {
		const html = await render(<AdminAlertEmail {...baseProps} type="cron" />);
		expect(html).toContain("Échec cron job");
	});

	it("uses header specific to type=dispute", async () => {
		const html = await render(<AdminAlertEmail {...baseProps} type="dispute" />);
		expect(html).toContain("Litige Stripe");
	});

	it("uses header specific to type=invoice", async () => {
		const html = await render(<AdminAlertEmail {...baseProps} type="invoice" />);
		expect(html).toContain("Échec génération facture");
	});

	it("uses header specific to type=order-processing with URGENT label", async () => {
		const html = await render(<AdminAlertEmail {...baseProps} type="order-processing" />);
		expect(html).toContain("Échec traitement commande");
		expect(html).toContain("URGENT");
	});

	it("uses header specific to type=refund", async () => {
		const html = await render(<AdminAlertEmail {...baseProps} type="refund" />);
		expect(html).toContain("Échec du remboursement");
	});

	it("uses header specific to type=webhook", async () => {
		const html = await render(<AdminAlertEmail {...baseProps} type="webhook" />);
		expect(html).toContain("Webhook Stripe en échec");
	});

	it("includes context and summary in body", async () => {
		const html = await render(<AdminAlertEmail {...baseProps} type="refund" />);
		expect(html).toContain("CMD-1730000000-ABCD");
		expect(html).toContain("marie@example.com");
		expect(html).toContain("Résumé de l");
		expect(html).toContain("alerte");
	});

	it("renders stackTrace block when provided", async () => {
		const html = await render(
			<AdminAlertEmail {...baseProps} type="refund" stackTrace="Error: boom at foo.ts:42" />,
		);
		expect(html).toContain("Détails techniques");
		expect(html).toContain("Error: boom at foo.ts:42");
	});

	it("does not render stackTrace block when omitted", async () => {
		const html = await render(<AdminAlertEmail {...baseProps} type="dispute" />);
		expect(html).not.toContain("Détails techniques");
	});

	it("renders Stripe CTA when stripeCtaUrl is provided", async () => {
		const html = await render(
			<AdminAlertEmail
				{...baseProps}
				type="dispute"
				stripeCtaUrl="https://dashboard.stripe.com/disputes/dp_test"
				stripeCtaLabel="Répondre au litige"
			/>,
		);
		expect(html).toContain("Répondre au litige");
		expect(html).toContain("https://dashboard.stripe.com/disputes/dp_test");
	});

	it("always renders the primary admin CTA", async () => {
		const html = await render(<AdminAlertEmail {...baseProps} type="cron" />);
		expect(html).toContain("Voir le dashboard");
		expect(html).toContain("https://synclune.fr/admin");
	});
});
