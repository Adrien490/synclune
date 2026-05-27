import type { CustomerType, PaymentMethod } from "@/app/generated/prisma/enums";
import type { TaxCategoryCode } from "@/shared/constants/tax-categories";

/**
 * Objet pivot représentant une facture (ou un avoir) **prête à être rendue**
 * dans n'importe quel format (PDF, Factur-X, UBL, CII).
 *
 * Construit à partir d'un `Order` via `buildInvoiceData()` (modules/invoices/
 * services/build-invoice-data.ts). Une fois construit, l'objet est figé —
 * aucun champ n'est dérivé à la lecture (Art. L102 B LPF : immuabilité de
 * la facture archivée bit-à-bit).
 *
 * Conformité réglementaire :
 *  - Art. 286 CGI (numérotation séquentielle) → `invoiceNumber`
 *  - Art. 289 CGI (mentions obligatoires) → `seller`, `buyer`, `lines`
 *  - EU Directive 2014/55 (Factur-X/UBL/CII) → TVA par ligne + categoryCode
 *  - Art. 272-I CGI (avoir) → variant via `precedingInvoice`
 */
export interface InvoiceData {
	// === IDENTIFIANTS ===
	invoiceNumber: string;
	invoiceFormat: InvoiceFormat;
	issuedAt: Date;
	dueAt: Date | null;
	currency: "EUR";

	// === VENDEUR (snapshot) ===
	seller: SellerInfo;

	// === ACHETEUR (snapshot) ===
	buyer: BuyerInfo;

	// === ADRESSES (figées au checkout) ===
	shippingAddress: StructuredAddress;
	billingAddress: StructuredAddress;

	// === LIGNES ===
	lines: InvoiceLine[];

	// === TOTAUX (recalculés à partir des lignes, pas relus depuis Order) ===
	totals: InvoiceTotals;

	// === PAIEMENT ===
	payment: PaymentInfo;

	// === RÉFÉRENCE FACTURE ORIGINALE (uniquement pour les avoirs) ===
	precedingInvoice: PrecedingInvoiceRef | null;

	// === MÉTADONNÉES ===
	meta: InvoiceMeta;
}

/**
 * Format de rendu cible. Le payload `InvoiceData` est identique pour tous —
 * seul le renderer change (`renderInvoicePdf` / `renderFacturX` / etc.).
 */
export type InvoiceFormat = "PDF" | "FACTURX" | "UBL" | "CII";

export interface SellerInfo {
	legalName: string;
	tradeName: string;
	siren: string;
	siret: string;
	vatNumber: string | null;
	apeCode: string;
	legalForm: string;
	address: StructuredAddress;
	email: string;
	/** Adresse électronique de facturation (annuaire DGFiP) — pour B2B futur. */
	eInvoicingAddress: string | null;
	/** Identifiant de la plateforme agréée émettrice — pour B2B futur. */
	eInvoicingPlatformId: string | null;
	/** Texte mention TVA si franchise (Art. 293 B CGI). */
	vatExemptionText: string | null;
}

export interface BuyerInfo {
	type: CustomerType;
	/** null pour B2C (particulier). */
	legalName: string | null;
	firstName: string;
	lastName: string;
	email: string;
	phone: string | null;
	siren: string | null;
	siret: string | null;
	vatNumber: string | null;
	/** Adresse électronique de facturation (annuaire) — B2B futur. */
	eInvoicingAddress: string | null;
	/** PDP/PA identifier du client — B2B futur. */
	eInvoicingPlatformId: string | null;
	/** Identifiant entité publique pour Chorus Pro — B2G futur. */
	publicEntityId: string | null;
	chorusServiceCode: string | null;
}

export interface StructuredAddress {
	recipientName: string;
	line1: string;
	line2: string | null;
	postalCode: string;
	city: string;
	/** ISO 3166-1 alpha-2 (FR, DE, BE, etc.). */
	countryCode: string;
}

export interface InvoiceLine {
	lineNumber: number;
	productTitle: string;
	productDescription: string | null;
	skuCode: string | null;
	variantInfo: {
		color: string | null;
		material: string | null;
		size: string | null;
	};
	quantity: number;
	/** Prix unitaire HT en centimes. */
	unitPriceExclTax: number;
	/** Remise appliquée à la ligne en centimes. */
	discountAmount: number;
	/** Taux TVA en basis points (2000 = 20.00%). */
	taxRate: number;
	/** Catégorie TVA UNTDID 5305. */
	taxCategoryCode: TaxCategoryCode;
	/** Montant TVA de la ligne en centimes. */
	taxAmount: number;
	/** Total ligne HT en centimes. */
	lineTotalExclTax: number;
	/** Total ligne TTC en centimes. */
	lineTotalInclTax: number;
}

export interface InvoiceTotals {
	subtotalExclTax: number;
	totalDiscount: number;
	shippingExclTax: number;
	shippingTax: number;
	taxBreakdown: TaxBreakdownLine[];
	totalExclTax: number;
	totalTax: number;
	totalInclTax: number;
	totalPaid: number;
	amountDue: number;
}

export interface TaxBreakdownLine {
	rate: number;
	taxableAmount: number;
	taxAmount: number;
	categoryCode: TaxCategoryCode;
	/** Raison d'exonération (texte libre si categoryCode != "S"). */
	exemptionReason: string | null;
}

export interface PaymentInfo {
	method: PaymentMethod;
	paidAt: Date | null;
	stripePaymentIntentId: string | null;
	stripeChargeId: string | null;
}

export interface PrecedingInvoiceRef {
	invoiceNumber: string;
	issuedAt: Date;
	reason: string;
}

export interface InvoiceMeta {
	orderId: string;
	orderNumber: string;
	notes: string | null;
}
