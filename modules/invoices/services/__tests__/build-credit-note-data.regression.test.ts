/**
 * @regression build-credit-note-data-franchise — EINV-CREDIT-018
 *
 * Verrouille le correctif du 500 systématique au téléchargement d'avoir.
 *
 * Historique : la route `/api/orders/[orderNumber]/credit-note/[refundId]`
 * sélectionnait `orderItem.{ taxRate, taxCategoryCode, hsCode, unitCode }` et
 * `buildCreditNoteLine` les lisait. Or ces colonnes N'EXISTENT PAS sur le modèle
 * `OrderItem` (la TVA par ligne n'est pas stockée en franchise art. 293 B). Le
 * `select` Prisma levait une `PrismaClientValidationError` au runtime → 500 sur
 * TOUT avoir, masqué par les mocks de la route.
 *
 * Ce test exerce la VRAIE fonction `buildCreditNoteData` avec la forme corrigée
 * de `RefundForCreditNote` (sans les 4 champs fantômes) et vérifie que la
 * dérivation franchise est identique au chemin facture (`buildInvoiceLine`) :
 * taux 0, HT = TTC, hsCode/unitCode null, catégorie ZB (exonéré 293 B).
 *
 * Garde compile-time complémentaire : `Prisma.validator<Prisma.RefundSelect>()`
 * dans la route fait échouer `tsc` si un champ inexistant est re-sélectionné.
 */

import { describe, expect, it, vi } from "vitest";
import { buildCreditNoteData, type RefundForCreditNote } from "../build-credit-note-data";
import { invoiceDataSchema } from "../../schemas/invoice.schema";
import type { GetOrderReturn } from "@/modules/orders/types/order.types";

vi.mock("@/shared/lib/stripe", () => ({
	getVendorLegalInfo: () => ({
		company_legal_name: "TADDEI LEANE - Entrepreneur Individuel",
		company_trade_name: "Synclune",
		company_siret: "839 183 027 00037",
		company_siren: "839 183 027",
		company_vat: "FR35839183027",
		company_vat_regime: "FRANCHISE_BASE",
		company_legal_form: "Entrepreneur individuel",
		company_ape: "47.91B",
		company_address: "77 Boulevard du Tertre, 44100 Nantes, France",
		company_email: "contact@synclune.fr",
		einvoicing_platform_id: null,
		einvoicing_address: null,
		vat_exemption: "TVA non applicable, art. 293 B du CGI",
		bank_iban: null,
		bank_bic: null,
	}),
}));

function makeOrder(): GetOrderReturn {
	return {
		// cuid-like : invoiceMetaSchema valide orderId en z.cuid2() (les IDs à tirets échouent)
		id: "ckwq2x5g9000001mh2z3v8y1a",
		orderNumber: "SYN-2026-0001",
		userId: "user-1",
		customerEmail: "alice@example.com",
		customerName: "Alice Dupont",
		subtotal: 9000,
		discountAmount: 0,
		shippingCost: 500,
		taxAmount: 0,
		total: 9500,
		currency: "EUR",
		shippingFirstName: "Alice",
		shippingLastName: "Dupont",
		shippingAddress1: "10 rue de la Paix",
		shippingAddress2: null,
		shippingPostalCode: "75002",
		shippingCity: "Paris",
		shippingCountry: "FR",
		shippingPhone: "+33612345678",
		paymentMethod: "CARD",
		paidAt: new Date("2026-05-27T18:00:00Z"),
		stripePaymentIntentId: "pi_test_1",
		invoiceNumber: "F-2026-00001",
		invoiceStatus: "GENERATED",
		invoiceGeneratedAt: new Date("2026-05-27T18:00:00Z"),
	} as unknown as GetOrderReturn;
}

function makeRefund(): RefundForCreditNote {
	return {
		id: "refund-1",
		amount: 4500,
		reason: "CUSTOMER_REQUEST",
		creditNoteNumber: "A-2026-00042",
		creditNoteGeneratedAt: new Date("2026-05-28T10:00:00Z"),
	};
}

describe("@regression build-credit-note-data-franchise — EINV-CREDIT-018", () => {
	it("dérive la TVA par ligne intégralement (franchise 293 B) sans colonne OrderItem fantôme", () => {
		const data = buildCreditNoteData(makeOrder(), makeRefund());

		expect(data.invoiceNumber).toBe("A-2026-00042");
		expect(data.lines).toHaveLength(1);

		const line = data.lines[0]!;
		// Dérivation identique à buildInvoiceLine : aucune TVA stockée par ligne.
		expect(line.taxRate).toBe(0);
		expect(line.taxAmount).toBe(0);
		expect(line.taxCategoryCode).toBe("ZB"); // EXEMPT_FRANCHISE
		expect(line.hsCode).toBeNull();
		expect(line.unitCode).toBeNull();
		// Franchise : HT = TTC = montant remboursé de la ligne.
		expect(line.lineTotalInclTax).toBe(4500);
		expect(line.lineTotalExclTax).toBe(4500);
		expect(line.quantity).toBe(1);
		expect(line.unitPriceExclTax).toBe(4500);
	});

	// @regression credit-note-line-arithmetic (2026-08-05)
	//
	// L'avoir dépliait les `RefundItem` produits par `allocateDashboardRefundItems`,
	// qui proratisait `amount` en gardant `quantity` = quantité commandée ENTIÈRE :
	// sur un remboursement partiel la ligne imprimait `2 × 30,00 €` pour un total
	// de `20,00 €`. Une ligne qui ne s'additionne pas, figée sous SHA-256 dix ans.
	it("produit une ligne qui S'ADDITIONNE (quantité × prix unitaire == total ligne)", () => {
		const partialRefund: RefundForCreditNote = { ...makeRefund(), amount: 2000 };
		const data = buildCreditNoteData(makeOrder(), partialRefund);

		expect(data.lines).toHaveLength(1);
		const line = data.lines[0]!;
		expect(line.quantity * line.unitPriceExclTax).toBe(line.lineTotalExclTax);
		expect(line.lineTotalInclTax).toBe(2000);
		expect(data.totals.totalInclTax).toBe(2000);
	});

	it("référence la facture d'origine dans le libellé de la ligne", () => {
		const data = buildCreditNoteData(makeOrder(), makeRefund());
		expect(data.lines[0]!.productTitle).toContain("F-2026-00001");
	});

	it("référence la facture d'origine (Art. 272-I CGI) et produit un payload valide", () => {
		const data = buildCreditNoteData(makeOrder(), makeRefund());

		expect(data.precedingInvoice?.invoiceNumber).toBe("F-2026-00001");
		expect(data.totals.totalTax).toBe(0);
		expect(data.totals.totalInclTax).toBe(4500);
		// Le payload doit satisfaire le schéma pivot (round-trip renderer).
		expect(() => invoiceDataSchema.parse(data)).not.toThrow();
	});
});
