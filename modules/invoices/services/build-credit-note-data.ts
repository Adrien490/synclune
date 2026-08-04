import { DEFAULT_TAX_CATEGORY, type TaxCategoryCode } from "@/shared/constants/tax-categories";
import type { GetOrderReturn } from "@/modules/orders/types/order.types";
import type {
	InvoiceData,
	InvoiceFormat,
	InvoiceLine,
	InvoiceTotals,
	PrecedingInvoiceRef,
	TaxBreakdownLine,
} from "../types/invoice-data";
import {
	buildSellerInfo,
	buildBuyerInfo,
	buildShippingAddress,
	buildBillingAddress,
	buildTaxBreakdown,
} from "./build-invoice-data";

/**
 * Représentation minimale d'un Refund pour l'émission d'un avoir comptable.
 * Les `items` portent les snapshots OrderItem (titre, sku, taux TVA) déjà
 * disponibles côté DB — la fonction ne refait pas de lookup.
 */
export interface RefundForCreditNote {
	id: string;
	amount: number;
	reason: string | null;
	creditNoteNumber: string;
	creditNoteGeneratedAt: Date;
}

interface BuildCreditNoteDataOptions {
	format?: InvoiceFormat;
}

/**
 * Construit le payload pivot pour un AVOIR rattaché à un Refund.
 *
 * Différences avec `buildInvoiceData()` :
 *   - `invoiceNumber` = `refund.creditNoteNumber` (A-YYYY-NNNNN)
 *   - `issuedAt` = `refund.creditNoteGeneratedAt`
 *   - `lines` = UNE ligne au montant remboursé (cf. `buildCreditNoteLine`)
 *   - `totals` = recalculés depuis cette ligne (pas Order.total)
 *   - `precedingInvoice` = référence à la facture originale (Art. 272-I CGI)
 *   - `voidedInfo` = `null` (un avoir ne se "void" pas lui-même ; seul un
 *     avoir-correctif rare l'invalide, hors scope MVP)
 *
 * Convention de signe : les montants restent **positifs** dans le payload
 * (cohérent EN16931 + Factur-X TypeCode 381). Le renderer PDF affiche un
 * préfixe "-" ou la mention "AVOIR" pour signaler le sens comptable.
 *
 * Cf. audit avoirs 2026-05-28 — EINV-CREDIT-012.
 */
export function buildCreditNoteData(
	order: GetOrderReturn,
	refund: RefundForCreditNote,
	options: BuildCreditNoteDataOptions = {},
): InvoiceData {
	if (!order.invoiceNumber || !order.invoiceGeneratedAt) {
		throw new Error(
			`buildCreditNoteData : Order ${order.orderNumber} n'a pas de facture originale ` +
				`(invoiceNumber/invoiceGeneratedAt manquants). Émission avoir impossible.`,
		);
	}
	if (!refund.creditNoteNumber) {
		throw new Error(
			`buildCreditNoteData : Refund ${refund.id} n'a pas de creditNoteNumber. ` +
				`Appeler issueCreditNoteForRefund() d'abord.`,
		);
	}

	const { format = "PDF" } = options;

	const seller = buildSellerInfo();
	const buyer = buildBuyerInfo(order);
	const shippingAddress = buildShippingAddress(order);
	const billingAddress = buildBillingAddress(shippingAddress);

	const lines: InvoiceLine[] = [buildCreditNoteLine(refund, order.invoiceNumber)];

	const totals = buildCreditNoteTotals(lines);

	const precedingInvoice: PrecedingInvoiceRef = {
		invoiceNumber: order.invoiceNumber,
		issuedAt: order.invoiceGeneratedAt,
		reason: refund.reason ? `Remboursement — ${refund.reason}` : "Remboursement client",
	};

	return {
		invoiceNumber: refund.creditNoteNumber,
		invoiceFormat: format,
		issuedAt: refund.creditNoteGeneratedAt,
		dueAt: null,
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
			stripePaymentIntentId: order.stripePaymentIntentId,
			// `?? null` obligatoire, cf. la note détaillée dans `buildInvoiceData` :
			// l'UNIQUE appelant (`renderRefundCreditNotePdf`) charge l'order en
			// `GET_ORDER_SELECT_CUSTOMER` puis le caste en `GetOrderReturn`. La propriété
			// est donc absente au runtime, et sans coalescing la clé disparaîtrait du
			// JSON. Le PDF d'avoir est hashé (`Refund.creditNotePdfHash`, Art. L102 B
			// LPF) : sa forme de données doit rester stable, et elle l'est ici — cette
			// valeur reste `null`, identique à ce qu'elle valait avant la migration.
			stripeChargeId: order.stripeChargeId ?? null,
		},
		precedingInvoice,
		voidedInfo: null,
		meta: {
			orderId: order.id,
			orderNumber: order.orderNumber,
			notes: `Avoir rattaché au remboursement ${refund.id}.`,
		},
	};
}

/**
 * Construit l'UNIQUE ligne de l'avoir : le montant réellement remboursé, rattaché
 * à la facture d'origine.
 *
 * ⚠️ Ce n'est pas une simplification cosmétique, c'est une CORRECTION (2026-08-05).
 * L'ancienne version dépliait les `RefundItem` produits par
 * `allocateDashboardRefundItems`, qui répartissait le montant au pro-rata en
 * gardant `quantity` = quantité commandée ENTIÈRE. Sur un remboursement partiel,
 * la ligne imprimée affichait donc `2 × 30,00 €` pour un total de `20,00 €` —
 * une ligne qui ne s'additionne pas, figée sous SHA-256 pour dix ans
 * (Art. L102 B LPF). L'itemisation était en outre FABRIQUÉE : depuis le passage
 * Stripe-first (Lot 2), on rembourse un MONTANT, jamais des lignes — rien ne dit
 * quel article est remboursé.
 *
 * Un avoir n'a pas d'obligation de détailler les articles : il doit référencer la
 * facture qu'il corrige et porter le montant (Art. 272-I CGI). C'est ce que fait
 * cette ligne, et elle a le mérite d'être vraie.
 */
function buildCreditNoteLine(
	refund: RefundForCreditNote,
	originalInvoiceNumber: string,
): InvoiceLine {
	// Franchise TVA (Art. 293 B CGI) : aucune TVA par ligne — HT = TTC, taux 0.
	// À la sortie de franchise (régime NORMAL), réintroduire le taux dans les DEUX
	// chemins (facture + avoir).
	const lineTotal = refund.amount;

	return {
		lineNumber: 1,
		productTitle: `Remboursement sur facture ${originalInvoiceNumber}`,
		variantInfo: { color: null, material: null, size: null },
		quantity: 1,
		unitPriceExclTax: lineTotal,
		taxRate: 0,
		taxCategoryCode: DEFAULT_TAX_CATEGORY as TaxCategoryCode,
		taxAmount: 0,
		lineTotalExclTax: lineTotal,
		lineTotalInclTax: lineTotal,
		hsCode: null,
		unitCode: null,
	};
}

function buildCreditNoteTotals(lines: InvoiceLine[]): InvoiceTotals {
	const subtotalExclTax = lines.reduce((sum, line) => sum + line.lineTotalExclTax, 0);
	const totalTax = lines.reduce((sum, line) => sum + line.taxAmount, 0);
	const totalInclTax = lines.reduce((sum, line) => sum + line.lineTotalInclTax, 0);

	// Pour un avoir : pas de ligne de port distincte — `refund.amount` est le
	// montant remboursé toutes causes confondues (articles et/ou livraison).
	const shippingExclTax = 0;
	const shippingTax = 0;

	const taxBreakdown: TaxBreakdownLine[] = buildTaxBreakdown(lines, shippingExclTax, shippingTax);

	return {
		subtotalExclTax,
		shippingExclTax,
		shippingTax,
		taxBreakdown,
		totalExclTax: subtotalExclTax,
		totalTax,
		totalInclTax,
		// Pour un avoir : le montant "payé" est le montant remboursé au client.
		totalPaid: totalInclTax,
		amountDue: 0,
	};
}
