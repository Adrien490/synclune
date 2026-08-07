import type { PaymentMethod } from "@/app/generated/prisma/enums";
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
 * ⚠️ INVARIANT « ENTIERS SEULS » (EINV-PDF-008) — tous les montants/taux/quantités
 * DOIVENT rester des **entiers** (centimes, points de base, unités). Depuis le
 * retrait du snapshot JSONB (2026-08-05), ce n'est plus le round-trip Postgres qui
 * l'impose mais le **rendu déterministe** : `invoicePdfHash` est calculé sur les
 * octets du PDF et re-vérifié à chaque téléchargement (EINV-PDF-006). Un flottant
 * (ex. `5.50`→`5.5`) formaterait différemment d'un build à l'autre, ferait diverger
 * le PDF régénéré de son archive et lèverait
 * `InvoiceSnapshotIntegrityError` (503) sur TOUTES les factures concernées.
 * Un taux fractionnaire doit être encodé en points de base entiers (5,5 % = `550`).
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

	// === ANNULATION (EINV-SEC-007) — uniquement si la facture a été annulée ===
	// Présent quand `Order.invoiceStatus === "VOIDED"`. Force le renderer à
	// dessiner un bandeau "ANNULÉE — Avoir A-YYYY-NNNNN" en première page (Art. 272-I
	// CGI : un avoir doit identifier sans ambiguïté la facture annulée).
	voidedInfo: VoidedInfo | null;

	// === MÉTADONNÉES ===
	meta: InvoiceMeta;
}

export interface VoidedInfo {
	/** Numéro d'avoir associé (`A-YYYY-NNNNN`). */
	creditNoteNumber: string;
	/** Date à laquelle la facture a été annulée. */
	voidedAt: Date;
}

/**
 * Format de rendu cible (métadonnée pivot informative — ne pilote PAS le
 * routage : le renderer PDF est appelé explicitement et branche sur le préfixe
 * `A-` pour distinguer facture/avoir).
 *
 * Synclune (micro-entreprise franchise TVA, B2C) ne produit que du **PDF**. Les
 * formats XML structurés (Factur-X / UBL / CII), réservés à la transmission
 * B2B/B2G sur PDP, ont été retirés (recentrage B2C 2026-05-28).
 *
 * Le type était resté un union de 4 valeurs « pour compat de signature », mais aucun
 * appelant ne passait autre chose que `"PDF"` et aucun renderer n'existe pour les 3
 * autres : le schéma Zod ACCEPTAIT donc `format: "FACTURX"` pour produire… un PDF.
 * Restreint à `"PDF"` — c'est le seul format réellement rendu. À réélargir le jour où
 * un renderer XML existe (go-live e-reporting), pas avant.
 *
 * ⚠️ Narrowing de TYPE uniquement : ni la forme de l'objet ni l'ordre des champs ne
 * changent, donc les PDF archivés restent inchangés.
 */
export type InvoiceFormat = "PDF";

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
	/** Texte mention TVA si franchise (Art. 293 B CGI). */
	vatExemptionText: string | null;
	/** IBAN du vendeur (BT-84 EN16931) — affiché sur factures B2B viré. */
	bankIban: string | null;
	/** BIC/SWIFT du vendeur (BT-86 EN16931). */
	bankBic: string | null;
}

/**
 * Identité de l'acheteur figée sur la facture (Art. 289 CGI).
 *
 * Synclune vend exclusivement en B2C : `legalName`, `siret` et `vatNumber` sont
 * toujours `null` à l'émission. Ils sont conservés parce que le renderer les lit
 * (`render-invoice-pdf.ts`, branches gardées par `if`) : si un parcours B2B
 * apparaît un jour, la facture porte déjà l'identité société sans toucher au
 * template. Les identifiants de routage e-reporting (adresse électronique de
 * facturation, PDP/PA, Chorus Pro) ont été retirés avec l'e-reporting — ils
 * seront réintroduits contre l'arrêté définitif.
 */
export interface BuyerInfo {
	/** null pour B2C (particulier). */
	legalName: string | null;
	firstName: string;
	lastName: string;
	email: string;
	phone: string | null;
	siret: string | null;
	vatNumber: string | null;
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
	variantInfo: {
		color: string | null;
		material: string | null;
		size: string | null;
	};
	quantity: number;
	/** Prix unitaire HT en centimes. */
	unitPriceExclTax: number;
	/** Remise appliquée à la ligne en centimes. */
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
	/** Code SH OMD (6-10 chiffres) — BT-156 Factur-X BASIC/EN16931. Optionnel. */
	hsCode: string | null;
	/** Code unite UN/ECE Rec 20 (H87 = piece) — BG-25 line item quantity unit. Optionnel. */
	unitCode: string | null;
}

export interface InvoiceTotals {
	subtotalExclTax: number;
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

interface PaymentInfo {
	method: PaymentMethod;
	paidAt: Date | null;
	stripePaymentIntentId: string | null;
}

export interface PrecedingInvoiceRef {
	invoiceNumber: string;
	issuedAt: Date;
	reason: string;
}

interface InvoiceMeta {
	orderId: string;
	orderNumber: string;
	notes: string | null;
}
