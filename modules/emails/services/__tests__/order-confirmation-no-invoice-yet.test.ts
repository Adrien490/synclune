/**
 * EINV-TEST-022 — rendu OrderConfirmationEmail quand `invoiceNumber` n'est
 * pas encore disponible (cas Bancontact/SEPA pending : l'email init est
 * envoyé avant que `payment_intent.succeeded` n'ait persisté le numéro).
 *
 * L'invariant : ne PAS afficher "Télécharger ma facture (PDF)" ni l'URL si
 * `invoiceUrl` est undefined/null. Garantit qu'on n'envoie jamais de lien
 * 404 ou de promesse comptable qu'on ne peut pas tenir Art. 289-I CGI.
 */

import { describe, it, expect } from "vitest";
import { render } from "@react-email/render";
import { createElement } from "react";
import { OrderConfirmationEmail } from "@/emails/order-confirmation-email";
import type { OrderItem, ShippingAddress } from "@/modules/emails/types/email.types";

const SHIPPING_ADDRESS: ShippingAddress = {
	firstName: "Marie",
	lastName: "Dupont",
	address1: "12 Rue de la Paix",
	postalCode: "75002",
	city: "Paris",
	country: "FR",
};

const ORDER_ITEMS: OrderItem[] = [
	{
		productTitle: "Collier Luna",
		skuColor: "Or Rose",
		skuMaterial: "Or 18 carats",
		skuSize: "45cm",
		quantity: 1,
		price: 8900,
	},
];

const BASE_PROPS = {
	orderNumber: "CMD-9999999999-NOINV",
	customerName: "Marie",
	items: ORDER_ITEMS,
	subtotal: 8900,
	discount: 0,
	shipping: 490,
	total: 9390,
	shippingAddress: SHIPPING_ADDRESS,
	trackingUrl: "https://synclune.fr/compte/commandes/order-async-pending",
};

describe("OrderConfirmationEmail — invoiceUrl absent (EINV-TEST-022)", () => {
	it("ne contient PAS le lien 'Télécharger ma facture (PDF)' quand invoiceUrl est undefined", async () => {
		const html = await render(createElement(OrderConfirmationEmail, BASE_PROPS));

		expect(html).not.toContain("Télécharger ma facture");
		expect(html).not.toContain("/invoice");
	});

	it("ne contient PAS le lien quand invoiceUrl est null (cas async payment pending)", async () => {
		const html = await render(
			createElement(OrderConfirmationEmail, { ...BASE_PROPS, invoiceUrl: null }),
		);

		expect(html).not.toContain("Télécharger ma facture");
	});

	it("affiche le lien quand invoiceUrl est défini (contrôle positif)", async () => {
		const html = await render(
			createElement(OrderConfirmationEmail, {
				...BASE_PROPS,
				invoiceUrl: "https://synclune.fr/api/orders/CMD-1730000000-OK/invoice",
			}),
		);

		expect(html).toContain("Télécharger ma facture (PDF)");
		expect(html).toContain("/api/orders/CMD-1730000000-OK/invoice");
	});

	it("rendu sans crash + structure HTML valide quand invoiceUrl absent", async () => {
		const html = await render(createElement(OrderConfirmationEmail, BASE_PROPS));

		expect(html).toContain("<!DOCTYPE");
		expect(html).toContain("CMD-9999999999-NOINV");
		expect(html).toContain("Suivre ma commande");
	});

	it("ne mentionne PAS 'Facture N° ...' explicitement dans le contenu sans invoiceUrl", async () => {
		const html = await render(createElement(OrderConfirmationEmail, BASE_PROPS));

		// L'email ne contient JAMAIS le numéro de facture en clair, seulement
		// le numéro de commande. Garantit qu'on ne crée pas accidentellement
		// un mismatch facture/commande visible client.
		expect(html).not.toMatch(/F-\d{4}-\d{5}/);
	});
});
