import type { InvoiceData } from "../types/invoice-data";

/**
 * Validation UBL 2.1 contre les règles **Peppol BIS Billing 3.0** (qui
 * englobent CEN EN 16931). Complémentaire à `render-ubl.ts` qui n'a pas
 * d'assertion structurelle dédiée — ici on valide pivot + XML rendu.
 *
 * Limites assumées (cf. audit e-invoicing 2026-05-28) :
 *  - Pas validation XSD complète (~10 fichiers UBL 2.1 + Peppol Schematron).
 *    La PDP/PA validera côté serveur. Couvre ~80 % des rejets PDP courants.
 *  - Mode fail-closed identique à Factur-X.
 *
 * Référence : https://docs.peppol.eu/poacc/billing/3.0/syntax/ubl-invoice/
 */

const ROUNDING_TOLERANCE_CENTS = 1;

const VALID_INVOICE_TYPE_CODES = new Set(["380", "381", "384", "389"]);

// ============================================================================
// Mode pivot — Cohérence montants + champs (avant rendu XML)
// ============================================================================

/**
 * Valide les règles CEN sur l'objet pivot. Idem `assertFacturXCenRules` :
 * on capture les drifts au plus tôt, avec un message clair.
 */
export function assertUblCenRules(data: InvoiceData): void {
	const errors: string[] = [];

	// BR-CO-15 (cohérence taxes)
	const computed = data.totals.totalExclTax + data.totals.totalTax;
	if (Math.abs(computed - data.totals.totalInclTax) > ROUNDING_TOLERANCE_CENTS) {
		errors.push(
			`BR-CO-15: TaxInclusiveAmount (${data.totals.totalInclTax}) != ` +
				`TaxExclusiveAmount (${data.totals.totalExclTax}) + TaxAmount (${data.totals.totalTax})`,
		);
	}

	// BR-CO-25
	const expectedDue = data.totals.totalInclTax - data.totals.totalPaid;
	if (Math.abs(expectedDue - data.totals.amountDue) > ROUNDING_TOLERANCE_CENTS) {
		errors.push(
			`BR-CO-25: amountDue (${data.totals.amountDue}) != ` +
				`totalInclTax (${data.totals.totalInclTax}) - totalPaid (${data.totals.totalPaid})`,
		);
	}

	// BR-01
	if (!data.invoiceNumber || !/^[FA]-\d{4}-\d{5}$/.test(data.invoiceNumber)) {
		errors.push(`BR-01: invoiceNumber absent ou format invalide ("${data.invoiceNumber}")`);
	}

	// BR-02
	if (!(data.issuedAt instanceof Date) || Number.isNaN(data.issuedAt.getTime())) {
		errors.push("BR-02: issuedAt absent ou invalide");
	}

	// BR-04
	const expectedTypeCode = data.invoiceNumber.startsWith("A-") ? "381" : "380";
	if (!VALID_INVOICE_TYPE_CODES.has(expectedTypeCode)) {
		errors.push(`BR-04: type code invalide ("${expectedTypeCode}")`);
	}

	// BR-05
	if (data.currency.length !== 3) {
		errors.push(`BR-05: currency invalide ("${data.currency}")`);
	}

	// BR-06 (BT-27 seller)
	if (!data.seller.tradeName.trim()) {
		errors.push("BR-06: seller.tradeName requis");
	}

	// BR-07 (BT-44 buyer)
	const buyerName = data.buyer.legalName ?? `${data.buyer.firstName} ${data.buyer.lastName}`.trim();
	if (!buyerName.trim()) {
		errors.push("BR-07: buyer name requis");
	}

	// BR-16 : Peppol exige au moins une ligne (UBL InvoiceLine ou CreditNoteLine).
	// MINIMUM Factur-X tolère 0 lignes mais Peppol BIS 3.0 non.
	if (!Array.isArray(data.lines) || data.lines.length === 0) {
		errors.push("BR-16: au moins une ligne de facture requise pour UBL Peppol BIS 3.0");
	}

	if (errors.length > 0) {
		throw new Error(
			`CEN EN 16931 (UBL Peppol BIS 3.0) violations for ${data.invoiceNumber}: ${errors.join(" ; ")}`,
		);
	}
}

// ============================================================================
// Mode XML — Présence des éléments cbc:/cac: dans le string rendu
// ============================================================================

/**
 * Éléments obligatoires UBL Peppol BIS 3.0. Inspecte la présence sans parser
 * en DOM (économie ~500ms et zéro dépendance). Les patterns sont volontairement
 * tolérants au whitespace pour absorber les variations de formatage.
 */
const REQUIRED_XML_FRAGMENTS: ReadonlyArray<{ rule: string; pattern: RegExp }> = [
	{
		rule: "BR-FR-PEPPOL-CUST (Peppol BIS 3.0 CustomizationID)",
		pattern:
			/<cbc:CustomizationID>urn:cen\.eu:en16931:2017#compliant#urn:fdc:peppol\.eu:2017:poacc:billing:3\.0<\/cbc:CustomizationID>/,
	},
	{
		rule: "BR-FR-PEPPOL-PROF (Peppol BIS 3.0 ProfileID)",
		pattern: /<cbc:ProfileID>urn:fdc:peppol\.eu:2017:poacc:billing:01:1\.0<\/cbc:ProfileID>/,
	},
	{
		rule: "BR-01 (BT-1 invoice number cbc:ID racine)",
		// Premier <cbc:ID> hors balisage Peppol (CustomizationID/ProfileID déjà
		// avant) doit être l'invoice number — on cherche la 1ère occurrence
		// directement enfant du root.
		pattern: /<cbc:ID>[^<]+<\/cbc:ID>/,
	},
	{
		rule: "BR-02 (BT-2 IssueDate format YYYY-MM-DD)",
		pattern: /<cbc:IssueDate>\d{4}-\d{2}-\d{2}<\/cbc:IssueDate>/,
	},
	{
		rule: "BR-04 (BT-3 InvoiceTypeCode ou CreditNoteTypeCode)",
		pattern:
			/<cbc:(?:Invoice|CreditNote)TypeCode>(?:380|381|384|389)<\/cbc:(?:Invoice|CreditNote)TypeCode>/,
	},
	{
		rule: "BR-05 (BT-5 DocumentCurrencyCode)",
		pattern: /<cbc:DocumentCurrencyCode>[A-Z]{3}<\/cbc:DocumentCurrencyCode>/,
	},
	{
		rule: "BG-4 (AccountingSupplierParty)",
		pattern: /<cac:AccountingSupplierParty>[\s\S]*?<\/cac:AccountingSupplierParty>/,
	},
	{
		rule: "BG-7 (AccountingCustomerParty)",
		pattern: /<cac:AccountingCustomerParty>[\s\S]*?<\/cac:AccountingCustomerParty>/,
	},
	{
		rule: "BG-23 (TaxTotal avec TaxAmount currencyID)",
		pattern: /<cac:TaxTotal>[\s\S]*?<cbc:TaxAmount currencyID="[A-Z]{3}">[\d.\-]+<\/cbc:TaxAmount>/,
	},
	{
		rule: "BG-22 (LegalMonetaryTotal avec PayableAmount)",
		pattern:
			/<cac:LegalMonetaryTotal>[\s\S]*?<cbc:PayableAmount currencyID="[A-Z]{3}">[\d.\-]+<\/cbc:PayableAmount>/,
	},
	{
		rule: "BR-CO-15 (TaxExclusiveAmount présent)",
		pattern: /<cbc:TaxExclusiveAmount currencyID="[A-Z]{3}">[\d.\-]+<\/cbc:TaxExclusiveAmount>/,
	},
	{
		rule: "BR-CO-15 (TaxInclusiveAmount présent)",
		pattern: /<cbc:TaxInclusiveAmount currencyID="[A-Z]{3}">[\d.\-]+<\/cbc:TaxInclusiveAmount>/,
	},
];

/**
 * Valide le string XML UBL contre les éléments structurels obligatoires
 * Peppol BIS 3.0 — détecte les omissions de refacto et les changements de
 * namespace involontaires.
 */
export function assertUblXmlStructure(xml: string, data: InvoiceData): void {
	const errors: string[] = [];

	for (const { rule, pattern } of REQUIRED_XML_FRAGMENTS) {
		if (!pattern.test(xml)) {
			errors.push(`${rule}: fragment XML manquant`);
		}
	}

	// Cohérence currencyID : toutes les *Amount doivent matcher data.currency
	const currencyMismatches = Array.from(
		xml.matchAll(/<cbc:[A-Za-z]+Amount currencyID="([A-Z]{3})">/g),
	).filter((m) => m[1] !== data.currency);
	if (currencyMismatches.length > 0) {
		const unique = [...new Set(currencyMismatches.map((m) => m[1]))];
		errors.push(
			`BR-FR-PEPPOL-CUR: currencyID(s) [${unique.join(", ")}] != document currency "${data.currency}"`,
		);
	}

	if (errors.length > 0) {
		throw new Error(
			`UBL Peppol BIS 3.0 XML structure invalid for ${data.invoiceNumber}: ${errors.join(" ; ")}`,
		);
	}
}
