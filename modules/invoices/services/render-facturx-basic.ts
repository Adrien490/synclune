import type { InvoiceData, InvoiceLine, TaxBreakdownLine } from "../types/invoice-data";

/**
 * Rend l'objet pivot `InvoiceData` en XML CII profil **BASIC** (Factur-X 1.0.07
 * / EN 16931 conformant).
 *
 * BASIC = MINIMUM + lignes détaillées (BG-25 IncludedSupplyChainTradeLineItem)
 * + breakdown TVA au header (BG-22 ApplicableTradeTax) + BT-106 LineTotalAmount
 * dans la summation. C'est le profil exigé par la majorité des PDP B2B.
 *
 * Référence : https://fnfe-mpe.org/factur-x/ (CII D16B / EN16931).
 *
 * Limites assumées :
 *  - XML standalone, **pas embarqué dans un PDF/A-3** (engine swap pdf-lib
 *    requis — hors scope Phase 3, EINV-FORMAT-001).
 *  - `renderFacturXMinimum` reste disponible pour les call-sites qui veulent
 *    rester sur le profil minimal (transmissions simplifiées B2C).
 */
export function renderFacturXBasic(data: InvoiceData): string {
	const isCreditNote = data.invoiceNumber.startsWith("A-");
	const typeCode = isCreditNote ? "381" : "380";
	const issueDate = formatDateCEFACT(data.issuedAt);

	return (
		`<?xml version="1.0" encoding="UTF-8"?>\n` +
		`<rsm:CrossIndustryInvoice ` +
		`xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100" ` +
		`xmlns:qdt="urn:un:unece:uncefact:data:standard:QualifiedDataType:100" ` +
		`xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100" ` +
		`xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100">\n` +
		// BG-2 ExchangedDocumentContext
		`	<rsm:ExchangedDocumentContext>\n` +
		`		<ram:BusinessProcessSpecifiedDocumentContextParameter>\n` +
		`			<ram:ID>A1</ram:ID>\n` +
		`		</ram:BusinessProcessSpecifiedDocumentContextParameter>\n` +
		`		<ram:GuidelineSpecifiedDocumentContextParameter>\n` +
		`			<ram:ID>urn:cen.eu:en16931:2017#compliant#urn:factur-x.eu:1p0:basic</ram:ID>\n` +
		`		</ram:GuidelineSpecifiedDocumentContextParameter>\n` +
		`	</rsm:ExchangedDocumentContext>\n` +
		// BG-1 ExchangedDocument
		`	<rsm:ExchangedDocument>\n` +
		`		<ram:ID>${esc(data.invoiceNumber)}</ram:ID>\n` +
		`		<ram:TypeCode>${typeCode}</ram:TypeCode>\n` +
		`		<ram:IssueDateTime>\n` +
		`			<udt:DateTimeString format="102">${issueDate}</udt:DateTimeString>\n` +
		`		</ram:IssueDateTime>\n` +
		`	</rsm:ExchangedDocument>\n` +
		// BG-25 SupplyChainTradeTransaction (cœur)
		`	<rsm:SupplyChainTradeTransaction>\n` +
		// Lignes détaillées (différence MINIMUM/BASIC)
		data.lines.map(renderLineItem).join("") +
		`		<ram:ApplicableHeaderTradeAgreement>\n` +
		renderSellerParty(data) +
		renderBuyerParty(data) +
		`		</ram:ApplicableHeaderTradeAgreement>\n` +
		`		<ram:ApplicableHeaderTradeDelivery/>\n` +
		`		<ram:ApplicableHeaderTradeSettlement>\n` +
		`			<ram:InvoiceCurrencyCode>${data.currency}</ram:InvoiceCurrencyCode>\n` +
		// BG-22 TaxTotal détaillé (un bloc par couple rate/category)
		data.totals.taxBreakdown.map((t) => renderApplicableTradeTax(t, data.currency)).join("") +
		// BT-115 + summation
		renderMonetarySummation(data) +
		`		</ram:ApplicableHeaderTradeSettlement>\n` +
		`	</rsm:SupplyChainTradeTransaction>\n` +
		`</rsm:CrossIndustryInvoice>\n`
	);
}

// ============================================================================
// Sub-builders
// ============================================================================

function renderLineItem(line: InvoiceLine): string {
	const variant = [line.variantInfo.color, line.variantInfo.material, line.variantInfo.size]
		.filter(Boolean)
		.join(" / ");
	const description = line.productDescription ?? (variant || null);
	const unitCode = line.unitCode ?? "H87"; // H87 = piece (UN/ECE Rec 20, défaut bijoux)

	return (
		`		<ram:IncludedSupplyChainTradeLineItem>\n` +
		`			<ram:AssociatedDocumentLineDocument>\n` +
		`				<ram:LineID>${line.lineNumber}</ram:LineID>\n` + // BT-126
		`			</ram:AssociatedDocumentLineDocument>\n` +
		`			<ram:SpecifiedTradeProduct>\n` +
		(line.skuCode ? `				<ram:SellerAssignedID>${esc(line.skuCode)}</ram:SellerAssignedID>\n` : "") +
		`				<ram:Name>${esc(line.productTitle)}</ram:Name>\n` + // BT-153
		(description ? `				<ram:Description>${esc(description)}</ram:Description>\n` : "") +
		(line.hsCode
			? `				<ram:DesignatedProductClassification>\n` +
				`					<ram:ClassCode listID="HS">${esc(line.hsCode)}</ram:ClassCode>\n` + // BT-158
				`				</ram:DesignatedProductClassification>\n`
			: "") +
		`			</ram:SpecifiedTradeProduct>\n` +
		`			<ram:SpecifiedLineTradeAgreement>\n` +
		`				<ram:NetPriceProductTradePrice>\n` +
		`					<ram:ChargeAmount>${formatAmount(line.unitPriceExclTax)}</ram:ChargeAmount>\n` + // BT-146
		`				</ram:NetPriceProductTradePrice>\n` +
		`			</ram:SpecifiedLineTradeAgreement>\n` +
		`			<ram:SpecifiedLineTradeDelivery>\n` +
		`				<ram:BilledQuantity unitCode="${esc(unitCode)}">${line.quantity}</ram:BilledQuantity>\n` + // BT-129/BT-130
		`			</ram:SpecifiedLineTradeDelivery>\n` +
		`			<ram:SpecifiedLineTradeSettlement>\n` +
		`				<ram:ApplicableTradeTax>\n` +
		`					<ram:TypeCode>VAT</ram:TypeCode>\n` +
		`					<ram:CategoryCode>${line.taxCategoryCode}</ram:CategoryCode>\n` + // BT-151
		`					<ram:RateApplicablePercent>${formatRate(line.taxRate)}</ram:RateApplicablePercent>\n` + // BT-152
		`				</ram:ApplicableTradeTax>\n` +
		`				<ram:SpecifiedTradeSettlementLineMonetarySummation>\n` +
		`					<ram:LineTotalAmount>${formatAmount(line.lineTotalExclTax)}</ram:LineTotalAmount>\n` + // BT-131
		`				</ram:SpecifiedTradeSettlementLineMonetarySummation>\n` +
		`			</ram:SpecifiedLineTradeSettlement>\n` +
		`		</ram:IncludedSupplyChainTradeLineItem>\n`
	);
}

function renderSellerParty(data: InvoiceData): string {
	const s = data.seller;
	const address = s.address;
	return (
		`			<ram:SellerTradeParty>\n` +
		`				<ram:Name>${esc(s.tradeName)}</ram:Name>\n` +
		`				<ram:SpecifiedLegalOrganization>\n` +
		`					<ram:ID schemeID="0002">${esc(s.siren)}</ram:ID>\n` +
		`					<ram:TradingBusinessName>${esc(s.legalName)}</ram:TradingBusinessName>\n` +
		`				</ram:SpecifiedLegalOrganization>\n` +
		`				<ram:PostalTradeAddress>\n` +
		`					<ram:PostcodeCode>${esc(address.postalCode)}</ram:PostcodeCode>\n` +
		`					<ram:LineOne>${esc(address.line1)}</ram:LineOne>\n` +
		(address.line2 ? `					<ram:LineTwo>${esc(address.line2)}</ram:LineTwo>\n` : "") +
		`					<ram:CityName>${esc(address.city)}</ram:CityName>\n` +
		`					<ram:CountryID>${esc(address.countryCode)}</ram:CountryID>\n` +
		`				</ram:PostalTradeAddress>\n` +
		(s.vatNumber
			? `				<ram:SpecifiedTaxRegistration>\n` +
				`					<ram:ID schemeID="VA">${esc(s.vatNumber)}</ram:ID>\n` +
				`				</ram:SpecifiedTaxRegistration>\n`
			: "") +
		`			</ram:SellerTradeParty>\n`
	);
}

function renderBuyerParty(data: InvoiceData): string {
	const b = data.buyer;
	const name = b.legalName ?? `${b.firstName} ${b.lastName}`.trim();
	return (
		`			<ram:BuyerTradeParty>\n` +
		`				<ram:Name>${esc(name)}</ram:Name>\n` +
		(b.siren
			? `				<ram:SpecifiedLegalOrganization>\n` +
				`					<ram:ID schemeID="0002">${esc(b.siren)}</ram:ID>\n` +
				`				</ram:SpecifiedLegalOrganization>\n`
			: "") +
		(b.vatNumber
			? `				<ram:SpecifiedTaxRegistration>\n` +
				`					<ram:ID schemeID="VA">${esc(b.vatNumber)}</ram:ID>\n` +
				`				</ram:SpecifiedTaxRegistration>\n`
			: "") +
		`			</ram:BuyerTradeParty>\n`
	);
}

function renderApplicableTradeTax(tax: TaxBreakdownLine, currency: string): string {
	return (
		`			<ram:ApplicableTradeTax>\n` +
		`				<ram:CalculatedAmount currencyID="${currency}">${formatAmount(tax.taxAmount)}</ram:CalculatedAmount>\n` + // BT-117
		`				<ram:TypeCode>VAT</ram:TypeCode>\n` +
		(tax.exemptionReason
			? `				<ram:ExemptionReason>${esc(tax.exemptionReason)}</ram:ExemptionReason>\n` // BT-120
			: "") +
		`				<ram:BasisAmount currencyID="${currency}">${formatAmount(tax.taxableAmount)}</ram:BasisAmount>\n` + // BT-116
		`				<ram:CategoryCode>${tax.categoryCode}</ram:CategoryCode>\n` + // BT-118
		`				<ram:RateApplicablePercent>${formatRate(tax.rate)}</ram:RateApplicablePercent>\n` + // BT-119
		`			</ram:ApplicableTradeTax>\n`
	);
}

function renderMonetarySummation(data: InvoiceData): string {
	const t = data.totals;
	const cur = data.currency;
	return (
		`			<ram:SpecifiedTradeSettlementHeaderMonetarySummation>\n` +
		`				<ram:LineTotalAmount>${formatAmount(t.subtotalExclTax)}</ram:LineTotalAmount>\n` + // BT-106
		`				<ram:TaxBasisTotalAmount>${formatAmount(t.totalExclTax)}</ram:TaxBasisTotalAmount>\n` + // BT-109
		`				<ram:TaxTotalAmount currencyID="${cur}">${formatAmount(t.totalTax)}</ram:TaxTotalAmount>\n` + // BT-110
		`				<ram:GrandTotalAmount>${formatAmount(t.totalInclTax)}</ram:GrandTotalAmount>\n` + // BT-112
		`				<ram:DuePayableAmount>${formatAmount(t.amountDue)}</ram:DuePayableAmount>\n` + // BT-115
		`			</ram:SpecifiedTradeSettlementHeaderMonetarySummation>\n`
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

function formatDateCEFACT(date: Date): string {
	const y = date.getUTCFullYear().toString().padStart(4, "0");
	const m = (date.getUTCMonth() + 1).toString().padStart(2, "0");
	const d = date.getUTCDate().toString().padStart(2, "0");
	return `${y}${m}${d}`;
}

function formatAmount(cents: number): string {
	const sign = cents < 0 ? "-" : "";
	const absCents = Math.abs(cents);
	const euros = Math.floor(absCents / 100);
	const remainder = absCents % 100;
	return `${sign}${euros}.${remainder.toString().padStart(2, "0")}`;
}

/**
 * Basis points (2000 = 20%) → décimal CEFACT 2 chiffres (`20.00`).
 */
function formatRate(basisPoints: number): string {
	const sign = basisPoints < 0 ? "-" : "";
	const abs = Math.abs(basisPoints);
	const integer = Math.floor(abs / 100);
	const remainder = abs % 100;
	return `${sign}${integer}.${remainder.toString().padStart(2, "0")}`;
}
