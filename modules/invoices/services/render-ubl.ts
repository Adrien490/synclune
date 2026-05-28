import type { InvoiceData, InvoiceLine, TaxBreakdownLine } from "../types/invoice-data";
import { INVOICE_FEATURE_FLAGS } from "../constants/feature-flags";
import { assertUblCenRules, assertUblXmlStructure } from "./validate-ubl";

/**
 * Rend l'objet pivot `InvoiceData` en XML UBL 2.1 conforme **Peppol BIS
 * Billing 3.0** (CEN EN 16931 + customisation OpenPeppol).
 *
 * UBL est le format dominant Peppol et de plusieurs PDP commerciales. Sa
 * structure diffère de CII (Factur-X) : root `<Invoice>` (ou `<CreditNote>`),
 * namespaces `cbc:`/`cac:` (OASIS), et l'ordre des éléments est imposé par XSD.
 *
 * Référence : https://docs.peppol.eu/poacc/billing/3.0/syntax/ubl-invoice/
 *
 * Limites assumées :
 *  - XML standalone ; embedding PDF/A-3 hors scope (EINV-FORMAT-001).
 *  - L'EndpointID utilise schemeID="0009" (SIRET-FR, code ICD ISO 6523).
 *    Pour interop UE, utiliser "0088" (GLN) ou "9930" (DE), etc.
 */
export function renderUblInvoice(data: InvoiceData): string {
	// Validation CEN EN 16931 opt-in (BR-CO-* + BR-16) sur pivot — cf. INVOICE_VALIDATE_XML.
	if (INVOICE_FEATURE_FLAGS.validate_xml) {
		assertUblCenRules(data);
	}

	const isCreditNote = data.invoiceNumber.startsWith("A-");
	const rootName = isCreditNote ? "CreditNote" : "Invoice";
	const rootNamespace = isCreditNote
		? "urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2"
		: "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2";
	const typeCode = isCreditNote ? "381" : "380";
	const typeCodeTag = isCreditNote ? "CreditNoteTypeCode" : "InvoiceTypeCode";
	const issueDate = formatDateISO(data.issuedAt);
	const linesTag = isCreditNote ? "CreditNoteLine" : "InvoiceLine";
	const quantityTag = isCreditNote ? "CreditedQuantity" : "InvoicedQuantity";

	const xml =
		`<?xml version="1.0" encoding="UTF-8"?>\n` +
		`<${rootName} xmlns="${rootNamespace}" ` +
		`xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2" ` +
		`xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2">\n` +
		// BT-24 + BT-23 — Peppol BIS 3.0
		`	<cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0</cbc:CustomizationID>\n` +
		`	<cbc:ProfileID>urn:fdc:peppol.eu:2017:poacc:billing:01:1.0</cbc:ProfileID>\n` +
		// BT-1
		`	<cbc:ID>${esc(data.invoiceNumber)}</cbc:ID>\n` +
		// BT-2
		`	<cbc:IssueDate>${issueDate}</cbc:IssueDate>\n` +
		(data.dueAt ? `	<cbc:DueDate>${formatDateISO(data.dueAt)}</cbc:DueDate>\n` : "") +
		// BT-3
		`	<cbc:${typeCodeTag}>${typeCode}</cbc:${typeCodeTag}>\n` +
		// Note (avoir : référence à la facture annulée — BT-3 raison)
		(data.precedingInvoice ? `	<cbc:Note>${esc(data.precedingInvoice.reason)}</cbc:Note>\n` : "") +
		// BT-5
		`	<cbc:DocumentCurrencyCode>${data.currency}</cbc:DocumentCurrencyCode>\n` +
		// BG-3 (avoirs) : référence à la facture d'origine
		(data.precedingInvoice
			? `	<cac:BillingReference>\n` +
				`		<cac:InvoiceDocumentReference>\n` +
				`			<cbc:ID>${esc(data.precedingInvoice.invoiceNumber)}</cbc:ID>\n` +
				`			<cbc:IssueDate>${formatDateISO(data.precedingInvoice.issuedAt)}</cbc:IssueDate>\n` +
				`		</cac:InvoiceDocumentReference>\n` +
				`	</cac:BillingReference>\n`
			: "") +
		// BG-4 — fournisseur (vendeur)
		renderSupplier(data) +
		// BG-7 — client
		renderCustomer(data) +
		// BG-16 — modalité de paiement (si IBAN renseigné)
		renderPaymentMeans(data) +
		// BG-23 — agrégation TVA
		renderTaxTotal(data) +
		// BG-22 — totaux légaux
		renderLegalMonetaryTotal(data) +
		// BG-25 — lignes
		data.lines
			.map((line) => renderInvoiceLineItem(line, linesTag, quantityTag, data.currency))
			.join("") +
		`</${rootName}>\n`;

	if (INVOICE_FEATURE_FLAGS.validate_xml) {
		assertUblXmlStructure(xml, data);
	}

	return xml;
}

// ============================================================================
// Sub-builders
// ============================================================================

function renderSupplier(data: InvoiceData): string {
	const s = data.seller;
	const addr = s.address;
	return (
		`	<cac:AccountingSupplierParty>\n` +
		`		<cac:Party>\n` +
		// schemeID "0009" = SIRET (registre fiscal FR, code ICD ISO 6523)
		`			<cbc:EndpointID schemeID="0009">${esc(s.siret)}</cbc:EndpointID>\n` +
		`			<cac:PartyIdentification>\n` +
		`				<cbc:ID schemeID="0009">${esc(s.siret)}</cbc:ID>\n` +
		`			</cac:PartyIdentification>\n` +
		`			<cac:PartyName>\n` +
		`				<cbc:Name>${esc(s.tradeName)}</cbc:Name>\n` +
		`			</cac:PartyName>\n` +
		`			<cac:PostalAddress>\n` +
		`				<cbc:StreetName>${esc(addr.line1)}</cbc:StreetName>\n` +
		(addr.line2
			? `				<cbc:AdditionalStreetName>${esc(addr.line2)}</cbc:AdditionalStreetName>\n`
			: "") +
		`				<cbc:CityName>${esc(addr.city)}</cbc:CityName>\n` +
		`				<cbc:PostalZone>${esc(addr.postalCode)}</cbc:PostalZone>\n` +
		`				<cac:Country>\n` +
		`					<cbc:IdentificationCode>${esc(addr.countryCode)}</cbc:IdentificationCode>\n` +
		`				</cac:Country>\n` +
		`			</cac:PostalAddress>\n` +
		(s.vatNumber
			? `			<cac:PartyTaxScheme>\n` +
				`				<cbc:CompanyID>${esc(s.vatNumber)}</cbc:CompanyID>\n` +
				`				<cac:TaxScheme>\n` +
				`					<cbc:ID>VAT</cbc:ID>\n` +
				`				</cac:TaxScheme>\n` +
				`			</cac:PartyTaxScheme>\n`
			: "") +
		`			<cac:PartyLegalEntity>\n` +
		`				<cbc:RegistrationName>${esc(s.legalName)}</cbc:RegistrationName>\n` +
		`				<cbc:CompanyID schemeID="0002">${esc(s.siren)}</cbc:CompanyID>\n` +
		`			</cac:PartyLegalEntity>\n` +
		`			<cac:Contact>\n` +
		`				<cbc:ElectronicMail>${esc(s.email)}</cbc:ElectronicMail>\n` +
		`			</cac:Contact>\n` +
		`		</cac:Party>\n` +
		`	</cac:AccountingSupplierParty>\n`
	);
}

function renderCustomer(data: InvoiceData): string {
	const b = data.buyer;
	const addr = data.billingAddress;
	const name = b.legalName ?? `${b.firstName} ${b.lastName}`.trim();
	return (
		`	<cac:AccountingCustomerParty>\n` +
		`		<cac:Party>\n` +
		(b.siret
			? `			<cbc:EndpointID schemeID="0009">${esc(b.siret)}</cbc:EndpointID>\n` +
				`			<cac:PartyIdentification>\n` +
				`				<cbc:ID schemeID="0009">${esc(b.siret)}</cbc:ID>\n` +
				`			</cac:PartyIdentification>\n`
			: "") +
		`			<cac:PartyName>\n` +
		`				<cbc:Name>${esc(name)}</cbc:Name>\n` +
		`			</cac:PartyName>\n` +
		`			<cac:PostalAddress>\n` +
		`				<cbc:StreetName>${esc(addr.line1)}</cbc:StreetName>\n` +
		(addr.line2
			? `				<cbc:AdditionalStreetName>${esc(addr.line2)}</cbc:AdditionalStreetName>\n`
			: "") +
		`				<cbc:CityName>${esc(addr.city)}</cbc:CityName>\n` +
		`				<cbc:PostalZone>${esc(addr.postalCode)}</cbc:PostalZone>\n` +
		`				<cac:Country>\n` +
		`					<cbc:IdentificationCode>${esc(addr.countryCode)}</cbc:IdentificationCode>\n` +
		`				</cac:Country>\n` +
		`			</cac:PostalAddress>\n` +
		(b.vatNumber
			? `			<cac:PartyTaxScheme>\n` +
				`				<cbc:CompanyID>${esc(b.vatNumber)}</cbc:CompanyID>\n` +
				`				<cac:TaxScheme>\n` +
				`					<cbc:ID>VAT</cbc:ID>\n` +
				`				</cac:TaxScheme>\n` +
				`			</cac:PartyTaxScheme>\n`
			: "") +
		(b.legalName
			? `			<cac:PartyLegalEntity>\n` +
				`				<cbc:RegistrationName>${esc(b.legalName)}</cbc:RegistrationName>\n` +
				(b.siren ? `				<cbc:CompanyID schemeID="0002">${esc(b.siren)}</cbc:CompanyID>\n` : "") +
				`			</cac:PartyLegalEntity>\n`
			: "") +
		(b.email
			? `			<cac:Contact>\n` +
				`				<cbc:ElectronicMail>${esc(b.email)}</cbc:ElectronicMail>\n` +
				`			</cac:Contact>\n`
			: "") +
		`		</cac:Party>\n` +
		`	</cac:AccountingCustomerParty>\n`
	);
}

function renderPaymentMeans(data: InvoiceData): string {
	if (!data.seller.bankIban) {
		// Carte Stripe : code 48 (Bank card)
		return (
			`	<cac:PaymentMeans>\n` +
			`		<cbc:PaymentMeansCode>48</cbc:PaymentMeansCode>\n` +
			`	</cac:PaymentMeans>\n`
		);
	}
	return (
		`	<cac:PaymentMeans>\n` +
		// 30 = SEPA Credit Transfer (virement) — UNTDID 4461
		`		<cbc:PaymentMeansCode>30</cbc:PaymentMeansCode>\n` +
		`		<cac:PayeeFinancialAccount>\n` +
		`			<cbc:ID>${esc(data.seller.bankIban)}</cbc:ID>\n` + // BT-84
		(data.seller.bankBic
			? `			<cac:FinancialInstitutionBranch>\n` +
				`				<cbc:ID>${esc(data.seller.bankBic)}</cbc:ID>\n` + // BT-86
				`			</cac:FinancialInstitutionBranch>\n`
			: "") +
		`		</cac:PayeeFinancialAccount>\n` +
		`	</cac:PaymentMeans>\n`
	);
}

function renderTaxTotal(data: InvoiceData): string {
	const cur = data.currency;
	return (
		`	<cac:TaxTotal>\n` +
		`		<cbc:TaxAmount currencyID="${cur}">${formatAmount(data.totals.totalTax)}</cbc:TaxAmount>\n` + // BT-110
		data.totals.taxBreakdown.map((t) => renderTaxSubtotal(t, cur)).join("") +
		`	</cac:TaxTotal>\n`
	);
}

function renderTaxSubtotal(tax: TaxBreakdownLine, currency: string): string {
	return (
		`		<cac:TaxSubtotal>\n` +
		`			<cbc:TaxableAmount currencyID="${currency}">${formatAmount(tax.taxableAmount)}</cbc:TaxableAmount>\n` + // BT-116
		`			<cbc:TaxAmount currencyID="${currency}">${formatAmount(tax.taxAmount)}</cbc:TaxAmount>\n` + // BT-117
		`			<cac:TaxCategory>\n` +
		`				<cbc:ID>${tax.categoryCode}</cbc:ID>\n` + // BT-118
		`				<cbc:Percent>${formatRate(tax.rate)}</cbc:Percent>\n` + // BT-119
		(tax.exemptionReason
			? `				<cbc:TaxExemptionReason>${esc(tax.exemptionReason)}</cbc:TaxExemptionReason>\n` // BT-120
			: "") +
		`				<cac:TaxScheme>\n` +
		`					<cbc:ID>VAT</cbc:ID>\n` +
		`				</cac:TaxScheme>\n` +
		`			</cac:TaxCategory>\n` +
		`		</cac:TaxSubtotal>\n`
	);
}

function renderLegalMonetaryTotal(data: InvoiceData): string {
	const t = data.totals;
	const cur = data.currency;
	return (
		`	<cac:LegalMonetaryTotal>\n` +
		`		<cbc:LineExtensionAmount currencyID="${cur}">${formatAmount(t.subtotalExclTax)}</cbc:LineExtensionAmount>\n` + // BT-106
		`		<cbc:TaxExclusiveAmount currencyID="${cur}">${formatAmount(t.totalExclTax)}</cbc:TaxExclusiveAmount>\n` + // BT-109
		`		<cbc:TaxInclusiveAmount currencyID="${cur}">${formatAmount(t.totalInclTax)}</cbc:TaxInclusiveAmount>\n` + // BT-112
		(t.totalDiscount > 0
			? `		<cbc:AllowanceTotalAmount currencyID="${cur}">${formatAmount(t.totalDiscount)}</cbc:AllowanceTotalAmount>\n` // BT-107
			: "") +
		`		<cbc:PayableAmount currencyID="${cur}">${formatAmount(t.amountDue)}</cbc:PayableAmount>\n` + // BT-115
		`	</cac:LegalMonetaryTotal>\n`
	);
}

function renderInvoiceLineItem(
	line: InvoiceLine,
	linesTag: string,
	quantityTag: string,
	currency: string,
): string {
	const variant = [line.variantInfo.color, line.variantInfo.material, line.variantInfo.size]
		.filter(Boolean)
		.join(" / ");
	const description = line.productDescription ?? (variant || null);
	const unitCode = line.unitCode ?? "H87";

	return (
		`	<cac:${linesTag}>\n` +
		`		<cbc:ID>${line.lineNumber}</cbc:ID>\n` + // BT-126
		`		<cbc:${quantityTag} unitCode="${esc(unitCode)}">${line.quantity}</cbc:${quantityTag}>\n` + // BT-129/BT-130
		`		<cbc:LineExtensionAmount currencyID="${currency}">${formatAmount(line.lineTotalExclTax)}</cbc:LineExtensionAmount>\n` + // BT-131
		`		<cac:Item>\n` +
		(description ? `			<cbc:Description>${esc(description)}</cbc:Description>\n` : "") +
		`			<cbc:Name>${esc(line.productTitle)}</cbc:Name>\n` + // BT-153
		(line.skuCode
			? `			<cac:SellersItemIdentification>\n` +
				`				<cbc:ID>${esc(line.skuCode)}</cbc:ID>\n` +
				`			</cac:SellersItemIdentification>\n`
			: "") +
		(line.hsCode
			? `			<cac:CommodityClassification>\n` +
				`				<cbc:ItemClassificationCode listID="HS">${esc(line.hsCode)}</cbc:ItemClassificationCode>\n` + // BT-158
				`			</cac:CommodityClassification>\n`
			: "") +
		`			<cac:ClassifiedTaxCategory>\n` +
		`				<cbc:ID>${line.taxCategoryCode}</cbc:ID>\n` + // BT-151
		`				<cbc:Percent>${formatRate(line.taxRate)}</cbc:Percent>\n` + // BT-152
		`				<cac:TaxScheme>\n` +
		`					<cbc:ID>VAT</cbc:ID>\n` +
		`				</cac:TaxScheme>\n` +
		`			</cac:ClassifiedTaxCategory>\n` +
		`		</cac:Item>\n` +
		`		<cac:Price>\n` +
		`			<cbc:PriceAmount currencyID="${currency}">${formatAmount(line.unitPriceExclTax)}</cbc:PriceAmount>\n` + // BT-146
		`		</cac:Price>\n` +
		`	</cac:${linesTag}>\n`
	);
}

// ============================================================================
// Helpers
// ============================================================================

function esc(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&apos;");
}

/** Format ISO 8601 calendar date `YYYY-MM-DD` (UBL requirement). */
function formatDateISO(date: Date): string {
	const y = date.getUTCFullYear().toString().padStart(4, "0");
	const m = (date.getUTCMonth() + 1).toString().padStart(2, "0");
	const d = date.getUTCDate().toString().padStart(2, "0");
	return `${y}-${m}-${d}`;
}

function formatAmount(cents: number): string {
	const sign = cents < 0 ? "-" : "";
	const absCents = Math.abs(cents);
	const euros = Math.floor(absCents / 100);
	const remainder = absCents % 100;
	return `${sign}${euros}.${remainder.toString().padStart(2, "0")}`;
}

/** Basis points (2000 = 20%) → décimal 2 chiffres (UBL Percent). */
function formatRate(basisPoints: number): string {
	const sign = basisPoints < 0 ? "-" : "";
	const abs = Math.abs(basisPoints);
	const integer = Math.floor(abs / 100);
	const remainder = abs % 100;
	return `${sign}${integer}.${remainder.toString().padStart(2, "0")}`;
}
