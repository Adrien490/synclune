"use server";

import { requireAdmin } from "@/modules/admin-auth/lib/require-admin";
import { sendRetractationRefundedEmail } from "@/modules/emails/services/send-retractation-emails";
import { error, handleActionError, notFound, success, validateInput } from "@/shared/lib/actions";
import { updateTagsAfterMutation } from "@/shared/lib/cache";
import { logger } from "@/shared/lib/logger";
import { prisma } from "@/shared/lib/prisma";
import { stripe, withStripeCircuitBreaker } from "@/shared/lib/stripe";
import type { ActionState } from "@/shared/types/server-action";
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

		const refund = await withStripeCircuitBreaker(() =>
			stripe.refunds.create(
				{ payment_intent: retractation.order.stripePaymentIntentId! },
				{ idempotencyKey: `retractation-refund-${retractationId}` },
			),
		);

		const result = await finalizeRetractationRefund({
			retractationId,
			stripeRefundId: refund.id,
			restock,
		});

		if (result.outcome === "noop") {
			// Le refund Stripe est idempotent (même clé) : rien n'a été doublé.
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
