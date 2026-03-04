import { describe, it, expect } from "vitest";
import { render } from "@react-email/render";
import { OrderConfirmationEmail } from "../order-confirmation-email";
import { ShippingConfirmationEmail } from "../shipping-confirmation-email";
import { VerificationEmail } from "../verification-email";
import { PasswordResetEmail } from "../password-reset-email";
import type { OrderItem, ShippingAddress } from "@/modules/emails/types/email.types";

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const baseShippingAddress: ShippingAddress = {
	firstName: "Marie",
	lastName: "Dupont",
	address1: "12 Rue de la Paix",
	postalCode: "75002",
	city: "Paris",
	country: "France",
};

const baseOrderItems: OrderItem[] = [
	{
		productTitle: "Collier Luna",
		skuColor: "Or Rose",
		skuMaterial: "Or 18 carats",
		skuSize: "45cm",
		quantity: 1,
		price: 8900,
	},
	{
		productTitle: "Boucles Étoile",
		skuColor: "Argent",
		skuMaterial: "Argent 925",
		skuSize: null,
		quantity: 2,
		price: 4500,
	},
];

// ---------------------------------------------------------------------------
// OrderConfirmationEmail
// ---------------------------------------------------------------------------

describe("OrderConfirmationEmail", () => {
	const baseProps = {
		orderNumber: "CMD-1730000000-ABCD",
		customerName: "Marie",
		items: baseOrderItems,
		subtotal: 17900,
		discount: 0,
		shipping: 490,
		total: 18390,
		shippingAddress: baseShippingAddress,
		trackingUrl: "https://synclune.fr/compte/commandes/example-order-id",
	};

	it("renders without crashing", async () => {
		const html = await render(<OrderConfirmationEmail {...baseProps} />);
		expect(html).toContain("<!DOCTYPE");
		expect(html.length).toBeGreaterThan(100);
	});

	it("contains the order number in the output", async () => {
		const html = await render(<OrderConfirmationEmail {...baseProps} />);
		expect(html).toContain("CMD-1730000000-ABCD");
	});

	it("contains the customer name greeting", async () => {
		const html = await render(<OrderConfirmationEmail {...baseProps} />);
		// React 19 renders adjacent JSX expressions with HTML comment separators,
		// so we match the parts independently.
		expect(html).toContain("Bonjour");
		expect(html).toContain("Marie");
		expect(html).toContain("votre commande est enregistrée");
	});

	it("contains all item product titles", async () => {
		const html = await render(<OrderConfirmationEmail {...baseProps} />);
		expect(html).toContain("Collier Luna");
		expect(html).toContain("Boucles Étoile");
	});

	it("does not show the discount line when discount is zero", async () => {
		const html = await render(<OrderConfirmationEmail {...baseProps} discount={0} />);
		expect(html).not.toContain("Réduction");
	});

	it("shows the discount line only when discount is greater than zero", async () => {
		const html = await render(<OrderConfirmationEmail {...baseProps} discount={1000} />);
		expect(html).toContain("Réduction");
	});

	it("contains the tracking URL", async () => {
		const html = await render(<OrderConfirmationEmail {...baseProps} />);
		expect(html).toContain("https://synclune.fr/compte/commandes/example-order-id");
	});

	it("contains the shipping address city and postal code", async () => {
		const html = await render(<OrderConfirmationEmail {...baseProps} />);
		expect(html).toContain("Paris");
		expect(html).toContain("75002");
	});

	it("contains the Commande confirmée heading", async () => {
		const html = await render(<OrderConfirmationEmail {...baseProps} />);
		expect(html).toContain("Commande confirm");
	});

	it("contains the Suivre ma commande CTA text", async () => {
		const html = await render(<OrderConfirmationEmail {...baseProps} />);
		expect(html).toContain("Suivre ma commande");
	});

	it("renders items with variant details", async () => {
		const html = await render(<OrderConfirmationEmail {...baseProps} />);
		expect(html).toContain("Or Rose");
		expect(html).toContain("45cm");
	});

	it("renders a single item correctly when items array has one entry", async () => {
		const singleItemProps = {
			...baseProps,
			items: [
				{
					productTitle: "Bague Soleil",
					skuColor: null,
					skuMaterial: null,
					skuSize: null,
					quantity: 1,
					price: 3500,
				},
			],
		};
		const html = await render(<OrderConfirmationEmail {...singleItemProps} />);
		expect(html).toContain("Bague Soleil");
		expect(html).not.toContain("Collier Luna");
	});
});

// ---------------------------------------------------------------------------
// ShippingConfirmationEmail
// ---------------------------------------------------------------------------

describe("ShippingConfirmationEmail", () => {
	const baseProps = {
		orderNumber: "CMD-1730000000-ABCD",
		customerName: "Marie",
		trackingNumber: "8N00234567890",
		trackingUrl: "https://www.laposte.fr/outils/suivre-vos-envois?code=8N00234567890",
		carrierLabel: "Colissimo",
		shippingAddress: baseShippingAddress,
	};

	it("renders without crashing", async () => {
		const html = await render(<ShippingConfirmationEmail {...baseProps} />);
		expect(html).toContain("<!DOCTYPE");
		expect(html.length).toBeGreaterThan(100);
	});

	it("contains the Commande expédiée heading", async () => {
		const html = await render(<ShippingConfirmationEmail {...baseProps} />);
		expect(html).toContain("Command");
		expect(html).toContain("expédiée");
	});

	it("contains the order number", async () => {
		const html = await render(<ShippingConfirmationEmail {...baseProps} />);
		expect(html).toContain("CMD-1730000000-ABCD");
	});

	it("contains the tracking number", async () => {
		const html = await render(<ShippingConfirmationEmail {...baseProps} />);
		expect(html).toContain("8N00234567890");
	});

	it("contains the carrier label", async () => {
		const html = await render(<ShippingConfirmationEmail {...baseProps} />);
		expect(html).toContain("Colissimo");
	});

	it("shows the Suivre mon colis button when trackingUrl is provided", async () => {
		const html = await render(<ShippingConfirmationEmail {...baseProps} />);
		expect(html).toContain("Suivre mon colis");
		expect(html).toContain("https://www.laposte.fr/outils/suivre-vos-envois?code=8N00234567890");
	});

	it("does not show the tracking button when trackingUrl is null", async () => {
		const html = await render(<ShippingConfirmationEmail {...baseProps} trackingUrl={null} />);
		expect(html).not.toContain("Suivre mon colis");
	});

	it("contains the shipping address", async () => {
		const html = await render(<ShippingConfirmationEmail {...baseProps} />);
		expect(html).toContain("Paris");
		expect(html).toContain("75002");
		expect(html).toContain("Marie");
		expect(html).toContain("Dupont");
	});

	it("contains the customer name in the greeting", async () => {
		const html = await render(<ShippingConfirmationEmail {...baseProps} />);
		// React 19 renders adjacent JSX expressions with HTML comment separators,
		// so we match the parts independently.
		expect(html).toContain("Bonjour");
		expect(html).toContain("Marie");
		expect(html).toContain("votre commande");
		expect(html).toContain("est en route");
	});
});

// ---------------------------------------------------------------------------
// VerificationEmail
// ---------------------------------------------------------------------------

describe("VerificationEmail", () => {
	const baseProps = {
		verificationUrl: "https://synclune.fr/verifier-email?token=abc123",
	};

	it("renders without crashing", async () => {
		const html = await render(<VerificationEmail {...baseProps} />);
		expect(html).toContain("<!DOCTYPE");
		expect(html.length).toBeGreaterThan(100);
	});

	it("contains the Vérification email heading", async () => {
		const html = await render(<VerificationEmail {...baseProps} />);
		expect(html).toContain("Vérification email");
	});

	it("contains the verification URL in a link", async () => {
		const html = await render(<VerificationEmail {...baseProps} />);
		expect(html).toContain("https://synclune.fr/verifier-email?token=abc123");
	});

	it("contains the Vérifier mon email CTA text", async () => {
		const html = await render(<VerificationEmail {...baseProps} />);
		expect(html).toContain("Vérifier mon email");
	});

	it("contains the 24 heures expiry information", async () => {
		const html = await render(<VerificationEmail {...baseProps} />);
		expect(html).toContain("24 heures");
	});
});

// ---------------------------------------------------------------------------
// PasswordResetEmail
// ---------------------------------------------------------------------------

describe("PasswordResetEmail", () => {
	const baseProps = {
		resetUrl: "https://synclune.fr/reinitialiser-mot-de-passe?token=abc123",
	};

	it("renders without crashing", async () => {
		const html = await render(<PasswordResetEmail {...baseProps} />);
		expect(html).toContain("<!DOCTYPE");
		expect(html.length).toBeGreaterThan(100);
	});

	it("contains the Réinitialisation heading", async () => {
		const html = await render(<PasswordResetEmail {...baseProps} />);
		expect(html).toContain("Réinitialisation");
	});

	it("contains the reset URL in a link", async () => {
		const html = await render(<PasswordResetEmail {...baseProps} />);
		expect(html).toContain("https://synclune.fr/reinitialiser-mot-de-passe?token=abc123");
	});

	it("contains the Réinitialiser CTA text", async () => {
		const html = await render(<PasswordResetEmail {...baseProps} />);
		expect(html).toContain("Réinitialiser");
	});

	it("contains the 1 heure expiry information", async () => {
		const html = await render(<PasswordResetEmail {...baseProps} />);
		expect(html).toContain("1 heure");
	});

	it("contains the ignorez cet email security note", async () => {
		const html = await render(<PasswordResetEmail {...baseProps} />);
		expect(html).toContain("ignorez cet email");
	});
});
