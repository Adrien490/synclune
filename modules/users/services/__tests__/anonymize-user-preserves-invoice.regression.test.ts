import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * @regression rgpd-anonymize-preserves-invoice-snapshot-2026-05-28
 *
 * Quand un client demande la suppression de son compte (RGPD Art. 17),
 * `anonymizeUserInTransaction` doit anonymiser l'identité personnelle (nom,
 * email, téléphone, adresse de livraison) MAIS préserver les champs requis
 * pour la conservation 10 ans des factures (Art. L102 B LPF, Art. L123-22
 * Code de Commerce) :
 *  - invoiceNumber, invoiceStatus, invoiceGeneratedAt, invoicePdfUrl, invoicePdfHash
 *  - creditNoteNumber, creditNoteGeneratedAt, creditNotePdfUrl, creditNotePdfHash
 *  - billing* (snapshot adresse de facturation figé Art. 289 CGI)
 *  - customerType, customerCompany* (B2B/B2G snapshot)
 *  - paidAt, total, subtotal, discountAmount, shippingCost, taxAmount
 *  - vendor* snapshot (identité vendeur à T0)
 *
 * Sans cette garde : un audit fiscal sur une commande passée chez un client
 * anonymisé verrait une facture amputée (Order.billingFirstName=null →
 * `buildInvoiceData()` throw / produit un PDF différent du PDF archivé).
 *
 * Cf. EINV-GLOBAL-022 (audit 2026-05-28).
 */

const FORBIDDEN_KEYS_IN_ANONYMIZE_UPDATE = [
	// Numéros / champs de facturation
	"invoiceNumber",
	"invoiceStatus",
	"invoiceGeneratedAt",
	"invoiceVoidedAt",
	"invoicePdfUrl",
	"invoicePdfHash",
	"invoiceDataSnapshot",
	"invoiceDataHash",
	"creditNoteNumber",
	"creditNoteGeneratedAt",
	"creditNotePdfUrl",
	"creditNotePdfHash",
	// Snapshots adresse facturation
	"billingFirstName",
	"billingLastName",
	"billingAddress1",
	"billingAddress2",
	"billingPostalCode",
	"billingCity",
	"billingCountry",
	"billingSameAsShipping",
	// Snapshots B2B/B2G (Art. 289 CGI)
	"customerType",
	"customerCompanyName",
	"customerCompanySiren",
	"customerCompanySiret",
	"customerCompanyVatNumber",
	// Snapshots monétaires (Art. L102 B LPF — facture reconstituable)
	"subtotal",
	"discountAmount",
	"shippingCost",
	"taxAmount",
	"total",
	"paidAt",
	"paymentMethod",
	// Vendor snapshot
	"vendorLegalName",
	"vendorTradeName",
	"vendorSiren",
	"vendorSiret",
	"vendorVatNumber",
	"vendorVatRegime",
	"vendorAddress",
	"vendorBankIban",
	"vendorBankBic",
] as const;

describe("anonymize-user — preserves invoice snapshot fields", () => {
	const servicePath = join(
		process.cwd(),
		"modules",
		"users",
		"services",
		"anonymize-user.service.ts",
	);
	const source = readFileSync(servicePath, "utf-8");

	// Extract the `tx.order.updateMany({ ... data: { ... } })` block to inspect.
	const orderUpdateBlock = source.match(
		/tx\.order\.updateMany\([\s\S]*?data:\s*\{([\s\S]*?)\}[\s\S]*?\}\s*\);/,
	);

	it("contains a tx.order.updateMany block (regression — anonymization must run)", () => {
		expect(orderUpdateBlock).not.toBeNull();
	});

	it.each(FORBIDDEN_KEYS_IN_ANONYMIZE_UPDATE)(
		"does not assign Order.%s during anonymization",
		(field) => {
			const block = orderUpdateBlock?.[1] ?? "";
			// Match `<field>:` or `<field> :` — both forms are valid TypeScript.
			expect(block).not.toMatch(new RegExp(`\\b${field}\\s*:`, "u"));
		},
	);

	it("does anonymize customerEmail / customerName / customerPhone / shipping* (positive control)", () => {
		const block = orderUpdateBlock?.[1] ?? "";
		expect(block).toMatch(/\bcustomerEmail\s*:/);
		expect(block).toMatch(/\bcustomerName\s*:/);
		expect(block).toMatch(/\bcustomerPhone\s*:/);
		expect(block).toMatch(/\bshippingFirstName\s*:/);
		expect(block).toMatch(/\bshippingAddress1\s*:/);
	});
});
