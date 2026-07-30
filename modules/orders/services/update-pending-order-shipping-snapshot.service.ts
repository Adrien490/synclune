import { HistorySource } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { acquireOrderPaidLockTx } from "@/modules/orders/utils/order-paid-lock";
import { createOrderAuditTx } from "@/modules/orders/utils/order-audit";
import { logger } from "@/shared/lib/logger";

export interface PendingShippingSnapshot {
	firstName: string;
	lastName: string;
	address1: string;
	address2: string | null;
	postalCode: string;
	city: string;
	country: string;
	phone: string;
}

export type UpdatePendingShippingSnapshotOutcome =
	| { updated: true; changedFields: string[] }
	| { updated: false; reason: "not-found" | "not-pending" | "no-change" };

/**
 * Corrige le snapshot d'adresse de livraison d'une commande **encore PENDING**, à la
 * demande du client qui resoumet le tunnel après un échec de paiement.
 *
 * ## Le défaut que ce service ferme (KI-001)
 *
 * `resolveIdempotentHit` refuse une resoumission dont les lignes, le pays ou le code
 * postal divergent de la commande liée au PaymentIntent — mais pas `addressLine1`,
 * `addressLine2`, `city`, le nom ou le téléphone. Une resoumission qui corrigeait la RUE
 * était donc acceptée, la commande gardant son snapshot figé : le client croyait avoir
 * corrigé son adresse, l'étiquette portait l'ancienne, et rien ne le signalait ni côté
 * client ni côté admin. Scénario réel : faute de frappe dans le numéro → carte refusée
 * pour une raison quelconque → correction de la rue en réessayant → paiement accepté →
 * colis expédié à l'adresse fautive.
 *
 * ## Pourquoi réécrire un snapshot est ici légitime
 *
 * L'invariant 5 fige les snapshots parce qu'ils sont la donnée probante d'une **pièce
 * comptable**. Une commande `paymentStatus: PENDING` n'en est pas une : ni encaissement,
 * ni facture, ni numéro de séquence — CLAUDE.md le dit explicitement à propos de
 * l'absence d'`OrderHistory` à la création. La surface de fraude invoquée quand ce
 * constat a été parké (« réécrire la destination d'une commande déjà autorisée »)
 * suppose une commande autorisée ; les gardes ci-dessous garantissent le contraire.
 *
 * Quatre conditions, toutes nécessaires :
 *  1. `paymentStatus === "PENDING"` — re-lu **sous** l'advisory lock, jamais avant ;
 *  2. le même advisory lock que la transition PAID (`acquireOrderPaidLockTx`), donc
 *     sérialisé avec `processOrderAtomically` et `markAsPaid` : un webhook qui encaisse
 *     pendant ce temps attend, puis notre re-lecture voit PAID et abandonne ;
 *  3. aucun champ de montant touché — l'appelant a déjà prouvé que lignes, pays et code
 *     postal sont identiques, donc le total est structurellement inchangé ;
 *  4. entrée `OrderHistory` obligatoire (Art. L123-22 C. com.).
 *
 * ⚠️ RGPD — l'audit trail est immuable 10 ans et n'est jamais scrubé : `authorName` est
 * le libellé neutre `"Client"` (jamais `user.name`/`user.email`) et la metadata ne porte
 * que des NOMS de champs, jamais de valeurs d'adresse. Cf. invariant 3 + régressions
 * `order-history-no-customer-pii`.
 *
 * ⚠️ Ce service est un writer allowlisté de `shipping*` : il est nommé dans
 * `order-address-snapshot-immutability.regression.test.ts`, qui exige aussi qu'il pose
 * un `createOrderAuditTx` avec `action: "ADDRESS_UPDATED"`. L'écriture est **inline**
 * (`data: { shippingFirstName: … }`) délibérément, pour rester visible du scanner de ce
 * test — le passage par une variable la lui rendrait invisible.
 *
 * Audit checkout Stripe Elements 2026-07-30, G4 (ferme KI-001).
 */
export async function updatePendingOrderShippingSnapshot(params: {
	orderId: string;
	customerUserId: string | null;
	shipping: PendingShippingSnapshot;
}): Promise<UpdatePendingShippingSnapshotOutcome> {
	const { orderId, customerUserId, shipping } = params;

	return prisma.$transaction(async (tx) => {
		await acquireOrderPaidLockTx(tx, orderId);

		const current = await tx.order.findUnique({
			where: { id: orderId },
			select: {
				paymentStatus: true,
				shippingFirstName: true,
				shippingLastName: true,
				shippingAddress1: true,
				shippingAddress2: true,
				shippingPostalCode: true,
				shippingCity: true,
				shippingCountry: true,
				shippingPhone: true,
			},
		});

		if (!current) return { updated: false, reason: "not-found" as const };

		// Re-lecture SOUS le verrou : entre la décision de l'appelant et ce point, le
		// webhook a pu encaisser. Une commande payée redevient une pièce comptable —
		// son snapshot est définitivement figé.
		if (current.paymentStatus !== "PENDING") {
			return { updated: false, reason: "not-pending" as const };
		}

		const changedFields = (
			[
				["shippingFirstName", shipping.firstName, current.shippingFirstName],
				["shippingLastName", shipping.lastName, current.shippingLastName],
				["shippingAddress1", shipping.address1, current.shippingAddress1],
				["shippingAddress2", shipping.address2, current.shippingAddress2],
				["shippingPostalCode", shipping.postalCode, current.shippingPostalCode],
				["shippingCity", shipping.city, current.shippingCity],
				["shippingCountry", shipping.country, current.shippingCountry],
				["shippingPhone", shipping.phone, current.shippingPhone],
			] as const
		)
			.filter(([, next, previous]) => (next ?? null) !== (previous ?? null))
			.map(([field]) => field);

		if (changedFields.length === 0) {
			return { updated: false, reason: "no-change" as const };
		}

		await tx.order.update({
			where: { id: orderId },
			data: {
				shippingFirstName: shipping.firstName,
				shippingLastName: shipping.lastName,
				shippingAddress1: shipping.address1,
				shippingAddress2: shipping.address2,
				shippingPostalCode: shipping.postalCode,
				shippingCity: shipping.city,
				shippingCountry: shipping.country,
				shippingPhone: shipping.phone,
			},
		});

		await createOrderAuditTx(tx, {
			orderId,
			action: "ADDRESS_UPDATED",
			source: HistorySource.CUSTOMER,
			// Libellé neutre imposé : cette table survit à l'effacement RGPD.
			authorName: "Client",
			...(customerUserId && { authorId: customerUserId }),
			note: "Adresse de livraison corrigee par le client avant paiement",
			metadata: {
				addressType: "shipping",
				changedFields,
			},
		});

		logger.info("Pending order shipping snapshot corrected by customer", {
			service: "checkout",
			orderId,
			changedFields,
		});

		return { updated: true, changedFields };
	});
}
