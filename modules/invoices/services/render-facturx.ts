import type { InvoiceData } from "../types/invoice-data";

/**
 * Rend l'objet pivot `InvoiceData` en XML CII profil MINIMUM (Factur-X 1.0.07).
 *
 * Le profil MINIMUM est le plus léger des 5 profils Factur-X (MINIMUM, BASIC WL,
 * BASIC, EN 16931, EXTENDED). Il contient l'essentiel : émetteur, destinataire,
 * numéro de facture, montants HT/TVA/TTC. C'est le bon point d'entrée pour une
 * petite structure qui n'a pas (encore) de ligne d'articles structurée
 * machine-lisible — la PDP/PA accepte généralement ce profil.
 *
 * **Limites assumées** :
 *  - XML standalone ; **pas embarqué dans un PDF/A-3**. L'embedding (qui fait
 *    qu'un PDF devient officiellement « Factur-X ») requiert un moteur PDF/A
 *    (pdf-lib + profil PDF/A-3) en remplacement de jsPDF — engine swap hors
 *    scope Phase 3. Le XML peut être transmis séparément en attendant.
 *  - Pas de lignes détaillées (MINIMUM ne les exige pas). Le passage à
 *    BASIC ajoutera `IncludedSupplyChainTradeLineItem`.
 *
 * Référence : https://fnfe-mpe.org/factur-x/
 *             UN/CEFACT Cross Industry Invoice D16B
 */
export function renderFacturXMinimum(data: InvoiceData): string {
	const isCreditNote = data.invoiceNumber.startsWith("A-");
	const typeCode = isCreditNote ? "381" : "380"; // UN/EDIFACT 1001
	const issueDate = formatDateCEFACT(data.issuedAt);
	const seller = renderSellerParty(data);
	const buyer = renderBuyerParty(data);
	const monetarySummation = renderMonetarySummation(data);

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
		`			<ram:ID>A1</ram:ID>\n` + // BT-23 : A1 = invoice
		`		</ram:BusinessProcessSpecifiedDocumentContextParameter>\n` +
		`		<ram:GuidelineSpecifiedDocumentContextParameter>\n` +
		`			<ram:ID>urn:factur-x.eu:1p0:minimum</ram:ID>\n` + // BT-24
		`		</ram:GuidelineSpecifiedDocumentContextParameter>\n` +
		`	</rsm:ExchangedDocumentContext>\n` +
		// BG-1 ExchangedDocument
		`	<rsm:ExchangedDocument>\n` +
		`		<ram:ID>${esc(data.invoiceNumber)}</ram:ID>\n` + // BT-1
		`		<ram:TypeCode>${typeCode}</ram:TypeCode>\n` + // BT-3
		`		<ram:IssueDateTime>\n` +
		`			<udt:DateTimeString format="102">${issueDate}</udt:DateTimeString>\n` + // BT-2
		`		</ram:IssueDateTime>\n` +
		`	</rsm:ExchangedDocument>\n` +
		// BG-25 SupplyChainTradeTransaction (cœur)
		`	<rsm:SupplyChainTradeTransaction>\n` +
		`		<ram:ApplicableHeaderTradeAgreement>\n` +
		seller +
		buyer +
		`		</ram:ApplicableHeaderTradeAgreement>\n` +
		`		<ram:ApplicableHeaderTradeDelivery/>\n` +
		`		<ram:ApplicableHeaderTradeSettlement>\n` +
		`			<ram:InvoiceCurrencyCode>${data.currency}</ram:InvoiceCurrencyCode>\n` + // BT-5
		monetarySummation +
		`		</ram:ApplicableHeaderTradeSettlement>\n` +
		`	</rsm:SupplyChainTradeTransaction>\n` +
		`</rsm:CrossIndustryInvoice>\n`
	);
}

// ============================================================================
// Sub-builders
// ============================================================================

function renderSellerParty(data: InvoiceData): string {
	const s = data.seller;
	const address = s.address;
	// schemeID "0002" = SIRENE (registre national français)
	// schemeID "VA" = numéro TVA intra-UE
	return (
		`			<ram:SellerTradeParty>\n` +
		`				<ram:Name>${esc(s.tradeName)}</ram:Name>\n` + // BT-27
		`				<ram:SpecifiedLegalOrganization>\n` +
		`					<ram:ID schemeID="0002">${esc(s.siren)}</ram:ID>\n` + // BT-30
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
				`					<ram:ID schemeID="VA">${esc(s.vatNumber)}</ram:ID>\n` + // BT-31
				`				</ram:SpecifiedTaxRegistration>\n`
			: "") +
		`			</ram:SellerTradeParty>\n`
	);
}

function renderBuyerParty(data: InvoiceData): string {
	const b = data.buyer;
	// B2B/B2G : raison sociale en BT-44, SIREN en BT-47, VAT en BT-48.
	// B2C : juste le nom complet en BT-44 (pas de BT-47/48).
	const name = b.legalName ?? `${b.firstName} ${b.lastName}`.trim();
	return (
		`			<ram:BuyerTradeParty>\n` +
		`				<ram:Name>${esc(name)}</ram:Name>\n` + // BT-44
		(b.siren
			? `				<ram:SpecifiedLegalOrganization>\n` +
				`					<ram:ID schemeID="0002">${esc(b.siren)}</ram:ID>\n` + // BT-47
				`				</ram:SpecifiedLegalOrganization>\n`
			: "") +
		(b.vatNumber
			? `				<ram:SpecifiedTaxRegistration>\n` +
				`					<ram:ID schemeID="VA">${esc(b.vatNumber)}</ram:ID>\n` + // BT-48
				`				</ram:SpecifiedTaxRegistration>\n`
			: "") +
		`			</ram:BuyerTradeParty>\n`
	);
}

function renderMonetarySummation(data: InvoiceData): string {
	const t = data.totals;
	const cur = data.currency;
	// MINIMUM exige : LineTotalAmount (BT-106) optionnel ici, TaxBasisTotalAmount
	// (BT-109), TaxTotalAmount (BT-110), GrandTotalAmount (BT-112) et
	// DuePayableAmount (BT-115). Les montants sont en unités décimales avec 2
	// chiffres après la virgule (format CEFACT standard).
	return (
		`			<ram:SpecifiedTradeSettlementHeaderMonetarySummation>\n` +
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

/**
 * Échappe les caractères XML obligatoires (W3C XML 1.0 spec). On évite
 * `&apos;` et `&quot;` car on n'utilise pas d'attributs avec ces caractères.
 */
function esc(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&apos;");
}

/**
 * Format CEFACT 102 : `YYYYMMDD` en UTC (date pure, pas d'heure).
 */
function formatDateCEFACT(date: Date): string {
	const y = date.getUTCFullYear().toString().padStart(4, "0");
	const m = (date.getUTCMonth() + 1).toString().padStart(2, "0");
	const d = date.getUTCDate().toString().padStart(2, "0");
	return `${y}${m}${d}`;
}

/**
 * Conversion centimes → décimal CEFACT à 2 chiffres, séparateur `.`.
 * Ex: 9500 (centimes) → "95.00"
 */
function formatAmount(cents: number): string {
	const sign = cents < 0 ? "-" : "";
	const absCents = Math.abs(cents);
	const euros = Math.floor(absCents / 100);
	const remainder = absCents % 100;
	return `${sign}${euros}.${remainder.toString().padStart(2, "0")}`;
}
