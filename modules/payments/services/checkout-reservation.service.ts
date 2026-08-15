/**
 * Réservation de stock + création de commande PENDING — transaction atomique
 * du checkout (D5 : le stock est réservé à la création de la session).
 *
 * Service transactionnel (mutation DB assumée hors `actions/`) : la paire
 * réservation/compensation doit rester atomique et partagée entre l'action
 * `createCheckoutSession` et ses tests.
 */

import { randomUUID } from "node:crypto";
import { BusinessError } from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import { PENDING_SESSION_PLACEHOLDER_PREFIX } from "../constants/checkout.constants";
import type { CheckoutAmounts, CheckoutOrderLine } from "./checkout-order.service";

export interface ReservedOrder {
	orderId: string;
}

/**
 * Décrémente le stock de chaque ligne et crée l'Order PENDING dans la MÊME
 * transaction.
 *
 * ⚠️ Jamais de read-then-write : les bijoux sont souvent `stock = 1`. Chaque
 * décrément est un `updateMany` conditionnel (`stock: { gte: qty }`, variante
 * et produit actifs) dont le `count` est vérifié — un count ≠ 1 fait tout
 * annuler (rollback de la transaction) avec une erreur métier affichable.
 *
 * L'Order naît avec un `stripeSessionId` provisoire unique (la colonne est
 * non-nulle `@unique`) : la session Stripe n'existe pas encore. L'appelant le
 * remplace par le `cs_…` réel, ou appelle `releaseReservation` si Stripe
 * échoue.
 */
export async function reserveStockAndCreateOrder(
	lines: CheckoutOrderLine[],
	amounts: CheckoutAmounts,
): Promise<ReservedOrder> {
	const order = await prisma.$transaction(async (tx) => {
		for (const line of lines) {
			const { count } = await tx.productVariant.updateMany({
				where: {
					id: line.variantId,
					active: true,
					stock: { gte: line.quantity },
					product: { active: true },
				},
				data: { stock: { decrement: line.quantity } },
			});
			if (count !== 1) {
				throw new BusinessError(
					`Stock insuffisant pour « ${line.nameSnapshot} ». Mets ton panier à jour et réessaie.`,
					"INSUFFICIENT_STOCK",
				);
			}
		}

		return tx.order.create({
			data: {
				stripeSessionId: `${PENDING_SESSION_PLACEHOLDER_PREFIX}${randomUUID()}`,
				status: "PENDING",
				// L'email est collecté par Stripe Checkout : inconnu à la création,
				// rempli par le webhook `checkout.session.completed`.
				email: "",
				amountItemsCents: amounts.amountItemsCents,
				amountShippingCents: amounts.amountShippingCents,
				amountTotalCents: amounts.amountTotalCents,
				items: {
					create: lines.map((line) => ({
						variantId: line.variantId,
						productId: line.productId,
						nameSnapshot: line.nameSnapshot,
						variantSnapshot: line.variantSnapshot,
						unitPriceCents: line.unitPriceCents,
						quantity: line.quantity,
					})),
				},
			},
			select: { id: true },
		});
	});

	return { orderId: order.id };
}

/**
 * Rollback compensatoire : si la création de la session Stripe échoue APRÈS
 * la réservation, on restitue le stock et on supprime l'Order provisoire
 * (la suppression cascade sur ses items).
 *
 * Best-effort assumé : si ce rollback est lui-même interrompu (crash), la
 * commande garde son placeholder `pending_…` et la réconciliation admin
 * (« Vérifier les commandes en attente ») la traitera comme expirée.
 */
export async function releaseReservation(
	orderId: string,
	lines: Array<{ variantId: string; quantity: number }>,
): Promise<void> {
	await prisma.$transaction(async (tx) => {
		for (const line of lines) {
			await tx.productVariant.updateMany({
				where: { id: line.variantId },
				data: { stock: { increment: line.quantity } },
			});
		}
		await tx.order.delete({ where: { id: orderId } });
	});
}
