import type Stripe from "stripe";
import * as Sentry from "@sentry/nextjs";
import { logger } from "@/shared/lib/logger";
import {
	type Prisma,
	type PaymentMethod,
	type OrderStatus,
	type PaymentStatus,
	HistorySource,
	OrderAction,
} from "@/app/generated/prisma/client";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { DEFAULT_CURRENCY } from "@/shared/constants/currency";
import { TX_TIMEOUT_LONG, TX_MAX_WAIT_LONG } from "@/shared/lib/prisma-tx-options";
import { createOrderAuditTx } from "@/modules/orders/utils/order-audit";
import { acquireOrderPaidLockTx } from "@/modules/orders/utils/order-paid-lock";
import {
	selectDeactivatableSkuIds,
	type DeactivationCandidate,
} from "@/modules/skus/services/validate-public-active-sku.service";
import type { OrderWithItems } from "../types/checkout.types";
import { initiateAutomaticRefund } from "./payment-intent.service";

/**
 * ORD-BIZ-011 : custom error thrown when a `payment_intent.succeeded` webhook
 * arrives APRÈS que l'admin (ou un cron) a déjà annulé la commande. Le caller
 * (checkout.service.ts) catch et skip invoice/email chain — l'auto-refund est
 * déjà initié de manière idempotente.
 */
export class CancelledOrderRaceError extends Error {
	constructor(public readonly orderId: string) {
		super(`Order ${orderId} cancelled — auto-refund initié, paiement Stripe non finalisé`);
		this.name = "CancelledOrderRaceError";
	}
}

/**
 * ORD-STRIPE-009 : thrown when the post-payment FOR UPDATE re-validation finds a
 * SKU oversold (stock insuffisant / SKU désactivé / produit retiré) — typiquement
 * le perdant d'une race sur le dernier exemplaire (réservation optimiste :
 * `order-creation.service.ts` ne décrémente pas, deux checkouts concurrents
 * passent tous deux la vérif). Le paiement Stripe est DÉJÀ encaissé pour cette
 * commande. Le caller (`handlePaymentSuccess`) catch ce type pour déclencher un
 * remboursement automatique + marquer la commande FAILED au lieu de rethrow-pour-
 * retry-Stripe-infini (le stock ne reviendra pas → retry inutile et nuisible).
 */
export class OversellError extends Error {
	constructor(
		public readonly orderId: string,
		public readonly skuId: string,
		public readonly reason: string,
	) {
		super(`Oversell on order ${orderId}: ${reason} (SKU: ${skuId})`);
		this.name = "OversellError";
	}
}

/**
 * P2-1 (audit 2026-05-30) : levée quand la garde post-paiement trouve que Stripe
 * a encaissé MOINS que `order.total`. Défense en profondeur — `confirmCheckout`
 * pose le montant du PI à `order.total` avant la capture, donc ce cas ne devrait
 * jamais survenir au happy-path. S'il survient (régression amont, ou confirmation
 * client hors-ordre à un montant minoré), le client a été débité d'un montant
 * inférieur au total : la commande ne DOIT PAS passer PAID. Le caller
 * (`handlePaymentSuccess`) catch ce type pour rembourser automatiquement le
 * montant encaissé + marquer la commande FAILED + alerter l'admin, au lieu de
 * rethrow-pour-retry-Stripe-infini (le montant ne se corrigera pas tout seul →
 * retry inutile et nuisible). Calque OversellError.
 */
export class AmountMismatchError extends Error {
	constructor(
		public readonly orderId: string,
		public readonly expectedTotal: number,
		public readonly amountReceived: number,
	) {
		super(
			`Amount mismatch on order ${orderId}: Stripe received ${amountReceived} but order.total is ${expectedTotal}`,
		);
		this.name = "AmountMismatchError";
	}
}

/**
 * ORD-BIZ-011 : détection pré-transaction d'un payment_intent.succeeded tardif
 * sur commande CANCELLED. Déclenche un auto-refund Stripe idempotent et throw
 * pour que le caller skip toute mutation/chain post-paiement.
 */
async function detectCancelledOrderRace(
	orderId: string,
	paymentIntentId: string,
	flowLabel: string,
	amountReceivedCents?: number,
): Promise<void> {
	const order = await prisma.order.findUnique({
		where: { id: orderId, ...notDeleted },
		select: { id: true, orderNumber: true, status: true },
	});
	if (!order || order.status !== "CANCELLED") return;

	logger.warn(
		`[WEBHOOK] Late payment_intent.succeeded for already-CANCELLED order ${orderId} (${flowLabel}) — auto-refunding`,
		{ service: "webhook", orderId, paymentIntentId },
	);

	Sentry.withScope((scope) => {
		scope.setLevel("warning");
		scope.setTag("payments", "cancel-vs-webhook-race");
		scope.setContext("order", { orderId, orderNumber: order.orderNumber });
		Sentry.captureMessage(
			`Late payment confirmation on cancelled order ${order.orderNumber} — auto-refund triggered`,
			"warning",
		);
	});

	await initiateAutomaticRefund(
		paymentIntentId,
		orderId,
		"cancelled-before-confirmation",
		amountReceivedCents,
	);
	throw new CancelledOrderRaceError(orderId);
}

/**
 * Maps a Prisma order to OrderWithItems.
 * Avoids dangerous type assertions (as unknown as).
 */
function mapToOrderWithItems(order: {
	id: string;
	orderNumber: string;
	customerEmail: string | null;
	shippingFirstName: string | null;
	shippingLastName: string | null;
	shippingAddress1: string | null;
	shippingAddress2: string | null;
	shippingPostalCode: string | null;
	shippingCity: string | null;
	shippingCountry: string | null;
	shippingPhone: string | null;
	subtotal: number;
	discountAmount: number;
	shippingCost: number;
	total: number;
	items: Array<{
		productTitle: string | null;
		skuColor: string | null;
		skuMaterial: string | null;
		skuSize: string | null;
		quantity: number;
		price: number;
		skuId: string;
		sku: {
			id: string;
			inventory: number;
			sku: string;
			product: { id: string; slug: string };
		} | null;
	}>;
}): OrderWithItems {
	return {
		id: order.id,
		orderNumber: order.orderNumber,
		customerEmail: order.customerEmail,
		shippingFirstName: order.shippingFirstName,
		shippingLastName: order.shippingLastName,
		shippingAddress1: order.shippingAddress1,
		shippingAddress2: order.shippingAddress2,
		shippingPostalCode: order.shippingPostalCode,
		shippingCity: order.shippingCity,
		shippingCountry: order.shippingCountry,
		shippingPhone: order.shippingPhone,
		subtotal: order.subtotal,
		discountAmount: order.discountAmount,
		shippingCost: order.shippingCost,
		total: order.total,
		items: order.items.map((item) => ({
			productTitle: item.productTitle,
			skuColor: item.skuColor,
			skuMaterial: item.skuMaterial,
			skuSize: item.skuSize,
			quantity: item.quantity,
			price: item.price,
			skuId: item.skuId,
			sku: item.sku,
		})),
	};
}

/**
 * Common order processing logic shared between CS and PI flows.
 * Validates stock, decrements inventory, deactivates out-of-stock SKUs.
 * The caller provides flow-specific order update data.
 *
 * ⚠️ Ne vide PLUS le panier : il vit dans le cookie `cart` du client depuis le
 * 2026-08-04, hors de portée d'un webhook. D'où la disparition du paramètre
 * `guestSessionId`, qui ne servait qu'à retrouver le panier invité en base.
 */
async function processOrderAtomically(
	tx: Prisma.TransactionClient,
	orderId: string,
	orderUpdateData: Prisma.OrderUpdateInput,
	flowLabel: string,
	expectedAmountReceived?: number | null,
	expectedCurrency?: string | null,
): Promise<OrderWithItems> {
	// STOCK-02 : verrou advisory sérialisant la transition PAID avec l'action admin
	// markAsPaid concurrente (même commande). Le 2ᵉ arrivant bloque puis relit l'état
	// PAID committé → la garde d'idempotence `paymentStatus === "PAID"` (étape 2)
	// court-circuite, évitant un double décrément de stock. À prendre AVANT le fetch.
	await acquireOrderPaidLockTx(tx, orderId);

	// 1. Fetch order with items and SKUs
	const order = await tx.order.findUnique({
		where: { id: orderId },
		include: {
			items: {
				include: {
					sku: {
						select: {
							id: true,
							inventory: true,
							sku: true,
							product: { select: { id: true, slug: true } },
						},
					},
				},
			},
		},
	});

	if (!order) {
		throw new Error(`Order not found: ${orderId}`);
	}

	// 2. Idempotence check
	if (order.paymentStatus === "PAID") {
		logger.info(`⚠️  [WEBHOOK] Order ${orderId} already processed (${flowLabel}), skipping`, {
			service: "webhook",
		});
		return mapToOrderWithItems(order);
	}

	// 2a-bis. Defense-in-depth: refuse to process if Stripe settled in a different
	// currency than the order. Without this, the amount guards below compare bare
	// integer cents across currency units (a "100" JPY capture would satisfy a
	// "100" EUR order). EUR-only today (CHECK Order_currency_eur_check + PI created
	// `currency:"eur"`), but this protects any future multi-currency PI. Mirrors the
	// refund-path guard (modules/refunds/lib/stripe-refund.ts) — audit F1, 2026-05-29.
	// `Order.currency` est parti le 2026-08-05 : la colonne valait 'EUR' sur toutes
	// les lignes, imposé par le CHECK `Order_currency_eur_check`. Comparer à la
	// constante est donc STRICTEMENT équivalent, garde inchangée.
	if (expectedCurrency && expectedCurrency.toUpperCase() !== DEFAULT_CURRENCY) {
		throw new Error(
			`Currency mismatch for order ${orderId} (${flowLabel}): Stripe settled in ${expectedCurrency.toUpperCase()} but the shop settles in ${DEFAULT_CURRENCY}`,
		);
	}

	// 2b. Defense-in-depth: refuse to mark the order PAID if Stripe captured less
	// than the order total. Guards against any client-side underbilling regression
	// (audit P1.5 / P0.1, 2026-05-11). P2-1 (2026-05-30) : erreur typée
	// `AmountMismatchError` (au lieu d'un Error générique) pour que le caller
	// `handlePaymentSuccess` distingue la sous-facturation et déclenche un
	// remboursement auto + FAILED + alerte (comme l'oversell), au lieu d'un
	// retry-Stripe-infini laissant un client débité sans commande ni refund.
	if (typeof expectedAmountReceived === "number" && expectedAmountReceived < order.total) {
		logger.error(
			`⚠️ [WEBHOOK] Underbilling for order ${orderId} (${flowLabel}): Stripe received ${expectedAmountReceived} but order.total is ${order.total}`,
			undefined,
			{ service: "webhook" },
		);
		throw new AmountMismatchError(orderId, order.total, expectedAmountReceived);
	}

	// 2c. BIZ-BUG-005 : la garde ci-dessus est unidirectionnelle (sous-facturation).
	// Une SURfacturation (Stripe encaisse plus que le total commande) ne doit PAS
	// bloquer le traitement — le client a payé, on honore — mais elle signale une
	// divergence PI/order anormale à investiguer (remboursement partiel manuel ?).
	// Alerte non bloquante.
	if (typeof expectedAmountReceived === "number" && expectedAmountReceived > order.total) {
		logger.error(
			`⚠️ [WEBHOOK] Overbilling detected for order ${orderId} (${flowLabel}): Stripe received ${expectedAmountReceived} but order.total is ${order.total}`,
			undefined,
			{ service: "webhook" },
		);
		Sentry.withScope((scope) => {
			scope.setLevel("error");
			scope.setTag("webhook", "amount-overbilling");
			scope.setFingerprint(["webhook", "amount-overbilling"]);
			scope.setContext("order", {
				orderId,
				flowLabel,
				orderTotal: order.total,
				amountReceived: expectedAmountReceived,
			});
			Sentry.captureMessage(
				`Overbilling: Stripe captured ${expectedAmountReceived} > order.total ${order.total} for order ${orderId}`,
				"error",
			);
		});
	}

	// 3. Re-validate all items INSIDE the transaction to prevent race conditions
	logger.info(
		`[WEBHOOK] Re-validating ${order.items.length} items for order ${orderId} (${flowLabel})`,
		{ service: "webhook" },
	);

	const skuIds = order.items.map((item) => item.skuId);
	// `productId` est sélectionné pour la désactivation des SKU tombés à zéro et
	// l'invalidation de cache : le lire ici évite une requête de plus DANS la
	// transaction (on tient déjà le verrou de ligne).
	const skus = await tx.$queryRaw<
		Array<{
			id: string;
			productId: string;
			inventory: number;
			isActive: boolean;
			deletedAt: Date | null;
			productStatus: string;
			productDeletedAt: Date | null;
		}>
	>`
		SELECT ps.id, ps."productId", ps.inventory, ps."isActive", ps."deletedAt",
		       p.status as "productStatus", p."deletedAt" as "productDeletedAt"
		FROM "ProductSku" ps
		INNER JOIN "Product" p ON ps."productId" = p.id
		WHERE ps.id = ANY(${skuIds}::text[])
		FOR UPDATE
	`;
	const skuMap = new Map(skus.map((s) => [s.id, s]));

	// CHECKOUT-BOUNDS-001 : agrégation des quantités PAR SKU avant la comparaison
	// de stock. Deux `OrderItem` peuvent porter le même `skuId` (commandes
	// historiques créées avant la garde d'unicité de `confirmCheckoutSchema`, import,
	// futur writer). Les valider ligne par ligne contre le même snapshot `inventory`
	// laisse passer un cumul supérieur au stock : le décrément de l'étape 4
	// violerait alors le CHECK `ProductSku_inventory_non_negative` DANS la
	// transaction, hors des chemins typés OversellError/AmountMismatchError →
	// client débité, commande jamais PAID, retries Stripe en boucle.
	const requiredQuantityBySku = new Map<string, number>();
	for (const item of order.items) {
		requiredQuantityBySku.set(
			item.skuId,
			(requiredQuantityBySku.get(item.skuId) ?? 0) + item.quantity,
		);
	}

	for (const [skuId, requiredQuantity] of requiredQuantityBySku) {
		const sku = skuMap.get(skuId);
		const isValid =
			sku &&
			!sku.deletedAt &&
			!sku.productDeletedAt &&
			sku.isActive &&
			sku.productStatus === "PUBLIC" &&
			sku.inventory >= requiredQuantity;

		if (!isValid) {
			const reason = !sku
				? "SKU not found"
				: `invalid (active=${sku.isActive}, stock=${sku.inventory}, required=${requiredQuantity}, deleted=${!!sku.deletedAt})`;
			logger.error(
				`[WEBHOOK] Validation failed for order ${orderId}, SKU ${skuId}: ${reason}`,
				undefined,
				{ service: "webhook" },
			);
			// ORD-STRIPE-009 : erreur typée pour que le caller distingue l'oversell
			// (paiement encaissé mais stock indisponible → refund auto) d'une erreur
			// transitoire (DB down → rethrow pour retry). Le throw interrompt la
			// transaction AVANT tout décrément, donc aucun stock à restaurer côté loser.
			throw new OversellError(orderId, skuId, reason);
		}
	}

	logger.info(`[WEBHOOK] All items validated successfully for order ${orderId} (${flowLabel})`, {
		service: "webhook",
	});

	// 4. Decrement stock once per SKU (quantités agrégées à l'étape 3 — une seule
	// écriture par SKU même si plusieurs lignes le référencent)
	//
	// Décrément dans la MÊME transaction que le reste de l'encaissement : le
	// snapshot verrouillé de l'étape 3 garantit qu'aucune écriture concurrente ne
	// s'est glissée entre la lecture et ce décrément.
	for (const [skuId, requiredQuantity] of requiredQuantityBySku) {
		await tx.productSku.update({
			where: { id: skuId },
			data: { inventory: { decrement: requiredQuantity } },
		});
	}

	logger.info(`✅ [WEBHOOK] Stock decremented for order ${orderId} (${flowLabel})`, {
		service: "webhook",
	});

	// 5. Update order with flow-specific data
	await tx.order.update({
		where: { id: orderId },
		data: orderUpdateData,
	});

	// 5a. BIZ-BUG-003 : tracer l'encaissement dans l'audit trail immuable.
	// La transition automatique PENDING → PAID/PROCESSING (webhook PI/CS ET cron
	// sync-async-payments, qui partagent ce chemin) est l'événement métier le plus
	// important et n'était jusqu'ici jamais consigné dans OrderHistory, contrairement
	// à toutes les actions admin. Conformité audit trail Art. L123-22 C. com.
	// Idempotent : le guard `paymentStatus === "PAID"` (étape 2) court-circuite avant.
	const newStatus = (orderUpdateData.status as OrderStatus | undefined) ?? order.status;
	const newPaymentStatus =
		(orderUpdateData.paymentStatus as PaymentStatus | undefined) ?? order.paymentStatus;
	await createOrderAuditTx(tx, {
		orderId,
		action: OrderAction.PAID,
		source: HistorySource.SYSTEM,
		authorName: `Système (webhook ${flowLabel})`,
		note: "Paiement encaissé — commande passée en traitement",
		previousStatus: order.status !== newStatus ? order.status : undefined,
		newStatus: order.status !== newStatus ? newStatus : undefined,
		previousPaymentStatus:
			order.paymentStatus !== newPaymentStatus ? order.paymentStatus : undefined,
		newPaymentStatus: order.paymentStatus !== newPaymentStatus ? newPaymentStatus : undefined,
	});

	// 5b. Deactivate out-of-stock SKUs (single query instead of N+1)
	//
	// STOCK-LAST-ACTIVE-SKU-001 : on ne désactive JAMAIS le dernier SKU actif d'un
	// produit PUBLIC. Le `updateMany` était aveugle et contournait donc
	// `assertPublicProductKeepsActiveSku`, dont les deux seuls appelants sont des
	// actions admin : l'invariant « un produit PUBLIC garde ≥1 SKU actif » était
	// opposable à l'admin mais jamais à une vente. Vendre la dernière unité d'un
	// produit mono-SKU (la forme dominante) le laissait PUBLIC sans SKU actif →
	// `GET_PRODUCT_SELECT` filtrant `isActive: true`, la PDP faisait `notFound()`
	// alors que la carte restait listée : lien interne cassé + URL indexée en 404.
	// Le SKU épargné reste actif à `inventory: 0`, état que la vitrine rend déjà en
	// « rupture de stock » — et qui conserve la surface « prévenez-moi ».
	//
	// Les candidats se déduisent des lignes déjà verrouillées (étape 3) : le
	// décrément vient d'être appliqué, donc `inventory - required === 0` identifie
	// exactement les SKU à zéro, sans relecture.
	// `skuId` étant une FK requise, Prisma type `item.sku` et `item.sku.product` comme
	// non-nullables : pas de garde défensive ici, elle serait du code mort.
	const productIdBySkuId = new Map(order.items.map((item) => [item.skuId, item.sku.product.id]));
	const zeroStockCandidates: DeactivationCandidate[] = [];
	for (const [skuId, requiredQuantity] of requiredQuantityBySku) {
		const locked = skuMap.get(skuId);
		const productId = productIdBySkuId.get(skuId);
		if (!locked || !productId) continue;
		if (locked.inventory - requiredQuantity !== 0) continue;
		zeroStockCandidates.push({ skuId, productId, productStatus: locked.productStatus });
	}

	// Le total de SKU actifs par produit n'est nécessaire que si un produit PUBLIC
	// risque de tomber à zéro — sinon aucune requête supplémentaire.
	const activeTotalByProductId = new Map<string, number>();
	const publicProductIds = Array.from(
		new Set(
			zeroStockCandidates.filter((c) => c.productStatus === "PUBLIC").map((c) => c.productId),
		),
	);
	if (publicProductIds.length > 0) {
		const activeSiblings = await tx.productSku.findMany({
			where: { productId: { in: publicProductIds }, isActive: true, deletedAt: null },
			select: { productId: true },
		});
		for (const sibling of activeSiblings) {
			activeTotalByProductId.set(
				sibling.productId,
				(activeTotalByProductId.get(sibling.productId) ?? 0) + 1,
			);
		}
	}

	const deactivatableSkuIds = selectDeactivatableSkuIds(
		zeroStockCandidates,
		activeTotalByProductId,
	);
	const keptActiveCount = zeroStockCandidates.length - deactivatableSkuIds.length;

	let deactivatedCount = 0;
	if (deactivatableSkuIds.length > 0) {
		({ count: deactivatedCount } = await tx.productSku.updateMany({
			where: { id: { in: deactivatableSkuIds } },
			data: { isActive: false },
		}));
	}
	if (deactivatedCount > 0) {
		logger.info(
			`📦 [WEBHOOK] ${deactivatedCount} SKU(s) deactivated (out of stock) for order ${orderId} (${flowLabel})`,
			{ service: "webhook" },
		);
	}
	if (keptActiveCount > 0) {
		logger.info(
			`📦 [WEBHOOK] ${keptActiveCount} SKU(s) kept active at stock 0 (last active SKU of a PUBLIC product) for order ${orderId} (${flowLabel})`,
			{ service: "webhook" },
		);
	}

	// 6. Le vidage du panier N'A PLUS LIEU ICI.
	//
	// Depuis le passage du panier en cookie (2026-08-04), il n'y a plus de table
	// `Cart` à purger — et un webhook Stripe est un appel serveur-à-serveur, donc
	// sans aucun cookie du client. Cette étape supprimait les `CartItem` et
	// remettait `appliedDiscountCode`/`discountAmountCache` à NULL
	// ([[CART-DISCOUNT-003]]) ; les deux sont désormais portés par le cookie `cart`
	// et partent ensemble à sa suppression.
	//
	// Le vidage est repris par `clearCartAfterOrder`, déclenché au montage de
	// `/paiement/confirmation` (seule surface qui a la main sur le cookie). Angle
	// mort assumé : un client qui ne revient jamais sur cette page garde son
	// cookie — cf. la JSDoc de l'action.

	logger.info(`✅ [WEBHOOK] Order processed successfully (${flowLabel}): ${order.orderNumber}`, {
		service: "webhook",
	});

	return mapToOrderWithItems(order);
}

/**
 * `PaymentIntent.latest_charge` → id de Charge, sans appel réseau.
 *
 * Stripe n'expand pas `latest_charge` par défaut : sur un PI de webhook c'est une
 * STRING (l'id), pas un objet — exactement ce qu'on veut stocker. Le cas objet n'est
 * couvert que pour un appelant qui aurait expandé. Ne JAMAIS retrieve la Charge ici :
 * `extractPaymentMethodFromPaymentIntent` le fait déjà côté handler pour lire
 * `payment_method_details`, et un second aller-retour Stripe dans la transaction
 * d'encaissement mangerait le budget de `TX_TIMEOUT_LONG` pour une donnée déjà en main.
 */
function readChargeId(paymentIntent: Stripe.PaymentIntent): string | null {
	const latest = paymentIntent.latest_charge;
	if (typeof latest === "string") return latest;
	return latest?.id ?? null;
}

/**
 * Processes order from a Payment Intent (new PI flow).
 * Shipping info is already stored in the Order (set during confirmCheckout).
 *
 * @param paymentMethod (optionnel) — type Stripe extrait via
 *   `extractPaymentMethodFromPaymentIntent`. Persisté sur Order.paymentMethod
 *   pour conformité e-reporting B2C (EINV-EREPORT-001). Si omis, la valeur
 *   par défaut Prisma (CARD) reste appliquée.
 */
export async function processOrderFromPaymentIntent(
	orderId: string,
	paymentIntent: Stripe.PaymentIntent,
	paymentMethod?: PaymentMethod,
): Promise<OrderWithItems> {
	// ORD-BIZ-011 : pré-check CANCELLED hors transaction (throws CancelledOrderRaceError).
	await detectCancelledOrderRace(
		orderId,
		paymentIntent.id,
		"PI flow",
		paymentIntent.amount_received,
	);

	const stripeChargeId = readChargeId(paymentIntent);

	return prisma.$transaction(
		async (tx: Prisma.TransactionClient) => {
			return processOrderAtomically(
				tx,
				orderId,
				{
					status: "PROCESSING",
					// Sans cette ligne, (PROCESSING, UNFULFILLED) était l'état de 100 %
					// des commandes payées : badge admin « Non traitée » à côté de
					// « En préparation », et aucun chemin de correction (markAsProcessing
					// exige status=PENDING). Pas de backfill des lignes antérieures —
					// TO_SHIP_FULFILLMENT_STATUSES et la timeline client les absorbent.
					fulfillmentStatus: "PROCESSING",
					paymentStatus: "PAID",
					paidAt: new Date(),
					stripePaymentIntentId: paymentIntent.id,
					// Spread conditionnel, comme `paymentMethod` juste en dessous : un PI
					// sans `latest_charge` (PI succeeded sans capture — cas rare tracé par
					// `extractPaymentMethodFromPaymentIntent`) ne doit pas REMETTRE la
					// colonne à NULL sur une commande où un passage antérieur l'avait posée.
					...(stripeChargeId !== null && { stripeChargeId }),
					...(paymentMethod !== undefined && { paymentMethod }),
				},
				"PI flow",
				paymentIntent.amount_received,
				paymentIntent.currency,
			);
		},
		// ORD-STRIPE-004 : tx FOR UPDATE sur SKU + Order — sans maxWait override
		// le défaut Prisma (2s) génère P2024 sous contention multi-webhooks.
		{ timeout: TX_TIMEOUT_LONG, maxWait: TX_MAX_WAIT_LONG },
	);
}
