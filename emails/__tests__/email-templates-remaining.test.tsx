import { describe, it, expect } from "vitest";
import { render } from "@react-email/render";
import { CancelOrderConfirmationEmail } from "../cancel-order-confirmation-email";
import { DeliveryConfirmationEmail } from "../delivery-confirmation-email";
import { PaymentFailedEmail } from "../payment-failed-email";
import { RefundApprovedEmail } from "../refund-approved-email";
import { RefundConfirmationEmail } from "../refund-confirmation-email";
import { RefundRejectedEmail } from "../refund-rejected-email";
import { ReturnConfirmationEmail } from "../return-confirmation-email";
import { TrackingUpdateEmail } from "../tracking-update-email";
import { PasswordChangedEmail } from "../password-changed-email";
import { AccountDeletionEmail } from "../account-deletion-email";
import { ReviewRequestEmail } from "../review-request-email";
import { ReviewResponseEmail } from "../review-response-email";
import { RevertShippingNotificationEmail } from "../revert-shipping-notification-email";
import { CustomizationConfirmationEmail } from "../customization-confirmation-email";
import { CustomizationRequestEmail } from "../customization-request-email";
import { CustomizationStatusEmail } from "../customization-status-email";
import { NewsletterConfirmationEmail } from "../newsletter-confirmation-email";
import { NewsletterWelcomeEmail } from "../newsletter-welcome-email";
import { AdminNewOrderEmail } from "../admin-new-order-email";
import { AdminRefundFailedEmail } from "../admin-refund-failed-email";
import { AdminWebhookFailedEmail } from "../admin-webhook-failed-email";
import { AdminInvoiceFailedEmail } from "../admin-invoice-failed-email";
import { AdminDisputeAlertEmail } from "../admin-dispute-alert-email";
import { AdminCheckoutFailedEmail } from "../admin-checkout-failed-email";
import { AdminCronFailedEmail } from "../admin-cron-failed-email";
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
// RefundApprovedEmail
// ---------------------------------------------------------------------------

describe("RefundApprovedEmail", () => {
	const baseProps = {
		orderNumber: "CMD-2024-ABCD1234",
		customerName: "Marie",
		refundAmount: 8990,
		originalOrderTotal: 8990,
		reason: "CUSTOMER_REQUEST",
		isPartialRefund: false,
		orderDetailsUrl: "https://synclune.fr/compte/commandes/CMD-2024-ABCD1234",
	};

	it("renders without error", async () => {
		const html = await render(<RefundApprovedEmail {...baseProps} />);
		expect(html).toContain("<!DOCTYPE");
		expect(html.length).toBeGreaterThan(100);
	});

	it("contains expected heading", async () => {
		const html = await render(<RefundApprovedEmail {...baseProps} />);
		expect(html).toContain("Remboursement accepté");
	});

	it("contains dynamic data", async () => {
		const html = await render(<RefundApprovedEmail {...baseProps} />);
		expect(html).toContain("CMD-2024-ABCD1234");
		expect(html).toContain("Marie");
	});

	it("shows original order total when isPartialRefund is true", async () => {
		const html = await render(
			<RefundApprovedEmail {...baseProps} refundAmount={4500} isPartialRefund={true} />,
		);
		expect(html).toContain("Montant initial");
	});

	it("does not show original order total when isPartialRefund is false", async () => {
		const html = await render(<RefundApprovedEmail {...baseProps} />);
		expect(html).not.toContain("Montant initial");
	});
});

// ---------------------------------------------------------------------------
// RefundConfirmationEmail
// ---------------------------------------------------------------------------

describe("RefundConfirmationEmail", () => {
	const baseProps = {
		orderNumber: "CMD-2024-ABCD1234",
		customerName: "Marie",
		refundAmount: 8990,
		originalOrderTotal: 8990,
		reason: "CUSTOMER_REQUEST",
		isPartialRefund: false,
		orderDetailsUrl: "https://synclune.fr/compte/commandes/CMD-2024-ABCD1234",
	};

	it("renders without error", async () => {
		const html = await render(<RefundConfirmationEmail {...baseProps} />);
		expect(html).toContain("<!DOCTYPE");
		expect(html.length).toBeGreaterThan(100);
	});

	it("contains expected heading", async () => {
		const html = await render(<RefundConfirmationEmail {...baseProps} />);
		expect(html).toContain("Remboursement effectué");
	});

	it("contains dynamic data", async () => {
		const html = await render(<RefundConfirmationEmail {...baseProps} />);
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
// ReviewRequestEmail
// ---------------------------------------------------------------------------

describe("ReviewRequestEmail", () => {
	const baseProps = {
		customerName: "Marie",
		orderNumber: "CMD-1730000000-ABCD",
		products: [
			{
				title: "Collier Luna en Or Rose",
				slug: "collier-luna-or-rose",
				imageUrl: "https://synclune.fr/images/products/collier-luna.jpg",
				skuVariants: "Or Rose · 45cm",
			},
			{
				title: "Boucles d'oreilles Étoile",
				slug: "boucles-oreilles-etoile",
				imageUrl: "https://synclune.fr/images/products/boucles-etoile.jpg",
				skuVariants: "Argent 925",
			},
		],
		reviewUrl: "https://synclune.fr/mes-avis",
	};

	it("renders without error", async () => {
		const html = await render(<ReviewRequestEmail {...baseProps} />);
		expect(html).toContain("<!DOCTYPE");
		expect(html.length).toBeGreaterThan(100);
	});

	it("contains expected heading", async () => {
		const html = await render(<ReviewRequestEmail {...baseProps} />);
		expect(html).toContain("avis comptent");
	});

	it("contains dynamic data", async () => {
		const html = await render(<ReviewRequestEmail {...baseProps} />);
		expect(html).toContain("Marie");
		expect(html).toContain("Collier Luna en Or Rose");
		expect(html).toContain("Donner mon avis");
	});

	it("uses singular heading for a single product", async () => {
		const html = await render(
			<ReviewRequestEmail {...baseProps} products={[baseProps.products[0]!]} />,
		);
		expect(html).toContain("Votre avis compte !");
	});
});

// ---------------------------------------------------------------------------
// ReviewResponseEmail
// ---------------------------------------------------------------------------

describe("ReviewResponseEmail", () => {
	const baseProps = {
		customerName: "Marie",
		productTitle: "Collier Luna en Or Rose",
		reviewContent: "J'adore ce collier ! La qualité est exceptionnelle.",
		responseContent: "Merci beaucoup pour votre retour Marie !",
		responseAuthorName: "Équipe Synclune",
		productUrl: "https://synclune.fr/creations/collier-luna-or-rose",
	};

	it("renders without error", async () => {
		const html = await render(<ReviewResponseEmail {...baseProps} />);
		expect(html).toContain("<!DOCTYPE");
		expect(html.length).toBeGreaterThan(100);
	});

	it("contains expected heading", async () => {
		const html = await render(<ReviewResponseEmail {...baseProps} />);
		expect(html).toContain("répondu à votre avis");
	});

	it("contains dynamic data", async () => {
		const html = await render(<ReviewResponseEmail {...baseProps} />);
		expect(html).toContain("Marie");
		expect(html).toContain("Collier Luna en Or Rose");
		expect(html).toContain("Équipe Synclune");
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
// CustomizationConfirmationEmail
// ---------------------------------------------------------------------------

describe("CustomizationConfirmationEmail", () => {
	const baseProps = {
		firstName: "Marie",
		productTypeLabel: "Collier",
		details: "Je souhaiterais un collier personnalisé avec les initiales 'ML'.",
		inspirationProducts: [{ title: "Collier Lune Céleste" }],
		shopUrl: "https://synclune.fr/creations",
	};

	it("renders without error", async () => {
		const html = await render(<CustomizationConfirmationEmail {...baseProps} />);
		expect(html).toContain("<!DOCTYPE");
		expect(html.length).toBeGreaterThan(100);
	});

	it("contains expected heading", async () => {
		const html = await render(<CustomizationConfirmationEmail {...baseProps} />);
		expect(html).toContain("Demande reçue");
	});

	it("contains dynamic data", async () => {
		const html = await render(<CustomizationConfirmationEmail {...baseProps} />);
		expect(html).toContain("Marie");
		expect(html).toContain("Collier");
		expect(html).toContain("Collier Lune Céleste");
	});

	it("does not show inspirations section when no inspiration products are provided", async () => {
		const html = await render(
			<CustomizationConfirmationEmail {...baseProps} inspirationProducts={undefined} />,
		);
		expect(html).not.toContain("Inspirations");
	});
});

// ---------------------------------------------------------------------------
// CustomizationRequestEmail
// ---------------------------------------------------------------------------

describe("CustomizationRequestEmail", () => {
	const baseProps = {
		firstName: "Marie",
		email: "marie.dupont@example.com",
		phone: "+33612345678",
		productTypeLabel: "Collier",
		details: "Bonjour,\n\nJe souhaiterais un collier personnalisé.",
		inspirationProducts: [{ title: "Collier Lune Céleste" }, { title: "Pendentif Étoile Filante" }],
	};

	it("renders without error", async () => {
		const html = await render(<CustomizationRequestEmail {...baseProps} />);
		expect(html).toContain("<!DOCTYPE");
		expect(html.length).toBeGreaterThan(100);
	});

	it("contains expected heading", async () => {
		const html = await render(<CustomizationRequestEmail {...baseProps} />);
		expect(html).toContain("Nouvelle demande");
	});

	it("contains dynamic data", async () => {
		const html = await render(<CustomizationRequestEmail {...baseProps} />);
		expect(html).toContain("Marie");
		expect(html).toContain("marie.dupont@example.com");
		expect(html).toContain("Collier");
	});

	it("shows phone number when provided", async () => {
		const html = await render(<CustomizationRequestEmail {...baseProps} />);
		expect(html).toContain("+33612345678");
	});

	it("does not show phone row when phone is not provided", async () => {
		const { phone: _, ...propsWithoutPhone } = baseProps;
		const html = await render(<CustomizationRequestEmail {...propsWithoutPhone} />);
		expect(html).not.toContain("+33612345678");
	});
});

// ---------------------------------------------------------------------------
// CustomizationStatusEmail
// ---------------------------------------------------------------------------

describe("CustomizationStatusEmail", () => {
	const baseProps = {
		firstName: "Marie",
		productTypeLabel: "Collier",
		status: "IN_PROGRESS" as const,
		adminNotes: "Nous avons sélectionné une magnifique pierre de lune.",
		details: "Collier en or rose avec pierre de lune.",
	};

	it("renders without error", async () => {
		const html = await render(<CustomizationStatusEmail {...baseProps} />);
		expect(html).toContain("<!DOCTYPE");
		expect(html.length).toBeGreaterThan(100);
	});

	it("contains expected heading for IN_PROGRESS status", async () => {
		const html = await render(<CustomizationStatusEmail {...baseProps} />);
		expect(html).toContain("Personnalisation en cours");
	});

	it("contains dynamic data", async () => {
		const html = await render(<CustomizationStatusEmail {...baseProps} />);
		expect(html).toContain("Marie");
		expect(html).toContain("Collier");
		expect(html).toContain("Nous avons sélectionné");
	});

	it("contains COMPLETED heading when status is COMPLETED", async () => {
		const html = await render(<CustomizationStatusEmail {...baseProps} status="COMPLETED" />);
		expect(html).toContain("Personnalisation terminée");
	});

	it("contains CANCELLED heading when status is CANCELLED", async () => {
		const html = await render(<CustomizationStatusEmail {...baseProps} status="CANCELLED" />);
		expect(html).toContain("annulée");
	});
});

// ---------------------------------------------------------------------------
// NewsletterConfirmationEmail
// ---------------------------------------------------------------------------

describe("NewsletterConfirmationEmail", () => {
	const baseProps = {
		confirmationUrl: "https://synclune.fr/newsletter/confirm?token=example123",
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
		expect(html).toContain("https://synclune.fr/newsletter/confirm?token=example123");
		expect(html).toContain("7 jours");
	});
});

// ---------------------------------------------------------------------------
// NewsletterWelcomeEmail
// ---------------------------------------------------------------------------

describe("NewsletterWelcomeEmail", () => {
	const baseProps = {
		email: "example@email.com",
		unsubscribeUrl: "https://synclune.fr/newsletter/unsubscribe?token=abc123",
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
		expect(html).toContain("https://synclune.fr/newsletter/unsubscribe?token=abc123");
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
// AdminRefundFailedEmail
// ---------------------------------------------------------------------------

describe("AdminRefundFailedEmail", () => {
	const baseProps = {
		orderNumber: "CMD-1730000000-ABCD",
		customerEmail: "marie.dupont@example.com",
		amount: 18390,
		reason: "payment_failed" as const,
		errorMessage: "Error: This PaymentIntent cannot be refunded.",
		stripePaymentIntentId: "pi_1234567890abcdefghij",
		dashboardUrl: "https://synclune.fr/dashboard/orders/clxxx12345",
		stripeDashboardUrl: "https://dashboard.stripe.com/payments/pi_1234567890abcdefghij",
	};

	it("renders without error", async () => {
		const html = await render(<AdminRefundFailedEmail {...baseProps} />);
		expect(html).toContain("<!DOCTYPE");
		expect(html.length).toBeGreaterThan(100);
	});

	it("contains expected heading", async () => {
		const html = await render(<AdminRefundFailedEmail {...baseProps} />);
		expect(html).toContain("Échec du remboursement");
	});

	it("contains dynamic data", async () => {
		const html = await render(<AdminRefundFailedEmail {...baseProps} />);
		expect(html).toContain("CMD-1730000000-ABCD");
		expect(html).toContain("marie.dupont@example.com");
		expect(html).toContain("pi_1234567890abcdefghij");
		expect(html).toContain("Error: This PaymentIntent cannot be refunded.");
	});
});

// ---------------------------------------------------------------------------
// AdminWebhookFailedEmail
// ---------------------------------------------------------------------------

describe("AdminWebhookFailedEmail", () => {
	const baseProps = {
		eventId: "evt_1234567890abcdefghij",
		eventType: "checkout.session.completed",
		attempts: 3,
		error: "Error: Order not found: clxxx12345",
		stripeDashboardUrl: "https://dashboard.stripe.com/webhooks",
		adminDashboardUrl: "https://synclune.fr/admin",
	};

	it("renders without error", async () => {
		const html = await render(<AdminWebhookFailedEmail {...baseProps} />);
		expect(html).toContain("<!DOCTYPE");
		expect(html.length).toBeGreaterThan(100);
	});

	it("contains expected heading", async () => {
		const html = await render(<AdminWebhookFailedEmail {...baseProps} />);
		expect(html).toContain("Webhook Stripe en échec");
	});

	it("contains dynamic data", async () => {
		const html = await render(<AdminWebhookFailedEmail {...baseProps} />);
		expect(html).toContain("evt_1234567890abcdefghij");
		expect(html).toContain("checkout.session.completed");
		expect(html).toContain("Error: Order not found: clxxx12345");
	});
});

// ---------------------------------------------------------------------------
// AdminInvoiceFailedEmail
// ---------------------------------------------------------------------------

describe("AdminInvoiceFailedEmail", () => {
	const baseProps = {
		orderNumber: "CMD-1730000000-ABCD",
		customerEmail: "marie.dupont@example.com",
		customerCompanyName: "Dupont SARL",
		customerSiret: "12345678901234",
		amount: 18390,
		errorMessage: "Error: Failed to generate PDF invoice",
		stripePaymentIntentId: "pi_1234567890abcdefghij",
		dashboardUrl: "https://synclune.fr/admin/ventes/commandes/clxxx12345",
	};

	it("renders without error", async () => {
		const html = await render(<AdminInvoiceFailedEmail {...baseProps} />);
		expect(html).toContain("<!DOCTYPE");
		expect(html.length).toBeGreaterThan(100);
	});

	it("contains expected heading", async () => {
		const html = await render(<AdminInvoiceFailedEmail {...baseProps} />);
		expect(html).toContain("génération facture");
	});

	it("contains dynamic data", async () => {
		const html = await render(<AdminInvoiceFailedEmail {...baseProps} />);
		expect(html).toContain("CMD-1730000000-ABCD");
		expect(html).toContain("marie.dupont@example.com");
		expect(html).toContain("Dupont SARL");
		expect(html).toContain("12345678901234");
	});

	it("shows company and SIRET when provided", async () => {
		const html = await render(<AdminInvoiceFailedEmail {...baseProps} />);
		expect(html).toContain("Entreprise");
		expect(html).toContain("SIRET");
	});

	it("does not show company or SIRET when not provided", async () => {
		const { customerCompanyName: _, customerSiret: __, ...propsWithoutCompany } = baseProps;
		const html = await render(<AdminInvoiceFailedEmail {...propsWithoutCompany} />);
		expect(html).not.toContain("Entreprise");
		expect(html).not.toContain("SIRET");
	});
});

// ---------------------------------------------------------------------------
// AdminDisputeAlertEmail
// ---------------------------------------------------------------------------

describe("AdminDisputeAlertEmail", () => {
	const baseProps = {
		orderNumber: "CMD-1730000000-ABCD",
		customerEmail: "marie.dupont@example.com",
		amount: 18390,
		reason: "Produit non reçu",
		disputeId: "dp_1234567890abcdefghij",
		deadline: "15/03/2026",
		dashboardUrl: "https://synclune.fr/admin/commandes/clxxx12345",
		stripeDashboardUrl: "https://dashboard.stripe.com/disputes/dp_1234567890abcdefghij",
	};

	it("renders without error", async () => {
		const html = await render(<AdminDisputeAlertEmail {...baseProps} />);
		expect(html).toContain("<!DOCTYPE");
		expect(html.length).toBeGreaterThan(100);
	});

	it("contains expected heading", async () => {
		const html = await render(<AdminDisputeAlertEmail {...baseProps} />);
		expect(html).toContain("Litige Stripe");
	});

	it("contains dynamic data", async () => {
		const html = await render(<AdminDisputeAlertEmail {...baseProps} />);
		expect(html).toContain("CMD-1730000000-ABCD");
		expect(html).toContain("marie.dupont@example.com");
		expect(html).toContain("dp_1234567890abcdefghij");
		expect(html).toContain("Produit non reçu");
	});

	it("shows deadline when provided", async () => {
		const html = await render(<AdminDisputeAlertEmail {...baseProps} />);
		expect(html).toContain("15/03/2026");
	});

	it("does not show deadline row when deadline is null", async () => {
		const html = await render(<AdminDisputeAlertEmail {...baseProps} deadline={null} />);
		expect(html).not.toContain("15/03/2026");
	});
});

// ---------------------------------------------------------------------------
// AdminCheckoutFailedEmail
// ---------------------------------------------------------------------------

describe("AdminCheckoutFailedEmail", () => {
	const baseProps = {
		orderNumber: "SYN-20260220-A1B2",
		customerEmail: "client@example.com",
		total: 8900,
		errorMessage: "StripeConnectionError: Could not connect to Stripe API after 2 retries",
		dashboardUrl: "https://synclune.fr/admin",
	};

	it("renders without error", async () => {
		const html = await render(<AdminCheckoutFailedEmail {...baseProps} />);
		expect(html).toContain("<!DOCTYPE");
		expect(html.length).toBeGreaterThan(100);
	});

	it("contains expected heading", async () => {
		const html = await render(<AdminCheckoutFailedEmail {...baseProps} />);
		expect(html).toContain("checkout Stripe");
	});

	it("contains dynamic data", async () => {
		const html = await render(<AdminCheckoutFailedEmail {...baseProps} />);
		expect(html).toContain("SYN-20260220-A1B2");
		expect(html).toContain("client@example.com");
		expect(html).toContain("StripeConnectionError");
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
		expect(html).toContain("Nantes");
	});
});

// ---------------------------------------------------------------------------
// AdminCronFailedEmail
// ---------------------------------------------------------------------------

describe("AdminCronFailedEmail", () => {
	const baseProps = {
		job: "cleanup-carts",
		errors: 3,
		details: {
			processed: 12,
			failed: 3,
			lastError: "Connection timeout after 30s",
		},
		dashboardUrl: "https://synclune.fr/admin",
	};

	it("renders without error", async () => {
		const html = await render(<AdminCronFailedEmail {...baseProps} />);
		expect(html).toContain("<!DOCTYPE");
		expect(html.length).toBeGreaterThan(100);
	});

	it("contains expected heading", async () => {
		const html = await render(<AdminCronFailedEmail {...baseProps} />);
		expect(html).toContain("cron job");
	});

	it("contains dynamic data", async () => {
		const html = await render(<AdminCronFailedEmail {...baseProps} />);
		expect(html).toContain("cleanup-carts");
		expect(html).toContain("Connection timeout after 30s");
	});
});
