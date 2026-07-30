import { DEFAULT_TAX_CATEGORY, type TaxCategoryCode } from "@/shared/constants/tax-categories";
import { INVOICE_DATA_FORMAT_VERSION } from "@/modules/invoices/constants/invoice-data-format";
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
	items: Array<{
		orderItemId: string;
		quantity: number;
		amount: number;
		orderItem: {
			productTitle: string;
			productDescription: string | null;
			skuSku: string | null;
			skuColor: string | null;
			skuMaterial: string | null;
			skuSize: string | null;
			quantity: number; // quantité initialement facturée
			price: number; // prix unitaire HT (snapshot)
		};
	}>;
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
 *   - `lines` = mapping `RefundItem` → `InvoiceLine` en proratisant le
 *     snapshot OrderItem (quantité remboursée + amount remboursé)
 *   - `totals` = recalculés depuis les lignes du Refund (pas Order.total)
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

	const seller = buildSellerInfo(order);
	const buyer = buildBuyerInfo(order);
	const shippingAddress = buildShippingAddress(order);
	const billingAddress = buildBillingAddress(order, shippingAddress);

	const lines: InvoiceLine[] = refund.items.map((refundItem, index) =>
		buildCreditNoteLine(refundItem, index + 1),
	);

	const totals = buildCreditNoteTotals(lines);

	const precedingInvoice: PrecedingInvoiceRef = {
		invoiceNumber: order.invoiceNumber,
		issuedAt: order.invoiceGeneratedAt,
		reason: refund.reason ? `Remboursement — ${refund.reason}` : "Remboursement client",
	};

	return {
		formatVersion: INVOICE_DATA_FORMAT_VERSION,
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
			stripeChargeId: null,
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
 * Mappe un `RefundItem` (avec son snapshot OrderItem) vers une `InvoiceLine`.
 * La quantité = quantité remboursée. Le total ligne = `refundItem.amount` (déjà
 * proratisé côté create-refund — inclut la part discount). Le détail
 * unitPriceExclTax + taxAmount est recalculé depuis le ratio.
 */
function buildCreditNoteLine(
	refundItem: RefundForCreditNote["items"][number],
	lineNumber: number,
): InvoiceLine {
	// Franchise TVA (Art. 293 B CGI) : aucune TVA par ligne n'est stockée sur
	// l'OrderItem (pas de colonnes taxRate/taxCategoryCode/hsCode/unitCode). Les
	// valeurs sont dérivées intégralement ici, à l'identique de `buildInvoiceLine`
	// côté facture (taux 0, HT = TTC). À la sortie de franchise (régime NORMAL),
	// réintroduire OrderItem.taxRate dans les DEUX chemins (facture + avoir).
	const lineTotalInclTax = refundItem.amount;
	const lineTotalExclTax = lineTotalInclTax;
	const taxAmount = 0;

	return {
		lineNumber,
		productTitle: refundItem.orderItem.productTitle,
		productDescription: refundItem.orderItem.productDescription,
		skuCode: refundItem.orderItem.skuSku,
		variantInfo: {
			color: refundItem.orderItem.skuColor,
			material: refundItem.orderItem.skuMaterial,
			size: refundItem.orderItem.skuSize,
		},
		quantity: refundItem.quantity,
		unitPriceExclTax: refundItem.orderItem.price,
		discountAmount: 0,
		taxRate: 0,
		taxCategoryCode: DEFAULT_TAX_CATEGORY as TaxCategoryCode,
		taxAmount,
		lineTotalExclTax,
		lineTotalInclTax,
		hsCode: null,
		unitCode: null,
	};
}

function buildCreditNoteTotals(lines: InvoiceLine[]): InvoiceTotals {
	const subtotalExclTax = lines.reduce((sum, line) => sum + line.lineTotalExclTax, 0);
	const totalTax = lines.reduce((sum, line) => sum + line.taxAmount, 0);
	const totalInclTax = lines.reduce((sum, line) => sum + line.lineTotalInclTax, 0);

	// Pour un avoir : pas de shipping (le shipping refund est inclus dans
	// `refundItem.amount` côté create-refund, ou n'est pas remboursé du tout).
	const shippingExclTax = 0;
	const shippingTax = 0;

	const taxBreakdown: TaxBreakdownLine[] = buildTaxBreakdown(lines, shippingExclTax, shippingTax);

	return {
		subtotalExclTax,
		totalDiscount: 0,
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
