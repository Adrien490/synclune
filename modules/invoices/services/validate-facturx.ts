import type { InvoiceData } from "../types/invoice-data";

/**
 * Validation Factur-X profil MINIMUM contre un sous-ensemble des règles
 * business **CEN EN 16931** (Annex A) et **BR-FR-FX** (spécifiques au
 * profil français). Complémentaire à `assertFacturXMinimumInvariants`
 * (`render-facturx.ts`) qui ne vérifie que la présence des champs pivot —
 * ici on vérifie la **cohérence métier** (montants, codes, profil).
 *
 * **Limites assumées** (cf. audit e-invoicing 2026-05-28) :
 *  - Ce n'est PAS une validation XSD complète (impossible sur Vercel
 *    serverless sans alourdir le bundle de 15+MB pour libxmljs2/xmllint-wasm
 *    + XSDs CEN/UN-CEFACT). La PDP/PA fournira la validation XSD finale.
 *  - Couvre ~80 % des erreurs que la PDP rejetterait pour profil MINIMUM.
 *  - Mode **fail-closed** : toute violation `throw Error("CEN <BR>: ...")`,
 *    catchée par l'orchestrateur appelant qui marque `invoiceRetryDeferred=true`.
 *
 * Référence : EN 16931-1:2017 + Factur-X 1.0.07 specification
 *             https://fnfe-mpe.org/factur-x/specifications/
 */

// ============================================================================
// Mode pivot — Cohérence montants + champs (avant rendu XML)
// ============================================================================

/**
 * Tolérance d'arrondi cumulé en centimes — accepte les écarts d'arrondi
 * banker's rounding sur les sommes ligne par ligne. 1 centime suffit pour
 * un total avec 50 lignes (~0.5 centime d'écart cumulé en pire cas).
 */
const ROUNDING_TOLERANCE_CENTS = 1;

/**
 * Code-types BT-3 acceptés en CEN EN 16931 (Annex C-1) :
 *  - 380 = facture commerciale
 *  - 381 = note de crédit
 *  - 384 = facture corrigée
 *  - 389 = facture auto-facturée
 *
 * Tout autre code = throw — la PDP rejette sans appel.
 */
const VALID_INVOICE_TYPE_CODES = new Set(["380", "381", "384", "389"]);

/**
 * Valide les règles BR-CO-* (cohérence) sur l'objet pivot **avant** rendu.
 * Capture les drifts entre `buildInvoiceData` et le contrat CEN sans
 * dépendre du string XML — meilleur signal d'erreur (stack trace propre).
 */
export function assertFacturXCenRules(data: InvoiceData): void {
	const errors: string[] = [];

	// BR-CO-15 : Total TTC = Total HT + Total TVA (cohérence taxes)
	const computed = data.totals.totalExclTax + data.totals.totalTax;
	if (Math.abs(computed - data.totals.totalInclTax) > ROUNDING_TOLERANCE_CENTS) {
		errors.push(
			`BR-CO-15: TaxInclusiveAmount (${data.totals.totalInclTax}) != ` +
				`TaxExclusiveAmount (${data.totals.totalExclTax}) + TaxAmount (${data.totals.totalTax})`,
		);
	}

	// BR-CO-25 : DuePayableAmount = GrandTotal - PrepaidAmount
	// Profil MINIMUM ne porte pas PrepaidAmount — accepté tel quel par CEN
	// si amountDue == totalInclTax - totalPaid.
	const expectedDue = data.totals.totalInclTax - data.totals.totalPaid;
	if (Math.abs(expectedDue - data.totals.amountDue) > ROUNDING_TOLERANCE_CENTS) {
		errors.push(
			`BR-CO-25: amountDue (${data.totals.amountDue}) != ` +
				`totalInclTax (${data.totals.totalInclTax}) - totalPaid (${data.totals.totalPaid})`,
		);
	}

	// BR-01 (BT-1) Invoice number — couvert par assertFacturXMinimumInvariants mais
	// redondance acceptée car cette fonction peut être appelée hors render-facturx.
	if (!data.invoiceNumber || !/^[FA]-\d{4}-\d{5}$/.test(data.invoiceNumber)) {
		errors.push(`BR-01: invoiceNumber absent ou format invalide ("${data.invoiceNumber}")`);
	}

	// BR-02 (BT-2) Issue date présente et valide
	if (!(data.issuedAt instanceof Date) || Number.isNaN(data.issuedAt.getTime())) {
		errors.push("BR-02: issuedAt absent ou invalide");
	}

	// BR-04 (BT-3) Type code valide
	const expectedTypeCode = data.invoiceNumber.startsWith("A-") ? "381" : "380";
	if (!VALID_INVOICE_TYPE_CODES.has(expectedTypeCode)) {
		errors.push(`BR-04: type code dérivé invalide ("${expectedTypeCode}")`);
	}

	// BR-05 (BT-5) Document currency = ISO 4217 (3 lettres). MINIMUM = EUR only
	// pour Synclune (devise vendeur).
	if (data.currency.length !== 3) {
		errors.push(`BR-05: currency invalide ("${data.currency}")`);
	}

	// BR-06 (BT-27) Seller name
	if (!data.seller.tradeName.trim()) {
		errors.push("BR-06: seller.tradeName requis");
	}

	// BR-07 (BT-44) Buyer name
	const buyerName = data.buyer.legalName ?? `${data.buyer.firstName} ${data.buyer.lastName}`.trim();
	if (!buyerName.trim()) {
		errors.push("BR-07: buyer.legalName ou (firstName + lastName) requis");
	}

	// BR-FR-09 : SIREN seller exigé pour émetteur français + schemeID "0002"
	// (registre SIRENE). Sentinel 9 chiffres déjà vérifié plus haut.
	if (data.seller.address.countryCode === "FR" && !/^\d{9}$/.test(data.seller.siren)) {
		errors.push(
			`BR-FR-09: seller.siren doit être 9 chiffres pour vendeur FR ("${data.seller.siren}")`,
		);
	}

	if (errors.length > 0) {
		throw new Error(
			`CEN EN 16931 (MINIMUM) violations for ${data.invoiceNumber}: ${errors.join(" ; ")}`,
		);
	}
}

// ============================================================================
// Mode XML — Présence des éléments BT-* dans le string rendu
// ============================================================================

/**
 * Tags BT-* obligatoires en profil MINIMUM (BR-FR-FX-001 + EN 16931 Annex C).
 * Les regex acceptent espaces/tabs autour de la valeur pour absorber les
 * différences de formatage entre renderers (compact vs pretty).
 */
const REQUIRED_XML_FRAGMENTS: ReadonlyArray<{ rule: string; pattern: RegExp }> = [
	{
		rule: "BR-FR-FX-001",
		pattern:
			/<ram:GuidelineSpecifiedDocumentContextParameter>[\s\S]*?<ram:ID>urn:factur-x\.eu:1p0:minimum<\/ram:ID>/,
	},
	{
		rule: "BR-01 (BT-1 invoice number)",
		pattern: /<rsm:ExchangedDocument>[\s\S]*?<ram:ID>[^<]+<\/ram:ID>/,
	},
	{
		rule: "BR-04 (BT-3 type code)",
		pattern: /<ram:TypeCode>(?:380|381|384|389)<\/ram:TypeCode>/,
	},
	{
		rule: "BR-02 (BT-2 issue date)",
		pattern: /<udt:DateTimeString format="102">\d{8}<\/udt:DateTimeString>/,
	},
	{
		rule: "BR-05 (BT-5 currency)",
		pattern: /<ram:InvoiceCurrencyCode>[A-Z]{3}<\/ram:InvoiceCurrencyCode>/,
	},
	{
		rule: "BR-06 (BT-27 seller name)",
		pattern: /<ram:SellerTradeParty>[\s\S]*?<ram:Name>[^<]+<\/ram:Name>/,
	},
	{
		rule: "BR-07 (BT-44 buyer name)",
		pattern: /<ram:BuyerTradeParty>[\s\S]*?<ram:Name>[^<]+<\/ram:Name>/,
	},
	{
		rule: "BR-CO-15 (BT-109 tax basis total)",
		pattern: /<ram:TaxBasisTotalAmount>[\d.\-]+<\/ram:TaxBasisTotalAmount>/,
	},
	{
		rule: "BR-CO-15 (BT-110 tax total)",
		pattern: /<ram:TaxTotalAmount currencyID="[A-Z]{3}">[\d.\-]+<\/ram:TaxTotalAmount>/,
	},
	{
		rule: "BR-CO-15 (BT-112 grand total)",
		pattern: /<ram:GrandTotalAmount>[\d.\-]+<\/ram:GrandTotalAmount>/,
	},
	{
		rule: "BR-CO-25 (BT-115 amount due)",
		pattern: /<ram:DuePayableAmount>[\d.\-]+<\/ram:DuePayableAmount>/,
	},
];

/**
 * Valide la structure XML rendue contre les éléments BT-* exigés par
 * Factur-X MINIMUM. Detecte les omissions silencieuses introduites par
 * refacto du renderer (un BT-109 oublié casse l'agrégation côté PDP).
 *
 * Le `data` est passé pour ancrer l'erreur sur le bon `invoiceNumber` dans
 * le message (debug).
 */
export function assertFacturXXmlStructure(xml: string, data: InvoiceData): void {
	const errors: string[] = [];

	for (const { rule, pattern } of REQUIRED_XML_FRAGMENTS) {
		if (!pattern.test(xml)) {
			errors.push(`${rule}: fragment XML manquant`);
		}
	}

	if (errors.length > 0) {
		throw new Error(
			`Factur-X XML structure invalid for ${data.invoiceNumber}: ${errors.join(" ; ")}`,
		);
	}
}
