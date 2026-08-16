"use server";

import Stripe from "stripe";
import { requireAdmin } from "@/modules/admin-auth/lib/require-admin";
import { sendRetractationRefundedEmail } from "@/modules/emails/services/send-retractation-emails";
import { error, handleActionError, notFound, success, validateInput } from "@/shared/lib/actions";
import { updateTagsAfterMutation } from "@/shared/lib/cache";
import { logger } from "@/shared/lib/logger";
import { prisma } from "@/shared/lib/prisma";
import { stripe, withStripeCircuitBreaker } from "@/shared/lib/stripe";
import type { ActionState } from "@/shared/types/server-action";
import { RETRACTATION_STATUS_LABELS } from "../constants/retractation.constants";
import { refundRetractationSchema } from "../schemas/retractation.schemas";
import { finalizeRetractationRefund } from "../services/finalize-retractation-refund.service";

/**
 * « Rembourser » : remboursement Stripe INTÉGRAL + finalisation transactionnelle.
 *
 * Séquence : garde d'état (AWAITING_RETURN — le colis doit être pointé
 * reçu) → `stripe.refunds.create({ payment_intent })` avec idempotencyKey
 * `retractation-refund-<id>` (un double clic rejoue le MÊME refund côté
 * Stripe, jamais deux) → transaction : REFUNDED + `creditNoteNumber`
 * (compteur distinct, retry P2002) + `Order.status` REFUNDED + restock
 * OPT-IN → email de confirmation.
 *
 * Pas de webhook `refund.*` (perte volontaire § 1) : le remboursement est
 * déclenché par NOUS via l'API, `stripeRefundId` suffit comme trace.
 *
 * Reprise sur incident : si la finalisation a échoué après un refund réussi,
 * un nouveau clic rejoue le même refund (idempotencyKey, 24 h) ou retrouve le
 * refund existant (« charge already refunded ») et reprend la finalisation.
 */
export async function refundRetractation(
	_prevState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	const admin = await requireAdmin();
	if ("error" in admin) return admin.error;

	const validation = validateInput(refundRetractationSchema, {
		retractationId: formData.get("retractationId"),
		restock: formData.get("restock"),
	});
	if ("error" in validation) return validation.error;
	const { retractationId, restock } = validation.data;

	try {
		const retractation = await prisma.retractationRequest.findUnique({
			where: { id: retractationId },
			select: {
				status: true,
				order: {
					select: {
						id: true,
						invoiceNumber: true,
						email: true,
						customerName: true,
						amountTotalCents: true,
						stripePaymentIntentId: true,
					},
				},
			},
		});
		if (!retractation) return notFound("Demande introuvable.");
		if (retractation.status !== "AWAITING_RETURN") {
			return error(
				"Le remboursement exige d'avoir pointé le colis reçu (et une demande non déjà traitée).",
			);
		}
		if (!retractation.order.stripePaymentIntentId) {
			return error("Cette commande n'a pas de paiement Stripe ancré — remboursement impossible.");
		}

		let refund: { id: string };
		try {
			refund = await withStripeCircuitBreaker(() =>
				stripe.refunds.create(
					{ payment_intent: retractation.order.stripePaymentIntentId! },
					{ idempotencyKey: `retractation-refund-${retractationId}` },
				),
			);
		} catch (e) {
			// Reprise après crash entre le refund et la finalisation : dans les
			// 24 h, l'idempotencyKey rejoue le MÊME refund ; au-delà, la clé
			// Stripe a expiré et `refunds.create` répond « charge already
			// refunded » alors que la demande est restée AWAITING_RETURN. On
			// retrouve alors le refund existant et on reprend la finalisation —
			// sans ce chemin, la demande serait coincée sans issue dans l'UI.
			if (
				e instanceof Stripe.errors.StripeInvalidRequestError &&
				e.code === "charge_already_refunded"
			) {
				const existing = await withStripeCircuitBreaker(() =>
					stripe.refunds.list({
						payment_intent: retractation.order.stripePaymentIntentId!,
						limit: 1,
					}),
				);
				const found = existing.data[0];
				if (!found) throw e;
				logger.warn(
					"[refundRetractation] Refund Stripe déjà existant — reprise de la finalisation",
					{ retractationId, stripeRefundId: found.id },
				);
				refund = found;
			} else {
				throw e;
			}
		}

		const result = await finalizeRetractationRefund({
			retractationId,
			stripeRefundId: refund.id,
			restock,
		});

		if (result.outcome === "noop") {
			// Le refund Stripe est idempotent (même clé) : rien n'a été doublé.
			// Mais le noop ne dit pas POURQUOI : un rejet concurrent a pu passer
			// entre le refund et la finalisation (REJECTED est atteignable depuis
			// AWAITING_RETURN) — relire le statut réel plutôt qu'affirmer
			// « déjà remboursée » à tort.
			const current = await prisma.retractationRequest.findUnique({
				where: { id: retractationId },
				select: { status: true },
			});
			if (current && current.status !== "REFUNDED") {
				return error(
					`Cette demande n'est plus remboursable (${RETRACTATION_STATUS_LABELS[current.status]}). ⚠️ Un remboursement Stripe a pu être créé juste avant — vérifie le dashboard.`,
				);
			}
			return error("Cette demande a déjà été remboursée.");
		}

		updateTagsAfterMutation(result.tags);

		const emailResult = await sendRetractationRefundedEmail({
			order: retractation.order,
			amountRefundedCents: retractation.order.amountTotalCents,
			creditNoteNumber: result.creditNoteNumber!,
		});
		if (!emailResult.success) {
			logger.error("[refundRetractation] Email de remboursement non envoyé", {
				retractationId,
				error: emailResult.error,
			});
			return success(
				`Remboursement effectué (avoir n° ${result.creditNoteNumber}) — mais l'email n'est pas parti. Préviens la cliente directement.`,
			);
		}

		return success(
			`Remboursement effectué, avoir n° ${result.creditNoteNumber} émis, email envoyé.${restock ? " Stock remis en vente." : ""}`,
		);
	} catch (e) {
		return handleActionError(
			e,
			"Le remboursement a échoué. Vérifie le dashboard Stripe avant de réessayer.",
		);
	}
}
