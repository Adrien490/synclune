import { getVendorLegalInfo } from "@/shared/lib/stripe";
import { DEFAULT_FRANCHISE_VAT_MENTION } from "@/shared/constants/vat-franchise";
import { normalizeFiscalIdentifier } from "@/shared/schemas/b2b-identifiers.schema";
import {
	DEFAULT_TAX_CATEGORY,
	type TaxCategoryCode,
	TAX_CATEGORY_CODES,
} from "@/shared/constants/tax-categories";
import type { GetOrderReturn } from "@/modules/orders/types/order.types";
import type {
	InvoiceData,
	InvoiceFormat,
	InvoiceLine,
	InvoiceTotals,
	SellerInfo,
	BuyerInfo,
	StructuredAddress,
	TaxBreakdownLine,
	PrecedingInvoiceRef,
	VoidedInfo,
} from "../types/invoice-data";

/**
 * Construit l'objet pivot `InvoiceData` à partir d'un `Order` Prisma.
 *
 * Règles invariantes :
 *  - **Snapshot pur** : aucun champ n'est rechargé live depuis la DB, tout
 *    vient du payload `Order` fourni par l'appelant (Art. L102 B LPF —
 *    facture reconstituable à l'identique).
 *  - **Totaux recalculés** depuis les lignes (pas relus depuis Order). Si
 *    l'addition diverge de `Order.total`, c'est un bug dans le checkout ;
 *    le renderer doit le détecter via le Zod refine de `invoiceDataSchema`.
 *  - **Pas de fallback magique** : un Order sans `invoiceNumber` lève. La
 *    génération du numéro est la responsabilité de `persistInvoiceNumber`
 *    en amont (webhook eager / lazy fallback dans la route /invoice).
 *
 * Pour les avoirs, appeler `buildCreditNoteData(order, refund)` (à venir
 * en Phase 2B+ une fois `voidInvoice` migré vers Refund).
 */

interface BuildInvoiceDataOptions {
	/** Format de rendu cible. Défaut "PDF". */
	format?: InvoiceFormat;
	/** Référence à la facture précédente quand l'objet construit est un avoir. */
	precedingInvoice?: PrecedingInvoiceRef | null;
}

export function buildInvoiceData(
	order: GetOrderReturn,
	options: BuildInvoiceDataOptions = {},
): InvoiceData {
	if (!order.invoiceNumber) {
		throw new Error(
			`buildInvoiceData : Order ${order.orderNumber} n'a pas de invoiceNumber. ` +
				`Appeler persistInvoiceNumber() d'abord.`,
		);
	}
	if (!order.invoiceGeneratedAt) {
		throw new Error(
			`buildInvoiceData : Order ${order.orderNumber} a un invoiceNumber mais pas de ` +
				`invoiceGeneratedAt. Etat incoherent — verifier la migration des donnees.`,
		);
	}

	const { format = "PDF", precedingInvoice = null } = options;

	const seller = buildSellerInfo();
	const buyer = buildBuyerInfo(order);
	const shippingAddress = buildShippingAddress(order);
	const billingAddress = buildBillingAddress(shippingAddress);
	const lines = order.items.map((item, index) => buildInvoiceLine(item, index + 1));
	const totals = buildTotals(order, lines);
	const voidedInfo = buildVoidedInfo(order);

	return {
		invoiceNumber: order.invoiceNumber,
		invoiceFormat: format,
		issuedAt: order.invoiceGeneratedAt,
		dueAt: null, // paiement immédiat Stripe — pas d'échéance
		currency: "EUR",
		seller,
		buyer,
		shippingAddress,
		billingAddress,
		lines,
		totals,
		payment: {
			method: order.paymentMethod,
			paidAt: order.paidAt,
			// `?? null` obligatoire : ce builder est appelé sur deux formes d'order.
			// `GET_ORDER_SELECT_CUSTOMER` exclut délibérément l'identifiant Stripe
			// (minimisation RGPD), et les chemins de RENDU chargent avec ce select puis
			// CASTENT en `GetOrderReturn` — la propriété est alors absente, `undefined`,
			// alors que le type promet `string | null`. Sans coalescing,
			// `invoiceDataSchema` (`z.string().nullable()`, qui REJETTE `undefined`)
			// échouerait sur ce chemin, et la clé disparaîtrait du payload.
			stripePaymentIntentId: order.stripePaymentIntentId ?? null,
		},
		precedingInvoice,
		voidedInfo,
		meta: {
			orderId: order.id,
			orderNumber: order.orderNumber,
			notes: null,
		},
	};
}

/**
 * EINV-SEC-007 : si la facture a été annulée (`invoiceStatus === "VOIDED"`)
 * et que les colonnes d'avoir sont remplies, on construit `voidedInfo`. Le
 * renderer s'en sert pour estampiller le PDF. Si les colonnes manquent (cas
 * historique pré-fix), on tombe sur `null` — le PDF n'aura pas le bandeau
 * (best-effort, mieux qu'une erreur).
 */
function buildVoidedInfo(order: GetOrderReturn): VoidedInfo | null {
	if (order.invoiceStatus !== "VOIDED") return null;
	// La date d'annulation, c'est celle de l'avoir qui la porte : `invoiceVoidedAt`
	// a été retirée (2026-08-05), elle recevait la MÊME valeur dans le MÊME update.
	if (!order.creditNoteNumber || !order.creditNoteGeneratedAt) return null;
	return {
		creditNoteNumber: order.creditNoteNumber,
		voidedAt: order.creditNoteGeneratedAt,
	};
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Construit le SellerInfo depuis l'identite vendeur courante (env).
 *
 * ⚠️ Depuis le retrait du snapshot de donnees (2026-08-05), cette fonction lit
 * TOUJOURS l'env COURANT. L'identite vendeur d'une facture emise n'est donc figee
 * que dans le PDF ARCHIVE, imprime a l'emission. Corollaire : une regeneration est
 * un depannage, jamais l'original — et l'archivage n'est pas optionnel (cf. la
 * passe derivee `invoiceNumber != null AND invoicePdfUrl == null` de
 * `reconcile-invoices`). Cf. invariant 10 de CLAUDE.md.
 *
 * Les 12 colonnes `Order.vendor*` qui doublaient ce calcul en base sont parties le
 * 2026-08-05 : leur unique lecteur etait le backfill des factures anterieures au
 * snapshot, un cas qui ne peut plus se produire puisque numero et snapshot sont
 * ecrits dans le meme UPDATE. Les reintroduire n'aurait de sens que si le snapshot
 * cessait d'etre pose a l'emission.
 */
export function buildSellerInfo(): SellerInfo {
	const vendor = getVendorLegalInfo();
	const legalName = vendor.company_legal_name;
	return {
		legalName,
		tradeName: vendor.company_trade_name,
		siren: normalizeFiscalIdentifier(vendor.company_siren) ?? "",
		siret: normalizeFiscalIdentifier(vendor.company_siret) ?? "",
		vatNumber: normalizeFiscalIdentifier(vendor.company_vat),
		apeCode: vendor.company_ape,
		legalForm: vendor.company_legal_form,
		address: parseVendorAddress(vendor.company_address, legalName),
		email: vendor.company_email,
		// EINV-F4 : la mention 293 B est DÉRIVÉE du régime (pas d'un flag
		// indépendant). En franchise on garantit un libellé non vide (fallback SSOT)
		// — jamais de mention manquante figée 10 ans (Art. L102 B LPF). Hors
		// franchise (NORMAL/SIMPLIFIE), pas de mention d'exonération.
		vatExemptionText: isFranchiseRegime(vendor.company_vat_regime)
			? vendor.vat_exemption.trim() || DEFAULT_FRANCHISE_VAT_MENTION
			: null,
		bankIban: normalizeIban(vendor.bank_iban),
		bankBic: normalizeBic(vendor.bank_bic),
	};
}

/**
 * Toute valeur d'env autre que `NORMAL`/`SIMPLIFIE` vaut franchise : un env mal
 * renseigné doit produire la mention plutôt que de l'omettre en silence.
 */
function isFranchiseRegime(raw: string): boolean {
	return raw !== "NORMAL" && raw !== "SIMPLIFIE";
}

function normalizeIban(raw: string | null): string | null {
	if (!raw) return null;
	return raw.replace(/\s+/g, "").toUpperCase();
}

function normalizeBic(raw: string | null): string | null {
	if (!raw) return null;
	return raw.replace(/\s+/g, "").toUpperCase();
}

/**
 * Parse une adresse vendeur "rue, postalCode city, country" en `StructuredAddress`.
 * Format actuel : "77 Boulevard du Tertre, 44100 Nantes, France".
 */
function parseVendorAddress(raw: string, recipientName: string): StructuredAddress {
	const parts = raw.split(",").map((p) => p.trim());
	const line1 = parts[0] ?? raw;
	const cityPart = parts[1] ?? "";
	const postalMatch = cityPart.match(/^(\d{4,10})\s+(.+)$/);
	return {
		recipientName,
		line1,
		line2: null,
		postalCode: postalMatch?.[1] ?? "",
		city: postalMatch?.[2] ?? cityPart,
		countryCode: "FR",
	};
}

export function buildBuyerInfo(order: GetOrderReturn): BuyerInfo {
	const { firstName, lastName } = splitCustomerName(order.customerName);
	// Synclune vend exclusivement en B2C (particuliers) : aucun identifiant
	// société n'est capturé au checkout.
	return {
		legalName: null,
		firstName,
		lastName,
		email: order.customerEmail,
		// Le téléphone du client vient du snapshot d'adresse : `Order.customerPhone`
		// a été retirée le 2026-08-04, elle n'était jamais renseignée au checkout.
		phone: order.shippingPhone,
		siret: null,
		vatNumber: null,
	};
}

/**
 * Split "Prénom Nom" → { firstName, lastName }. Fallback gracieux : si pas
 * d'espace, on met tout dans firstName et lastName="-" pour respecter la
 * contrainte min(1) du schema (recipientName ne doit pas être vide).
 */
function splitCustomerName(fullName: string): { firstName: string; lastName: string } {
	const trimmed = fullName.trim();
	const spaceIndex = trimmed.indexOf(" ");
	if (spaceIndex === -1) {
		return { firstName: trimmed || "-", lastName: "-" };
	}
	return {
		firstName: trimmed.slice(0, spaceIndex),
		lastName: trimmed.slice(spaceIndex + 1) || "-",
	};
}

export function buildShippingAddress(order: GetOrderReturn): StructuredAddress {
	return {
		recipientName: `${order.shippingFirstName} ${order.shippingLastName}`.trim(),
		line1: order.shippingAddress1,
		line2: order.shippingAddress2,
		postalCode: order.shippingPostalCode,
		city: order.shippingCity,
		countryCode: order.shippingCountry,
	};
}

/**
 * Adresse imprimée sous « Facturé à » (Art. 242 nonies A ann. II CGI : nom
 * complet et adresse du client).
 *
 * En B2C de vente à distance, l'acheteuse se fait livrer chez elle : son adresse
 * de facturation EST son adresse de livraison. Les 9 colonnes `Order.billing*`
 * qui permettaient de les dissocier ont été retirées le 2026-08-04 — elles
 * n'étaient renseignées sur AUCUNE commande réelle : leur seul writer était une
 * action admin qui se verrouille dès `invoiceNumber !== null`, or la facture est
 * émise dans les secondes suivant le paiement (webhook `payment_intent.succeeded`
 * → `ensureInvoiceNumberPersisted`). La fenêtre d'édition valait zéro.
 *
 * ⚠️ CONDITION DE RÉOUVERTURE, DATÉE. L'art. 242 nonies A ann. II CGI demande
 * deux choses distinctes : l'adresse du CLIENT (1°) et, « si elle est différente
 * de l'adresse du client », l'adresse de LIVRAISON (7° bis). Tant que l'acheteuse
 * se fait livrer chez elle les deux coïncident et une seule suffit. Dès qu'une
 * commande part chez un tiers (cadeau), les deux mentions fusionnent ici et le 1°
 * n'est plus satisfait — ce défaut existe à l'identique AVANT et APRÈS le retrait
 * des colonnes, qui n'étaient jamais renseignées.
 *
 * En format structuré (Factur-X/UBL/CII), l'adresse de livraison occupe les
 * BT-75→79, un bloc SÉPARÉ de l'adresse acheteur : la plateforme agréée ne peut
 * pas dériver l'un de l'autre. À traiter avant l'obligation d'émission +
 * e-reporting B2C du **1er septembre 2027**, et de toute façon le jour où les
 * commandes cadeau cessent d'être marginales. Le chantier est alors : capter
 * l'adresse de l'acheteuse AU CHECKOUT, puis la porter ici. Ne pas ré-ajouter
 * les colonnes sans ce champ de saisie — ce serait recréer exactement l'état
 * qu'on vient de retirer.
 */
export function buildBillingAddress(shippingAddress: StructuredAddress): StructuredAddress {
	return shippingAddress;
}

function buildInvoiceLine(item: GetOrderReturn["items"][number], lineNumber: number): InvoiceLine {
	// Franchise TVA (Art. 293 B CGI) : taux et montant TVA toujours nuls, total
	// ligne = prix unitaire HT × quantité (HT = TTC). Aucune TVA par ligne n'est
	// stockée — elle se dérive intégralement ici.
	const lineTotal = item.price * item.quantity;
	return {
		lineNumber,
		productTitle: item.productTitle,
		variantInfo: {
			color: item.skuColor,
			material: item.skuMaterial,
			size: item.skuSize,
		},
		quantity: item.quantity,
		unitPriceExclTax: item.price,
		taxRate: 0,
		taxCategoryCode: DEFAULT_TAX_CATEGORY as TaxCategoryCode,
		taxAmount: 0,
		lineTotalExclTax: lineTotal,
		lineTotalInclTax: lineTotal,
		hsCode: null,
		unitCode: null,
	};
}

function buildTotals(order: GetOrderReturn, lines: InvoiceLine[]): InvoiceTotals {
	const subtotalExclTax = lines.reduce((sum, line) => sum + line.lineTotalExclTax, 0);
	const totalTaxFromLines = lines.reduce((sum, line) => sum + line.taxAmount, 0);
	const totalInclTax = order.total;
	const shippingExclTax = order.shippingCost;
	const shippingTax = 0; // franchise — pas de TVA sur livraison non plus
	const totalTax = totalTaxFromLines + shippingTax;
	const totalExclTax = totalInclTax - totalTax;

	const taxBreakdown: TaxBreakdownLine[] = buildTaxBreakdown(lines, shippingExclTax, shippingTax);

	return {
		subtotalExclTax,
		shippingExclTax,
		shippingTax,
		taxBreakdown,
		totalExclTax,
		totalTax,
		totalInclTax,
		totalPaid: totalInclTax, // Stripe encaisse l'intégralité
		amountDue: 0,
	};
}

/**
 * Agrège les lignes par (taux, catégorie) pour produire le breakdown TVA
 * affiché en pied de facture et exigé par Factur-X (BT-117 + BT-119).
 */
export function buildTaxBreakdown(
	lines: InvoiceLine[],
	shippingExclTax: number,
	shippingTax: number,
): TaxBreakdownLine[] {
	const map = new Map<string, TaxBreakdownLine>();

	for (const line of lines) {
		const key = `${line.taxRate}|${line.taxCategoryCode}`;
		const existing = map.get(key);
		if (existing) {
			existing.taxableAmount += line.lineTotalExclTax;
			existing.taxAmount += line.taxAmount;
		} else {
			map.set(key, {
				rate: line.taxRate,
				taxableAmount: line.lineTotalExclTax,
				taxAmount: line.taxAmount,
				categoryCode: line.taxCategoryCode,
				exemptionReason:
					line.taxCategoryCode === TAX_CATEGORY_CODES.EXEMPT_FRANCHISE
						? "Franchise art. 293 B CGI"
						: null,
			});
		}
	}

	// Inclure le shipping dans la même catégorie que les lignes (ou ZB par défaut).
	if (shippingExclTax > 0) {
		const shippingCategory = lines[0]?.taxCategoryCode ?? (DEFAULT_TAX_CATEGORY as TaxCategoryCode);
		const key = `${0}|${shippingCategory}`;
		const existing = map.get(key);
		if (existing) {
			existing.taxableAmount += shippingExclTax;
			existing.taxAmount += shippingTax;
		} else {
			map.set(key, {
				rate: 0,
				taxableAmount: shippingExclTax,
				taxAmount: shippingTax,
				categoryCode: shippingCategory,
				exemptionReason:
					shippingCategory === TAX_CATEGORY_CODES.EXEMPT_FRANCHISE
						? "Franchise art. 293 B CGI"
						: null,
			});
		}
	}

	return Array.from(map.values());
}
