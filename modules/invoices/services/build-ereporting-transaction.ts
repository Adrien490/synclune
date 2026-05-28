import type { EReportingTransactionType, PaymentMethod } from "@/app/generated/prisma/enums";
import type { GetOrderReturn } from "@/modules/orders/types/order.types";

/**
 * Construit le payload d'une `EReportingTransaction` à partir d'un `Order` (SALES)
 * ou d'un `Refund` (REFUND). Fonction pure — aucun I/O, aucun write DB. Le
 * caller (hook après `markOrderAsPaid` / `processRefund`, ou cron de
 * rattrapage) appelle `prisma.eReportingTransaction.create({data: ...})`
 * avec le résultat.
 *
 * Règles invariantes :
 *  - `payloadSnapshot` fige toute l'info DGFiP (montants, devise, pays,
 *    mode de paiement) — l'Order/Refund peut être anonymisé RGPD plus tard
 *    sans rendre la transaction non-transmissible (Art. L102 B LPF).
 *  - `amountIncTax` SIGNÉ : positif pour SALES, négatif pour REFUND. Le
 *    CHECK constraint DB rejette toute incohérence (Phase 3 — EINV-AUDIT-004).
 *  - `countryCode` = pays de livraison snapshot. Si shipping=FR et facturation
 *    différente, on garde FR (pays de la consommation = pays fiscalement
 *    pertinent pour la DGFiP).
 */

interface BuildSalesTransactionInput {
	order: Pick<
		GetOrderReturn,
		| "id"
		| "orderNumber"
		| "paidAt"
		| "total"
		| "subtotal"
		| "taxAmount"
		| "currency"
		| "paymentMethod"
		| "shippingCountry"
		| "customerType"
		| "stripePaymentIntentId"
	>;
}

export interface EReportingTransactionPayload {
	orderId: string | null;
	refundId: string | null;
	type: EReportingTransactionType;
	occurredAt: Date;
	countryCode: string;
	paymentMethod: PaymentMethod;
	amountIncTax: number;
	amountExclTax: number;
	taxAmount: number;
	currency: string;
	payloadSnapshot: PayloadSnapshot;
}

/**
 * Snapshot JSON figé — ce qui sera transmis tel quel à la DGFiP. Schéma
 * volontairement minimal : la DGFiP n'attend que les agrégats, pas les détails
 * lignes (qui appartiennent à la facture, hors scope e-reporting).
 */
export interface PayloadSnapshot {
	orderNumber: string;
	customerType: "B2C" | "B2B" | "B2G";
	occurredAt: string; // ISO 8601
	currency: string;
	amountIncTax: number;
	amountExclTax: number;
	taxAmount: number;
	paymentMethod: PaymentMethod;
	countryCode: string;
	stripePaymentIntentId: string | null;
	// Pour les REFUND : référence à la transaction SALES d'origine
	parentOrderNumber?: string;
	refundReason?: string;
}

/**
 * Pour une `Order` PAID, produit la transaction SALES correspondante.
 * À appeler depuis le hook post-paiement (webhook checkout.session.completed
 * ou payment_intent.succeeded), idempotent côté DB via le compose
 * (orderId, type='SALES') si on ajoute un unique index ultérieurement.
 */
export function buildSalesTransaction(
	input: BuildSalesTransactionInput,
): EReportingTransactionPayload {
	const { order } = input;
	if (!order.paidAt) {
		throw new Error(
			`buildSalesTransaction : Order ${order.orderNumber} n'a pas de paidAt. ` +
				`Appeler uniquement après markOrderAsPaid().`,
		);
	}

	const amountExclTax = order.total - order.taxAmount;

	return {
		orderId: order.id,
		refundId: null,
		type: "SALES",
		occurredAt: order.paidAt,
		countryCode: order.shippingCountry,
		paymentMethod: order.paymentMethod,
		amountIncTax: order.total,
		amountExclTax,
		taxAmount: order.taxAmount,
		currency: order.currency,
		payloadSnapshot: {
			orderNumber: order.orderNumber,
			customerType: order.customerType,
			occurredAt: order.paidAt.toISOString(),
			currency: order.currency,
			amountIncTax: order.total,
			amountExclTax,
			taxAmount: order.taxAmount,
			paymentMethod: order.paymentMethod,
			countryCode: order.shippingCountry,
			stripePaymentIntentId: order.stripePaymentIntentId,
		},
	};
}

interface BuildRefundTransactionInput {
	refund: {
		id: string;
		orderId: string;
		amount: number; // centimes, positif côté Refund (DB)
		currency: string;
		processedAt: Date | null;
		reason: string;
	};
	order: Pick<
		GetOrderReturn,
		"orderNumber" | "paymentMethod" | "shippingCountry" | "customerType" | "stripePaymentIntentId"
	>;
}

/**
 * Pour un `Refund` COMPLETED, produit la transaction REFUND correspondante.
 * Le montant est inversé en signe négatif pour respecter le CHECK constraint
 * (REFUND.amountIncTax < 0).
 *
 * Note : Synclune étant en franchise (TVA = 0), `taxAmount` reste 0 et
 * `amountExclTax` == `amountIncTax`. Cette logique évoluera quand le régime
 * réel sera activé.
 */
export function buildRefundTransaction(
	input: BuildRefundTransactionInput,
): EReportingTransactionPayload {
	const { refund, order } = input;
	if (!refund.processedAt) {
		throw new Error(
			`buildRefundTransaction : Refund ${refund.id} n'a pas de processedAt. ` +
				`Appeler uniquement après finalizeRefund() (status=COMPLETED).`,
		);
	}

	// Franchise art. 293 B : TVA = 0 → exclTax == inclTax. Quand on basculera
	// au régime réel, calculer taxAmount depuis les RefundItems.taxAmount.
	const amountIncTaxNegative = -refund.amount;

	return {
		orderId: null,
		refundId: refund.id,
		type: "REFUND",
		occurredAt: refund.processedAt,
		countryCode: order.shippingCountry,
		paymentMethod: order.paymentMethod,
		amountIncTax: amountIncTaxNegative,
		amountExclTax: amountIncTaxNegative,
		taxAmount: 0,
		currency: refund.currency,
		payloadSnapshot: {
			orderNumber: order.orderNumber,
			customerType: order.customerType,
			occurredAt: refund.processedAt.toISOString(),
			currency: refund.currency,
			amountIncTax: amountIncTaxNegative,
			amountExclTax: amountIncTaxNegative,
			taxAmount: 0,
			paymentMethod: order.paymentMethod,
			countryCode: order.shippingCountry,
			stripePaymentIntentId: order.stripePaymentIntentId,
			parentOrderNumber: order.orderNumber,
			refundReason: refund.reason,
		},
	};
}
