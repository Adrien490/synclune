import { z } from "zod";
import type {
	EReportingOperationCategory,
	EReportingTransactionType,
	PaymentMethod,
} from "@/app/generated/prisma/client";
import type { GetOrderReturn } from "@/modules/orders/types/order.types";
import type {
	EReportingDailyAggregate,
	EReportingVatLine,
} from "@/modules/invoices/types/invoice-provider";

// ============================================================================
// Ventilation TVA (DORMANT — préparation sortie de franchise). EINV-EREPORT-007.
// ============================================================================
//
// En franchise art. 293 B (TVA = 0), `vatBreakdown` reste null : aucune
// ventilation à déclarer (comportement historique inchangé). À la sortie de
// franchise, les lignes par taux proviendront de la donnée source
// (OrderItem.taxRate/taxAmount, à réintroduire — docs/INVOICING.md L424). AUCUN
// taux n'est codé en dur ici : le format ci-dessous est data-driven.
//
// `rate` en POINTS DE BASE (cohérent avec InvoiceLine.taxRate : 2000 = 20 %).
// `baseExclTax` / `taxAmount` en centimes, SIGNÉS (négatifs pour un REFUND).
const vatBreakdownLineSchema = z.object({
	rate: z.number().int().min(0),
	baseExclTax: z.number().int(),
	taxAmount: z.number().int(),
});

export const vatBreakdownSchema = z.array(vatBreakdownLineSchema);
export type VatBreakdownLine = z.infer<typeof vatBreakdownLineSchema>;

/**
 * Catégorie d'opération par défaut. Synclune vend des biens physiques → GOODS.
 *
 * ⚠️ À CONFIRMER / dériver à la sortie de franchise : un produit atelier/
 * personnalisation relèverait de SERVICES, un panier mixte de MIXED. Tant que
 * le catalogue est 100 % biens, GOODS est exact et n'introduit aucune régression.
 */
export const DEFAULT_OPERATION_CATEGORY: EReportingOperationCategory = "GOODS";

/**
 * Dérive la catégorie d'opération e-reporting d'une commande à partir des
 * catégories de ses lignes (snapshot `OrderItem`/`ProductType.operationCategory`).
 *
 * - 0 ligne → `GOODS` (défaut sûr, réalité Synclune actuelle).
 * - Toutes GOODS → `GOODS` ; toutes SERVICES → `SERVICES`.
 * - Mélange biens+services (ou une ligne déjà MIXED) → `MIXED`.
 *
 * Tant que le catalogue est 100 % biens (toutes les lignes héritent du défaut
 * `GOODS`), renvoie `GOODS` → zéro régression. C'est l'échappatoire (EINV-EREPORT-
 * 007/F3) qui permettra, à la sortie de franchise, de déclarer SERVICES/MIXED sans
 * toucher au hot path : il suffira de taguer un `ProductType` (ex. atelier/
 * personnalisation) en `SERVICES`. L'arbitrage fiscal biens vs services reste
 * **hors code → comptable**.
 */
export function deriveOperationCategory(
	itemCategories: ReadonlyArray<EReportingOperationCategory>,
): EReportingOperationCategory {
	if (itemCategories.length === 0) return DEFAULT_OPERATION_CATEGORY;
	const hasMixed = itemCategories.some((c) => c === "MIXED");
	const hasGoods = itemCategories.some((c) => c === "GOODS");
	const hasServices = itemCategories.some((c) => c === "SERVICES");
	if (hasMixed || (hasGoods && hasServices)) return "MIXED";
	if (hasServices) return "SERVICES";
	return "GOODS";
}

/**
 * Construit la ventilation TVA d'une transaction. DORMANT : tant que la donnée
 * per-taux n'est pas câblée (franchise, `taxAmount === 0`), renvoie null — aucune
 * ligne fictive, snapshot et hash inchangés.
 *
 * À l'activation (régime réel), le caller passe `perRateLines` issues de la
 * donnée source (OrderItem.taxRate/taxAmount). AUCUN taux n'est inféré ici.
 */
export function buildVatBreakdown(
	taxAmount: number,
	perRateLines?: VatBreakdownLine[] | null,
): VatBreakdownLine[] | null {
	if (taxAmount === 0) return null; // franchise art. 293 B
	if (!perRateLines || perRateLines.length === 0) return null;
	return perRateLines;
}

/**
 * Parse une valeur JSON `vatBreakdown` lue en DB en `VatBreakdownLine[]`.
 * Renvoie null pour null/absent/forme invalide (legacy ou corruption — traité
 * comme « pas de ventilation », sans crasher l'agrégation batch).
 */
export function parseVatBreakdown(value: unknown): VatBreakdownLine[] | null {
	if (value == null) return null;
	const parsed = vatBreakdownSchema.safeParse(value);
	if (!parsed.success || parsed.data.length === 0) return null;
	return parsed.data;
}

/**
 * Fusionne plusieurs ventilations (transactions d'un batch) en sommant par taux.
 * Renvoie null si aucune ligne (cas franchise : toutes les entrées sont null).
 * Tri par taux croissant pour une sortie déterministe.
 */
export function mergeVatBreakdowns(
	breakdowns: Array<VatBreakdownLine[] | null>,
): VatBreakdownLine[] | null {
	const byRate = new Map<number, { baseExclTax: number; taxAmount: number }>();
	for (const lines of breakdowns) {
		if (!lines) continue;
		for (const line of lines) {
			const acc = byRate.get(line.rate);
			if (acc) {
				acc.baseExclTax += line.baseExclTax;
				acc.taxAmount += line.taxAmount;
			} else {
				byRate.set(line.rate, { baseExclTax: line.baseExclTax, taxAmount: line.taxAmount });
			}
		}
	}
	if (byRate.size === 0) return null;
	return [...byRate.entries()]
		.map(([rate, v]) => ({ rate, baseExclTax: v.baseExclTax, taxAmount: v.taxAmount }))
		.sort((a, b) => a.rate - b.rate);
}

// ============================================================================
// Couche TRANSMISSION (EINV-EREPORT-010) — dérivation au moment d'émettre vers la
// PA. NE touche PAS aux données stockées (snapshot figé 10 ans, Art. L102 B LPF,
// régression `ereporting-vat-breakdown`). Tout est dérivé des totaux/transactions
// déjà persistés du batch.
// ============================================================================

/**
 * Ventilation par taux de TVA **transmise**. Le référentiel e-reporting impose une
 * ventilation par taux MÊME en franchise (art. 293 B, taux 0). On ne matérialise
 * PAS cette ligne dans le snapshot stocké (forme figée) : on la dérive ici, à
 * l'émission, depuis les totaux déjà calculés du batch.
 *
 *  - Régime réel (ventilation stockée non vide) → transmise telle quelle.
 *  - Franchise (stockée null/vide) → ligne unique `rate: 0` portant tout le HT,
 *    `taxAmount` = total TVA du batch (0 en franchise). AUCUN taux > 0 inventé.
 */
export function toTransmittedVatBreakdown(
	stored: VatBreakdownLine[] | null,
	totalAmountExclTax: number,
	totalTaxAmount: number,
): EReportingVatLine[] {
	if (stored && stored.length > 0) return stored;
	return [{ rate: 0, baseExclTax: totalAmountExclTax, taxAmount: totalTaxAmount }];
}

/**
 * Calcule les agrégats JOURNALIERS d'un batch à partir de ses transactions,
 * groupées par jour UTC de `occurredAt`. Pur, déterministe (tri jour croissant).
 * Sous cadence `DAILY` il y a exactement un jour ; sous `MONTHLY`/`BIMONTHLY` le
 * détail journalier reste présent dans le dépôt agrégé.
 */
export function computeDailyAggregates(
	transactions: ReadonlyArray<{
		occurredAt: Date;
		amountIncTax: number;
		amountExclTax: number;
		taxAmount: number;
	}>,
): EReportingDailyAggregate[] {
	const byDay = new Map<string, EReportingDailyAggregate>();
	for (const t of transactions) {
		const day = t.occurredAt.toISOString().slice(0, 10);
		const acc = byDay.get(day);
		if (acc) {
			acc.transactionCount += 1;
			acc.totalAmountIncTax += t.amountIncTax;
			acc.totalAmountExclTax += t.amountExclTax;
			acc.totalTaxAmount += t.taxAmount;
		} else {
			byDay.set(day, {
				day,
				transactionCount: 1,
				totalAmountIncTax: t.amountIncTax,
				totalAmountExclTax: t.amountExclTax,
				totalTaxAmount: t.taxAmount,
			});
		}
	}
	return [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day));
}

/**
 * Construit le payload d'une `EReportingTransaction` à partir d'un `Order` (SALES)
 * ou d'un `Refund` (REFUND). Fonction pure — aucun I/O, aucun write DB. Le
 * caller (hook après `processOrderFromPaymentIntent` / `processRefund`, ou cron
 * de rattrapage) appelle `prisma.eReportingTransaction.create({data: ...})`
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
		| "taxAmount"
		| "currency"
		| "paymentMethod"
		| "shippingCountry"
		| "customerType"
		| "stripePaymentIntentId"
	>;
	/**
	 * Catégorie d'opération dérivée des lignes de la commande (EINV-EREPORT-007/F3,
	 * cf. `deriveOperationCategory`). Optionnel : défaut `GOODS` si le caller ne la
	 * dérive pas (rétro-compat tests + flux 100 % biens).
	 */
	operationCategory?: EReportingOperationCategory;
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
	// Ventilation TVA par taux (DORMANT) : null en franchise. Persisté en colonne
	// top-level — PAS dans payloadSnapshot (forme figée + hashée, cf. test
	// build-ereporting-snapshot-frozen). L'enrichissement du snapshot transmis
	// fera partie de l'activation, hors scope dormant.
	vatBreakdown: VatBreakdownLine[] | null;
	operationCategory: EReportingOperationCategory;
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
 * ou payment_intent.succeeded). Idempotent au niveau DB via l'unique index
 * `EReportingTransaction_orderId_type_key` (migration 20260528160000).
 */
export function buildSalesTransaction(
	input: BuildSalesTransactionInput,
): EReportingTransactionPayload {
	const { order } = input;
	if (!order.paidAt) {
		throw new Error(
			`buildSalesTransaction : Order ${order.orderNumber} n'a pas de paidAt. ` +
				`Appeler uniquement après l'encaissement (processOrderFromPaymentIntent).`,
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
		// DORMANT : null tant que franchise (order.taxAmount === 0). À l'activation,
		// passer les lignes per-taux dérivées d'OrderItem.taxRate en 2e argument.
		vatBreakdown: buildVatBreakdown(order.taxAmount),
		operationCategory: input.operationCategory ?? DEFAULT_OPERATION_CATEGORY,
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
		| "orderNumber"
		| "paymentMethod"
		| "shippingCountry"
		| "customerType"
		| "stripePaymentIntentId"
		// EINV-GLOBAL-011 — totaux de la commande parente pour dériver la part
		// TVA du remboursement au prorata (au lieu d'un 0 codé en dur).
		| "total"
		| "taxAmount"
	>;
	/**
	 * Catégorie d'opération dérivée des lignes de la commande parente
	 * (EINV-EREPORT-007/F3). Optionnel : défaut `GOODS`. Un avoir hérite de la
	 * catégorie de la vente d'origine.
	 */
	operationCategory?: EReportingOperationCategory;
}

/**
 * Dérive la part TVA (centimes, magnitude positive) d'un remboursement au
 * prorata du taux effectif de la commande parente (EINV-GLOBAL-011).
 *
 * - Franchise art. 293 B (`order.taxAmount === 0`) → 0 : comportement
 *   historique préservé, aucun changement observable tant que Synclune reste en
 *   franchise.
 * - Régime réel (`order.taxAmount > 0`) → `refund.amount × taxAmount / total`,
 *   arrondi, borné à `refund.amount`.
 *
 * ⚠️ À confirmer comptable/fiscalement : l'allocation au prorata du total est
 * une approximation MVP correcte pour un panier mono-taux. Pour un panier
 * multi-taux, la part exacte se calcule depuis `RefundItems.taxAmount` (source
 * à câbler avant la sortie effective de franchise). Tant que le régime est
 * franchise, le résultat est 0 et la question ne se pose pas.
 */
function deriveRefundTaxAmount(
	refundAmount: number,
	orderTotal: number,
	orderTaxAmount: number,
): number {
	if (orderTaxAmount <= 0 || orderTotal <= 0) return 0;
	const proportional = Math.round((refundAmount * orderTaxAmount) / orderTotal);
	return Math.min(proportional, refundAmount);
}

/**
 * Pour un `Refund` COMPLETED, produit la transaction REFUND correspondante.
 * Le montant TTC est inversé en signe négatif pour respecter le CHECK
 * constraint (`REFUND.amountIncTax < 0`). La part TVA (`taxAmount`) reste une
 * magnitude positive (CHECK `taxAmount >= 0`) ; le HT négatif est donc
 * `amountIncTax + taxAmount` (cf. EINV-GLOBAL-011).
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

	const amountIncTaxNegative = -refund.amount;
	// Magnitude positive (CHECK DB `taxAmount >= 0`).
	const refundTaxAmount = deriveRefundTaxAmount(refund.amount, order.total, order.taxAmount);
	// HT négatif = TTC négatif + TVA positive (mirroir signé du SALES HT = TTC - TVA).
	const amountExclTaxNegative = amountIncTaxNegative + refundTaxAmount;

	return {
		orderId: null,
		refundId: refund.id,
		type: "REFUND",
		occurredAt: refund.processedAt,
		countryCode: order.shippingCountry,
		paymentMethod: order.paymentMethod,
		amountIncTax: amountIncTaxNegative,
		amountExclTax: amountExclTaxNegative,
		taxAmount: refundTaxAmount,
		// DORMANT : null tant que franchise (refundTaxAmount === 0). À l'activation,
		// les lignes per-taux d'un avoir se dérivent de RefundItem.taxAmount.
		vatBreakdown: buildVatBreakdown(refundTaxAmount),
		operationCategory: input.operationCategory ?? DEFAULT_OPERATION_CATEGORY,
		currency: refund.currency,
		payloadSnapshot: {
			orderNumber: order.orderNumber,
			customerType: order.customerType,
			occurredAt: refund.processedAt.toISOString(),
			currency: refund.currency,
			amountIncTax: amountIncTaxNegative,
			amountExclTax: amountExclTaxNegative,
			taxAmount: refundTaxAmount,
			paymentMethod: order.paymentMethod,
			countryCode: order.shippingCountry,
			stripePaymentIntentId: order.stripePaymentIntentId,
			parentOrderNumber: order.orderNumber,
			refundReason: refund.reason,
		},
	};
}
