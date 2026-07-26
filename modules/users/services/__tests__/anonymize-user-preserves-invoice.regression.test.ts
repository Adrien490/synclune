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

	// Durcissement (audit couverture facturation 2026-05-30, finding P2) : on
	// extrait TOUS les `data:{...}` de TOUTE écriture `tx.order.update|updateMany|
	// upsert`, pas seulement la 1ʳᵉ. Sinon un 2ᵉ statement (ou un `tx.order.update`
	// singulier) scrubant `billing*` échapperait à la garde. Les blocs concaténés
	// donnent la surface réellement écrite sur Order pendant l'anonymisation.
	const orderWriteBlocks = [
		...source.matchAll(
			/tx\.order\.(?:update|updateMany|upsert)\([\s\S]*?data:\s*\{([\s\S]*?)\}[\s\S]*?\}\s*\);/g,
		),
	].map((m) => m[1] ?? "");
	const combinedOrderWrites = orderWriteBlocks.join("\n");

	it("écrit au moins un bloc tx.order.update* (régression — l'anonymisation doit tourner)", () => {
		expect(orderWriteBlocks.length).toBeGreaterThan(0);
	});

	it.each(FORBIDDEN_KEYS_IN_ANONYMIZE_UPDATE)(
		"n'assigne Order.%s dans AUCUN bloc d'écriture pendant l'anonymisation",
		(field) => {
			// Match `<field>:` or `<field> :` — both forms are valid TypeScript.
			expect(combinedOrderWrites).not.toMatch(new RegExp(`\\b${field}\\s*:`, "u"));
		},
	);

	it("anonymise customerEmail / customerName / customerPhone / shipping* (contrôle positif)", () => {
		expect(combinedOrderWrites).toMatch(/\bcustomerEmail\s*:/);
		expect(combinedOrderWrites).toMatch(/\bcustomerName\s*:/);
		expect(combinedOrderWrites).toMatch(/\bcustomerPhone\s*:/);
		expect(combinedOrderWrites).toMatch(/\bshippingFirstName\s*:/);
		expect(combinedOrderWrites).toMatch(/\bshippingAddress1\s*:/);
	});
});
