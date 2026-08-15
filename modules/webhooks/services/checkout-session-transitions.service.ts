/**
 * Transitions de commande pilotées par l'état d'une session Stripe Checkout.
 *
 * Service transactionnel PARTAGÉ entre le webhook (`checkout.session.completed`
 * / `checkout.session.expired`) et la réconciliation admin « Vérifier les
 * commandes en attente ». Il retourne les tags de cache à invalider :
 * **l'appelant invalide selon son contexte** — `revalidateTagsInBackground`
 * depuis le webhook (route handler : `updateTag` y THROW), `updateTagsAfterMutation`
 * depuis la Server Action admin.
 *
 * L'idempotence est portée par la garde de transition `updateMany({ where:
 * { stripeSessionId, status: PENDING } })` : count = 0 ⇒ déjà traité (redélivrance
 * Stripe, double clic admin) ⇒ no-op silencieux. Il n'y a plus de table
 * WebhookEvent (perte volontaire § 1).
 */

import type Stripe from "stripe";
import {
	sendOrderConfirmationEmail,
	type OrderForConfirmationEmail,
} from "@/modules/emails/services/send-order-confirmation";
import { Prisma } from "@/app/generated/prisma/client";
import { logger } from "@/shared/lib/logger";
import { prisma } from "@/shared/lib/prisma";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { getOrderInvalidationTags } from "@/modules/orders/constants/cache";
import { PRODUCTS_CACHE_TAGS } from "@/modules/products/constants/cache";

export interface TransitionResult {
	outcome: "transitioned" | "noop";
	orderId: string | null;
	/** Tags à invalider par l'appelant, selon son contexte d'exécution. */
	tags: string[];
}

const NOOP: TransitionResult = { outcome: "noop", orderId: null, tags: [] };

/** Adresse + identité telles que Stripe Checkout les rend sur la session payée. */
function extractCustomerData(session: Stripe.Checkout.Session) {
	const shipping = session.collected_information?.shipping_details ?? null;
	const details = session.customer_details ?? null;
	const address = shipping?.address ?? details?.address ?? null;

	return {
		email: details?.email ?? session.customer_email ?? "",
		customerName: shipping?.name ?? details?.name ?? null,
		shippingLine1: address?.line1 ?? null,
		shippingLine2: address?.line2 ?? null,
		shippingZip: address?.postal_code ?? null,
		shippingCity: address?.city ?? null,
		shippingCountry: address?.country ?? null,
	};
}

/** Nombre de tentatives de la transaction PAID + numérotation sur collision P2002. */
const INVOICE_NUMBER_MAX_ATTEMPTS = 3;

function isUniqueConstraintError(error: unknown): boolean {
	return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

/**
 * Transition PENDING→PAID **et** attribution du numéro de facture, dans la
 * MÊME transaction (Art. 286 CGI : séquentiel sans trou — un Int nu, décision
 * D2, plus de format F-YYYY ni d'advisory lock).
 *
 * `max(invoiceNumber) + 1` sous transaction suffit à ~20 commandes/mois : si
 * deux webhooks calculent le même numéro, le `@unique` fait échouer l'une des
 * deux transactions en P2002 — la transition est alors annulée AVEC la
 * numérotation (pas de commande PAID sans numéro) et l'ensemble est retenté,
 * borné à 3 tentatives. Le webhook est le SEUL écrivain d'`invoiceNumber` :
 * aucune Server Action ne doit l'écrire.
 */
async function transitionToPaidWithInvoiceNumber(
	stripeSessionId: string,
	data: Prisma.OrderUpdateManyMutationInput,
): Promise<"transitioned" | "noop"> {
	for (let attempt = 1; attempt <= INVOICE_NUMBER_MAX_ATTEMPTS; attempt++) {
		try {
			return await prisma.$transaction(async (tx) => {
				const { count } = await tx.order.updateMany({
					where: { stripeSessionId, status: "PENDING" },
					data,
				});
				if (count === 0) return "noop";

				const aggregate = await tx.order.aggregate({ _max: { invoiceNumber: true } });
				const nextInvoiceNumber = (aggregate._max.invoiceNumber ?? 0) + 1;
				await tx.order.update({
					where: { stripeSessionId },
					data: { invoiceNumber: nextInvoiceNumber },
				});
				return "transitioned";
			});
		} catch (error) {
			if (isUniqueConstraintError(error) && attempt < INVOICE_NUMBER_MAX_ATTEMPTS) {
				logger.warn("[checkout.completed] Collision invoiceNumber (P2002) — nouvelle tentative", {
					stripeSessionId,
					attempt,
				});
				continue;
			}
			throw error;
		}
	}
	// Inatteignable (la boucle return ou throw), mais TypeScript l'exige.
	throw new Error("transitionToPaidWithInvoiceNumber: tentatives épuisées");
}

/**
 * `checkout.session.completed` (payment_status = paid) : PENDING → PAID.
 *
 * Écrit l'identité et l'adresse collectées par Stripe, ancre le
 * `stripePaymentIntentId`, puis envoie l'email de confirmation — APRÈS la
 * transition réussie, jamais sur un no-op. Un échec d'email ne fait PAS
 * échouer la transition (un 500 ferait redélivrer un event désormais no-op,
 * l'email ne serait jamais retenté) : il est journalisé, l'idempotencyKey
 * Resend protège le cas du retry partiel.
 */
export async function markOrderPaidFromSession(
	session: Stripe.Checkout.Session,
): Promise<TransitionResult> {
	const paymentIntentId =
		typeof session.payment_intent === "string"
			? session.payment_intent
			: (session.payment_intent?.id ?? null);

	const outcome = await transitionToPaidWithInvoiceNumber(session.id, {
		status: "PAID",
		stripePaymentIntentId: paymentIntentId,
		...extractCustomerData(session),
	});

	if (outcome === "noop") {
		// Redélivrance, double traitement concurrent, ou session inconnue de
		// cette base (autre environnement) : rien à faire.
		logger.info("[checkout.completed] Transition no-op (déjà traitée ou inconnue)", {
			stripeSessionId: session.id,
		});
		return NOOP;
	}

	const order = await prisma.order.findUnique({
		where: { stripeSessionId: session.id },
		select: {
			id: true,
			invoiceNumber: true,
			email: true,
			customerName: true,
			amountItemsCents: true,
			amountShippingCents: true,
			amountTotalCents: true,
			shippingLine1: true,
			shippingLine2: true,
			shippingZip: true,
			shippingCity: true,
			shippingCountry: true,
			items: {
				select: {
					nameSnapshot: true,
					variantSnapshot: true,
					unitPriceCents: true,
					quantity: true,
				},
			},
		},
	});

	if (order && order.email) {
		const result = await sendOrderConfirmationEmail(order satisfies OrderForConfirmationEmail);
		if (!result.success) {
			logger.error("[checkout.completed] Email de confirmation non envoyé", {
				orderId: order.id,
				error: result.error,
			});
		}
	} else {
		logger.error("[checkout.completed] Commande payée sans email — confirmation non envoyée", {
			stripeSessionId: session.id,
		});
	}

	return {
		outcome: "transitioned",
		orderId: order?.id ?? null,
		tags: order
			? getOrderInvalidationTags(order.id)
			: [SHARED_CACHE_TAGS.ADMIN_ORDERS_LIST, SHARED_CACHE_TAGS.ADMIN_BADGES],
	};
}

/**
 * `checkout.session.expired` : PENDING → CANCELLED + restitution du stock.
 *
 * Transition et restock dans la MÊME transaction, gardés par le count du
 * `updateMany` : le restock ne s'exécute qu'exactement une fois, même si
 * Stripe redélivre l'event. Les `variantId` null (variante supprimée entre
 * temps, SetNull) sont ignorés.
 */
export async function cancelOrderFromExpiredSession(
	stripeSessionId: string,
): Promise<TransitionResult> {
	return prisma.$transaction(async (tx) => {
		const { count } = await tx.order.updateMany({
			where: { stripeSessionId, status: "PENDING" },
			data: { status: "CANCELLED" },
		});

		if (count === 0) {
			logger.info("[checkout.expired] Transition no-op (déjà traitée ou inconnue)", {
				stripeSessionId,
			});
			return NOOP;
		}

		const order = await tx.order.findUnique({
			where: { stripeSessionId },
			select: {
				id: true,
				items: {
					select: {
						variantId: true,
						quantity: true,
						variant: { select: { productId: true, product: { select: { slug: true } } } },
					},
				},
			},
		});

		const tags = new Set<string>([
			SHARED_CACHE_TAGS.ADMIN_ORDERS_LIST,
			SHARED_CACHE_TAGS.ADMIN_BADGES,
			SHARED_CACHE_TAGS.ADMIN_INVENTORY_LIST,
			PRODUCTS_CACHE_TAGS.LIST,
			PRODUCTS_CACHE_TAGS.VARIANTS_LIST,
		]);
		if (order) {
			for (const tag of getOrderInvalidationTags(order.id)) tags.add(tag);
		}

		for (const item of order?.items ?? []) {
			if (!item.variantId) continue;
			await tx.productVariant.updateMany({
				where: { id: item.variantId },
				data: { stock: { increment: item.quantity } },
			});
			tags.add(PRODUCTS_CACHE_TAGS.VARIANT_DETAIL_BY_ID(item.variantId));
			if (item.variant) {
				tags.add(PRODUCTS_CACHE_TAGS.VARIANTS(item.variant.productId));
				tags.add(PRODUCTS_CACHE_TAGS.DETAIL(item.variant.product.slug));
			}
		}

		return {
			outcome: "transitioned" as const,
			orderId: order?.id ?? null,
			tags: Array.from(tags),
		};
	});
}
