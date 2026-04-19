import { describe, it, expect } from "vitest";
import { render } from "@react-email/render";
import { CancelOrderConfirmationEmail } from "../cancel-order-confirmation-email";
import { DeliveryConfirmationEmail } from "../delivery-confirmation-email";
import { PaymentFailedEmail } from "../payment-failed-email";
import { RefundStatusEmail } from "../refund-status-email";
import { RefundRejectedEmail } from "../refund-rejected-email";
import { ReturnConfirmationEmail } from "../return-confirmation-email";
import { TrackingUpdateEmail } from "../tracking-update-email";
import { PasswordChangedEmail } from "../password-changed-email";
import { AccountDeletionEmail } from "../account-deletion-email";
import { RevertShippingNotificationEmail } from "../revert-shipping-notification-email";
import { NewsletterConfirmationEmail } from "../newsletter-confirmation-email";
import { NewsletterWelcomeEmail } from "../newsletter-welcome-email";
import { AdminNewOrderEmail } from "../admin-new-order-email";
import { AdminAlertEmail } from "../admin-alert-email";
import { WelcomeEmail } from "../welcome-email";
import type { OrderItem, AdminShippingAddress } from "@/modules/emails/types/email.types";

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const baseAdminShippingAddress: AdminShippingAddress = {
	firstName: "Marie",
	lastName: "Dupont",
	address1: "12 Rue de la Paix",
	postalCode: "75002",
	city: "Paris",
	country: "France",
	phone: "+33 6 12 34 56 78",
};

const baseOrderItems: OrderItem[] = [
	{
		productTitle: "Collier Luna en Or Rose",
		skuColor: "Or Rose",
		skuMaterial: "Or 18 carats",
		skuSize: "45cm",
		quantity: 1,
		price: 8900,
	},
	{
		productTitle: "Boucles d'oreilles Étoile",
		skuColor: "Argent",
		skuMaterial: "Argent 925",
		skuSize: null,
		quantity: 2,
		price: 4500,
	},
];

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
		orderDetailsUrl: "https://synclune.fr/compte/commandes/CMD-2024-ABCD1234",
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
// DeliveryConfirmationEmail
// ---------------------------------------------------------------------------

describe("DeliveryConfirmationEmail", () => {
	const baseProps = {
		orderNumber: "CMD-1730000000-ABCD",
		customerName: "Marie",
		deliveryDate: "27 novembre 2025",
		orderDetailsUrl: "https://synclune.fr/compte/commandes/CMD-1730000000-ABCD",
	};

	it("renders without error", async () => {
		const html = await render(<DeliveryConfirmationEmail {...baseProps} />);
		expect(html).toContain("<!DOCTYPE");
		expect(html.length).toBeGreaterThan(100);
	});

	it("contains expected heading", async () => {
		const html = await render(<DeliveryConfirmationEmail {...baseProps} />);
		expect(html).toContain("Commande livrée");
	});

	it("contains dynamic data", async () => {
		const html = await render(<DeliveryConfirmationEmail {...baseProps} />);
		expect(html).toContain("CMD-1730000000-ABCD");
		expect(html).toContain("Marie");
		expect(html).toContain("27 novembre 2025");
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
// RefundStatusEmail — approved
// ---------------------------------------------------------------------------

describe("RefundStatusEmail (approved)", () => {
	const baseProps = {
		status: "approved" as const,
		orderNumber: "CMD-2024-ABCD1234",
		customerName: "Marie",
		refundAmount: 8990,
		originalOrderTotal: 8990,
		reason: "CUSTOMER_REQUEST",
		isPartialRefund: false,
		orderDetailsUrl: "https://synclune.fr/compte/commandes/CMD-2024-ABCD1234",
	};

	it("renders without error", async () => {
		const html = await render(<RefundStatusEmail {...baseProps} />);
		expect(html).toContain("<!DOCTYPE");
		expect(html.length).toBeGreaterThan(100);
	});

	it("contains expected heading", async () => {
		const html = await render(<RefundStatusEmail {...baseProps} />);
		expect(html).toContain("Remboursement accepté");
	});

	it("contains dynamic data", async () => {
		const html = await render(<RefundStatusEmail {...baseProps} />);
		expect(html).toContain("CMD-2024-ABCD1234");
		expect(html).toContain("Marie");
	});

	it("shows original order total when isPartialRefund is true", async () => {
		const html = await render(
			<RefundStatusEmail {...baseProps} refundAmount={4500} isPartialRefund={true} />,
		);
		expect(html).toContain("Montant initial");
	});

	it("does not show original order total when isPartialRefund is false", async () => {
		const html = await render(<RefundStatusEmail {...baseProps} />);
		expect(html).not.toContain("Montant initial");
	});
});

// ---------------------------------------------------------------------------
// RefundStatusEmail — confirmed
// ---------------------------------------------------------------------------

describe("RefundStatusEmail (confirmed)", () => {
	const baseProps = {
		status: "confirmed" as const,
		orderNumber: "CMD-2024-ABCD1234",
		customerName: "Marie",
		refundAmount: 8990,
		originalOrderTotal: 8990,
		reason: "CUSTOMER_REQUEST",
		isPartialRefund: false,
		orderDetailsUrl: "https://synclune.fr/compte/commandes/CMD-2024-ABCD1234",
	};

	it("renders without error", async () => {
		const html = await render(<RefundStatusEmail {...baseProps} />);
		expect(html).toContain("<!DOCTYPE");
		expect(html.length).toBeGreaterThan(100);
	});

	it("contains expected heading", async () => {
		const html = await render(<RefundStatusEmail {...baseProps} />);
		expect(html).toContain("Remboursement effectué");
	});

	it("contains dynamic data", async () => {
		const html = await render(<RefundStatusEmail {...baseProps} />);
		expect(html).toContain("CMD-2024-ABCD1234");
		expect(html).toContain("Marie");
	});
});

// ---------------------------------------------------------------------------
// RefundRejectedEmail
// ---------------------------------------------------------------------------

describe("RefundRejectedEmail", () => {
	const baseProps = {
		orderNumber: "CMD-2024-ABCD1234",
		customerName: "Marie",
		refundAmount: 8990,
		reason: "CUSTOMER_REQUEST",
		orderDetailsUrl: "https://synclune.fr/compte/commandes/CMD-2024-ABCD1234",
	};

	it("renders without error", async () => {
		const html = await render(<RefundRejectedEmail {...baseProps} />);
		expect(html).toContain("<!DOCTYPE");
		expect(html.length).toBeGreaterThan(100);
	});

	it("contains expected heading", async () => {
		const html = await render(<RefundRejectedEmail {...baseProps} />);
		expect(html).toContain("remboursement refusée");
	});

	it("contains dynamic data", async () => {
		const html = await render(<RefundRejectedEmail {...baseProps} />);
		expect(html).toContain("CMD-2024-ABCD1234");
		expect(html).toContain("Marie");
	});

	it("shows reason label when reason is provided", async () => {
		const html = await render(<RefundRejectedEmail {...baseProps} />);
		expect(html).toContain("Motif");
	});

	it("does not show reason section when reason is undefined", async () => {
		const { reason: _, ...propsWithoutReason } = baseProps;
		const html = await render(<RefundRejectedEmail {...propsWithoutReason} />);
		expect(html).not.toContain("Motif");
	});
});

// ---------------------------------------------------------------------------
// ReturnConfirmationEmail
// ---------------------------------------------------------------------------

describe("ReturnConfirmationEmail", () => {
	const baseProps = {
		orderNumber: "CMD-2024-ABCD1234",
		customerName: "Marie",
		orderTotal: 8990,
		reason: "Colis retourné par le client",
		orderDetailsUrl: "https://synclune.fr/compte/commandes/CMD-2024-ABCD1234",
	};

	it("renders without error", async () => {
		const html = await render(<ReturnConfirmationEmail {...baseProps} />);
		expect(html).toContain("<!DOCTYPE");
		expect(html.length).toBeGreaterThan(100);
	});

	it("contains expected heading", async () => {
		const html = await render(<ReturnConfirmationEmail {...baseProps} />);
		expect(html).toContain("Retour enregistré");
	});

	it("contains dynamic data", async () => {
		const html = await render(<ReturnConfirmationEmail {...baseProps} />);
		expect(html).toContain("CMD-2024-ABCD1234");
		expect(html).toContain("Marie");
		expect(html).toContain("Colis retourné par le client");
	});
});

// ---------------------------------------------------------------------------
// TrackingUpdateEmail
// ---------------------------------------------------------------------------

describe("TrackingUpdateEmail", () => {
	const baseProps = {
		orderNumber: "CMD-1730000000-ABCD",
		customerName: "Marie",
		trackingNumber: "8N00234567890",
		trackingUrl: "https://www.laposte.fr/outils/suivre-vos-envois?code=8N00234567890",
		carrierLabel: "Colissimo",
		estimatedDelivery: "3-5 jours ouvrés",
	};

	it("renders without error", async () => {
		const html = await render(<TrackingUpdateEmail {...baseProps} />);
		expect(html).toContain("<!DOCTYPE");
		expect(html.length).toBeGreaterThan(100);
	});

	it("contains expected heading", async () => {
		const html = await render(<TrackingUpdateEmail {...baseProps} />);
		expect(html).toContain("Suivi mis à jour");
	});

	it("contains dynamic data", async () => {
		const html = await render(<TrackingUpdateEmail {...baseProps} />);
		expect(html).toContain("CMD-1730000000-ABCD");
		expect(html).toContain("Marie");
		expect(html).toContain("8N00234567890");
		expect(html).toContain("Colissimo");
	});

	it("shows tracking button when trackingUrl is provided", async () => {
		const html = await render(<TrackingUpdateEmail {...baseProps} />);
		expect(html).toContain("Suivre mon colis");
	});

	it("does not show tracking button when trackingUrl is null", async () => {
		const html = await render(<TrackingUpdateEmail {...baseProps} trackingUrl={null} />);
		expect(html).not.toContain("Suivre mon colis");
	});
});

// ---------------------------------------------------------------------------
// PasswordChangedEmail
// ---------------------------------------------------------------------------

describe("PasswordChangedEmail", () => {
	const baseProps = {
		userName: "Marie",
		changeDate: "15 janvier 2025 à 14:30",
		resetUrl: "https://synclune.fr/mot-de-passe-oublie",
	};

	it("renders without error", async () => {
		const html = await render(<PasswordChangedEmail {...baseProps} />);
		expect(html).toContain("<!DOCTYPE");
		expect(html.length).toBeGreaterThan(100);
	});

	it("contains expected heading", async () => {
		const html = await render(<PasswordChangedEmail {...baseProps} />);
		expect(html).toContain("Mot de passe modifié");
	});

	it("contains dynamic data", async () => {
		const html = await render(<PasswordChangedEmail {...baseProps} />);
		expect(html).toContain("Marie");
		expect(html).toContain("15 janvier 2025 à 14:30");
		expect(html).toContain("https://synclune.fr/mot-de-passe-oublie");
	});

	it("contains the security warning", async () => {
		const html = await render(<PasswordChangedEmail {...baseProps} />);
		expect(html).toContain("Ce n");
		expect(html).toContain("était pas vous");
	});
});

// ---------------------------------------------------------------------------
// AccountDeletionEmail
// ---------------------------------------------------------------------------

describe("AccountDeletionEmail", () => {
	const baseProps = {
		userName: "Marie",
		deletionDate: "17 février 2026",
	};

	it("renders without error", async () => {
		const html = await render(<AccountDeletionEmail {...baseProps} />);
		expect(html).toContain("<!DOCTYPE");
		expect(html.length).toBeGreaterThan(100);
	});

	it("contains expected heading", async () => {
		const html = await render(<AccountDeletionEmail {...baseProps} />);
		expect(html).toContain("Compte supprimé");
	});

	it("contains dynamic data", async () => {
		const html = await render(<AccountDeletionEmail {...baseProps} />);
		expect(html).toContain("Marie");
		expect(html).toContain("17 février 2026");
	});

	it("contains legal retention information", async () => {
		const html = await render(<AccountDeletionEmail {...baseProps} />);
		expect(html).toContain("Conservation légale");
	});
});

// ---------------------------------------------------------------------------
// RevertShippingNotificationEmail
// ---------------------------------------------------------------------------

describe("RevertShippingNotificationEmail", () => {
	const baseProps = {
		orderNumber: "CMD-2024-ABCD1234",
		customerName: "Marie",
		reason: "Erreur d'étiquetage du transporteur",
		orderDetailsUrl: "https://synclune.fr/compte/commandes/CMD-2024-ABCD1234",
	};

	it("renders without error", async () => {
		const html = await render(<RevertShippingNotificationEmail {...baseProps} />);
		expect(html).toContain("<!DOCTYPE");
		expect(html.length).toBeGreaterThan(100);
	});

	it("contains expected heading", async () => {
		const html = await render(<RevertShippingNotificationEmail {...baseProps} />);
		expect(html).toContain("Expédition mise à jour");
	});

	it("contains dynamic data", async () => {
		const html = await render(<RevertShippingNotificationEmail {...baseProps} />);
		expect(html).toContain("CMD-2024-ABCD1234");
		expect(html).toContain("Marie");
		expect(html).toContain("Erreur d");
		expect(html).toContain("tiquetage du transporteur");
	});
});

// ---------------------------------------------------------------------------
// NewsletterConfirmationEmail
// ---------------------------------------------------------------------------

describe("NewsletterConfirmationEmail", () => {
	const baseProps = {
		confirmationUrl: "https://synclune.fr/newsletter/confirmer?token=example123",
	};

	it("renders without error", async () => {
		const html = await render(<NewsletterConfirmationEmail {...baseProps} />);
		expect(html).toContain("<!DOCTYPE");
		expect(html.length).toBeGreaterThan(100);
	});

	it("contains expected heading", async () => {
		const html = await render(<NewsletterConfirmationEmail {...baseProps} />);
		expect(html).toContain("Confirmation");
	});

	it("contains dynamic data", async () => {
		const html = await render(<NewsletterConfirmationEmail {...baseProps} />);
		expect(html).toContain("https://synclune.fr/newsletter/confirmer?token=example123");
		expect(html).toContain("7 jours");
	});
});

// ---------------------------------------------------------------------------
// NewsletterWelcomeEmail
// ---------------------------------------------------------------------------

describe("NewsletterWelcomeEmail", () => {
	const baseProps = {
		email: "example@email.com",
		unsubscribeUrl: "https://synclune.fr/newsletter/desinscription?token=abc123",
		shopUrl: "https://synclune.fr/produits",
	};

	it("renders without error", async () => {
		const html = await render(<NewsletterWelcomeEmail {...baseProps} />);
		expect(html).toContain("<!DOCTYPE");
		expect(html.length).toBeGreaterThan(100);
	});

	it("contains expected heading", async () => {
		const html = await render(<NewsletterWelcomeEmail {...baseProps} />);
		expect(html).toContain("Bienvenue");
	});

	it("contains dynamic data", async () => {
		const html = await render(<NewsletterWelcomeEmail {...baseProps} />);
		expect(html).toContain("example@email.com");
		expect(html).toContain("https://synclune.fr/newsletter/desinscription?token=abc123");
	});
});

// ---------------------------------------------------------------------------
// AdminNewOrderEmail
// ---------------------------------------------------------------------------

describe("AdminNewOrderEmail", () => {
	const baseProps = {
		orderNumber: "CMD-1730000000-ABCD",
		customerName: "Marie Dupont",
		customerEmail: "marie.dupont@example.com",
		items: baseOrderItems,
		subtotal: 17900,
		discount: 0,
		shipping: 490,
		total: 18390,
		shippingAddress: baseAdminShippingAddress,
		dashboardUrl: "https://synclune.fr/dashboard/orders/clxxx12345",
	};

	it("renders without error", async () => {
		const html = await render(<AdminNewOrderEmail {...baseProps} />);
		expect(html).toContain("<!DOCTYPE");
		expect(html.length).toBeGreaterThan(100);
	});

	it("contains expected heading", async () => {
		const html = await render(<AdminNewOrderEmail {...baseProps} />);
		expect(html).toContain("Nouvelle Commande");
	});

	it("contains dynamic data", async () => {
		const html = await render(<AdminNewOrderEmail {...baseProps} />);
		expect(html).toContain("CMD-1730000000-ABCD");
		expect(html).toContain("Marie Dupont");
		expect(html).toContain("marie.dupont@example.com");
		expect(html).toContain("Collier Luna en Or Rose");
	});

	it("shows discount line when discount is greater than zero", async () => {
		const html = await render(<AdminNewOrderEmail {...baseProps} discount={1000} />);
		expect(html).toContain("Réduction");
	});

	it("does not show discount line when discount is zero", async () => {
		const html = await render(<AdminNewOrderEmail {...baseProps} />);
		expect(html).not.toContain("Réduction");
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

	it("uses header specific to type=checkout", async () => {
		const html = await render(<AdminAlertEmail {...baseProps} type="checkout" />);
		expect(html).toContain("Échec checkout Stripe");
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

// ---------------------------------------------------------------------------
// WelcomeEmail
// ---------------------------------------------------------------------------

describe("WelcomeEmail", () => {
	const baseProps = {
		userName: "Marie",
		shopUrl: "https://synclune.fr/produits",
		newsletterUrl: "https://synclune.fr/#newsletter",
	};

	it("renders without error", async () => {
		const html = await render(<WelcomeEmail {...baseProps} />);
		expect(html).toContain("<!DOCTYPE");
		expect(html.length).toBeGreaterThan(100);
	});

	it("contains expected heading", async () => {
		const html = await render(<WelcomeEmail {...baseProps} />);
		expect(html).toContain("Bienvenue");
		expect(html).toContain("Marie");
	});

	it("contains dynamic data", async () => {
		const html = await render(<WelcomeEmail {...baseProps} />);
		expect(html).toContain("Marie");
		expect(html).toContain("https://synclune.fr/produits");
		expect(html).toContain("France");
	});
});
