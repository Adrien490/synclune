import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * @regression paid-at-from-stripe-capture-2026-08-05
 *
 * Audit de conformité du modèle `Order` (Stripe 2026), constat P1.
 *
 * `processOrderFromPaymentIntent` écrivait `paidAt: new Date()` — l'horloge du
 * TRAITEMENT, pas l'horodatage de Stripe. Or `Order.paidAt` n'est pas décoratif,
 * c'est la clé fiscale du dépôt :
 *
 *  - filtre du livre de recettes (`export-orders-csv.service.ts`, Art. 50-0 CGI) ;
 *  - borne de la fenêtre annuelle du seuil de franchise TVA (`get-vat-progress.ts`) ;
 *  - ligne « Payé le : … » imprimée dans le PDF de facture, archivé et scellé
 *    sous SHA-256 pour dix ans (`render-invoice-pdf.ts`).
 *
 * En nominal le webhook arrive en secondes et l'écart est nul — c'est ce qui
 * rendait le défaut invisible. Il devient réel sur les deux chemins de reprise :
 * la route webhook renvoie 500 en échec et Stripe redélivre pendant **3 jours**
 * (`retry-webhooks` a été retiré le 2026-08-05), et le filet
 * `sync-async-payments` est devenu une tâche **MANUELLE**, donc déclenchée par un
 * clic qui peut arriver bien plus tard. Au passage d'un 31 décembre, la recette
 * tombe sur le mauvais exercice.
 *
 * La donnée n'a jamais manqué : `extractPaymentDetailsFromPaymentIntent` faisait
 * déjà le `charges.retrieve` et jetait `Charge.created`. Le correctif ne coûte
 * aucun appel Stripe.
 *
 * ⚠️ Ne PAS backfiller les commandes antérieures : leurs PDF sont scellés, un
 * `paidAt` corrigé les rendrait divergents de leur hash archivé.
 */

const { mockTx, mockPrisma } = vi.hoisted(() => {
	const mockTx = {
		order: { findUnique: vi.fn(), update: vi.fn() },
		productSku: { update: vi.fn(), updateMany: vi.fn(), findMany: vi.fn() },
		$queryRaw: vi.fn(),
	};
	const mockPrisma = {
		$transaction: vi.fn(async (cb: (tx: typeof mockTx) => unknown) => cb(mockTx)),
		order: { findUnique: vi.fn() },
	};
	return { mockTx, mockPrisma };
});

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));

vi.mock("@/shared/lib/prisma-tx-options", () => ({
	TX_TIMEOUT_LONG: 30000,
	TX_MAX_WAIT_LONG: 30000,
}));

vi.mock("@/modules/orders/utils/order-audit", () => ({
	createOrderAuditTx: vi.fn(),
}));

vi.mock("./payment-intent.service", () => ({
	initiateAutomaticRefund: vi.fn().mockResolvedValue({ success: true }),
}));

import { processOrderFromPaymentIntent } from "../checkout-order-processing.service";

const SKU_ID = "sku-1";
const PRODUCT_ID = "product-1";

/** Capture Stripe le 31 décembre à 23h59 UTC — exercice N. */
const CAPTURED_AT = new Date("2025-12-31T23:59:59.000Z");
/** Traitement deux jours plus tard, exercice N+1 : c'est là que l'écart mord. */
const PROCESSED_AT = new Date("2026-01-02T10:00:00.000Z");

function makeOrder() {
	return {
		id: "order-1",
		orderNumber: "CMD-001",
		paymentStatus: "PENDING",
		status: "PENDING",
		customerEmail: "a@b.c",
		total: 2500,
		items: [
			{
				skuId: SKU_ID,
				quantity: 1,
				price: 2500,
				productTitle: "Bague",
				skuColor: null,
				skuMaterial: null,
				skuSize: null,
				sku: {
					id: SKU_ID,
					inventory: 5,
					sku: "SKU-1",
					product: { id: PRODUCT_ID, slug: "bague" },
				},
			},
		],
	};
}

function makePaymentIntent() {
	return { id: "pi_123", amount_received: 2500, currency: "eur", metadata: {} } as never;
}

/** Retourne le `data` du seul `order.update` de la transaction d'encaissement. */
function paidAtWritten(): Date {
	expect(mockTx.order.update).toHaveBeenCalledTimes(1);
	return mockTx.order.update.mock.calls[0]![0].data.paidAt as Date;
}

beforeEach(() => {
	vi.clearAllMocks();
	vi.useFakeTimers();
	vi.setSystemTime(PROCESSED_AT);

	mockPrisma.order.findUnique.mockResolvedValue({ status: "PENDING" });
	mockTx.order.findUnique.mockResolvedValue(makeOrder());
	mockTx.order.update.mockResolvedValue({});
	mockTx.productSku.update.mockResolvedValue({});
	mockTx.productSku.updateMany.mockResolvedValue({ count: 0 });
	mockTx.productSku.findMany.mockResolvedValue([]);
	// Stock large : aucune désactivation, on ne teste que la date.
	mockTx.$queryRaw.mockResolvedValue([
		{
			id: SKU_ID,
			inventory: 5,
			isActive: true,
			deletedAt: null,
			productStatus: "PUBLIC",
			productDeletedAt: null,
		},
	]);
});

afterEach(() => {
	vi.useRealTimers();
});

describe("paidAt — la date d'encaissement vient de Stripe, pas de l'horloge du traitement", () => {
	it("écrit `Charge.created` et non l'heure du webhook", async () => {
		await processOrderFromPaymentIntent("order-1", makePaymentIntent(), {
			method: "CARD",
			capturedAt: CAPTURED_AT,
		});

		expect(paidAtWritten()).toEqual(CAPTURED_AT);
	});

	it("garde la recette sur l'exercice de la CAPTURE quand le traitement bascule d'année", async () => {
		await processOrderFromPaymentIntent("order-1", makePaymentIntent(), {
			method: "CARD",
			capturedAt: CAPTURED_AT,
		});

		// C'est l'assertion qui porte l'enjeu : le livre de recettes (Art. 50-0) et
		// la fenêtre du seuil de franchise TVA se calculent sur cette année-là.
		expect(paidAtWritten().getUTCFullYear()).toBe(2025);
		expect(paidAtWritten()).not.toEqual(PROCESSED_AT);
	});

	it("retombe sur l'horloge serveur quand Stripe est illisible — jamais un `paidAt` vide", async () => {
		// `capturedAt: null` est ce que rend `extractPaymentDetailsFromPaymentIntent`
		// sur échec API. Le CHECK DB `Order_paid_requires_paidAt` interdit de laisser
		// le champ nul sur une commande PAID : le repli n'est pas optionnel.
		await processOrderFromPaymentIntent("order-1", makePaymentIntent(), {
			method: null,
			capturedAt: null,
		});

		expect(paidAtWritten()).toEqual(PROCESSED_AT);
	});

	it("retombe aussi sur l'horloge serveur quand l'appelant ne passe rien", async () => {
		await processOrderFromPaymentIntent("order-1", makePaymentIntent());

		expect(paidAtWritten()).toEqual(PROCESSED_AT);
	});

	it("n'écrit pas `paymentMethod` quand le moyen est indéterminable (défaut Prisma CARD conservé)", async () => {
		await processOrderFromPaymentIntent("order-1", makePaymentIntent(), {
			method: null,
			capturedAt: CAPTURED_AT,
		});

		expect(mockTx.order.update.mock.calls[0]![0].data).not.toHaveProperty("paymentMethod");
	});
});
