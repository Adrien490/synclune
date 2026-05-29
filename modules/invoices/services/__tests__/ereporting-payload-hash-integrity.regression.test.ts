/**
 * @regression ereporting-payload-hash-integrity-2026-05-29
 *
 * Verrouille l'intégrité audit-vérifiable du `payloadSnapshot` e-reporting, par
 * symétrie exacte avec `Order.invoiceDataHash` (cf. `verify-invoice-snapshot.ts`).
 *
 * Le `payloadSnapshot` fige ce qui sera transmis à la DGFiP et doit rester
 * restituable à l'identique 10 ans (Art. L102 B LPF). `record-ereporting.service`
 * persiste désormais un `payloadHash` = SHA-256 canonical-JSON du snapshot. Ce
 * test garantit que :
 *  1. le hash respecte le format hex 64 (CHECK DB `*_payloadHash_format_check`) ;
 *  2. il est déterministe / indépendant de l'ordre d'insertion des clés ;
 *  3. toute altération du snapshot post-écriture est détectable (hash recalculé
 *     ≠ hash stocké).
 *
 * Si la garde saute (hash non calculé, drift de l'algo de sérialisation), une
 * corruption ou un UPDATE non autorisé du snapshot comptable passerait inaperçu.
 */
import { describe, expect, it } from "vitest";
import { buildSalesTransaction } from "../build-ereporting-transaction";
import { hashEReportingPayload } from "../record-ereporting.service";

function makeSalesPayload() {
	return buildSalesTransaction({
		order: {
			id: "order_1",
			orderNumber: "CMD-2026-00042",
			paidAt: new Date("2026-05-29T10:30:00.000Z"),
			total: 12000,
			taxAmount: 0,
			currency: "EUR",
			paymentMethod: "CARD",
			shippingCountry: "FR",
			customerType: "B2C",
			stripePaymentIntentId: "pi_123",
		},
	});
}

describe("e-reporting payloadHash — intégrité audit-vérifiable (Art. L102 B LPF)", () => {
	it("produit un SHA-256 hex 64 conforme au CHECK DB", () => {
		const { payloadSnapshot } = makeSalesPayload();
		const hash = hashEReportingPayload(payloadSnapshot);
		expect(hash).toMatch(/^[a-f0-9]{64}$/);
	});

	it("est déterministe et indépendant de l'ordre d'insertion des clés", () => {
		const { payloadSnapshot } = makeSalesPayload();
		// Même snapshot, clés ré-insérées dans un ordre différent (cas Prisma vs littéral).
		const reordered = Object.fromEntries(
			Object.entries(payloadSnapshot).reverse(),
		) as typeof payloadSnapshot;

		expect(hashEReportingPayload(reordered)).toBe(hashEReportingPayload(payloadSnapshot));
	});

	it("détecte une altération du snapshot post-écriture (hash recalculé ≠ hash stocké)", () => {
		const { payloadSnapshot } = makeSalesPayload();
		const storedHash = hashEReportingPayload(payloadSnapshot);

		// Un acteur malveillant / un UPDATE non autorisé minore le montant transmis.
		const tampered = { ...payloadSnapshot, amountIncTax: payloadSnapshot.amountIncTax - 5000 };

		expect(hashEReportingPayload(tampered)).not.toBe(storedHash);
	});

	it("détecte aussi une altération d'un champ non numérique (countryCode)", () => {
		const { payloadSnapshot } = makeSalesPayload();
		const storedHash = hashEReportingPayload(payloadSnapshot);

		const tampered = { ...payloadSnapshot, countryCode: "BE" };

		expect(hashEReportingPayload(tampered)).not.toBe(storedHash);
	});
});
