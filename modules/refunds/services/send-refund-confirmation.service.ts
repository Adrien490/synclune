import { logger } from "@/shared/lib/logger";
import { prisma } from "@/shared/lib/prisma";
import { sendRefundConfirmationEmail } from "@/modules/emails/services/refund-emails";
import type { RefundReason } from "@/app/generated/prisma/client";

/**
 * ORD-STRIPE-005 — émetteur unique de l'email de confirmation de remboursement.
 *
 * Avant ce service, 3 chemins envoyaient l'email :
 *  - SAGA admin `processRefund` → `refund-confirm-{id}-{attempt}` (Resend)
 *  - Webhook `charge.refunded` → `refund-confirm-charge-{cid}-{amount}` (Resend)
 *  - Cron `reconcile-refunds` → encore une autre clé
 * Les 3 idempotencyKey Resend ne se croisaient pas → triple email possible.
 *
 * Stratégie :
 *  1. Pose `Refund.confirmationEmailSentAt = now` via `updateMany` avec guard
 *     `confirmationEmailSentAt: null`. Si count === 0, un autre process a déjà
 *     envoyé → skip.
 *  2. Si pose réussit, envoie l'email avec `idempotencyKey: refund-confirm-{id}`
 *     (Resend dédup 24h en deuxième ligne de défense).
 *  3. Sur erreur Resend, on logge mais ne reset PAS le flag (le retry repassera
 *     par le cron `reconcile-refunds` qui re-tente le SAGA finalize).
 */
interface SendArgs {
	refundId: string;
	to: string;
	orderNumber: string;
	customerName: string;
	refundAmount: number;
	reason: RefundReason;
	orderDetailsUrl: string;
	invoiceNumber: string | null;
	creditNoteNumber: string | null;
}

interface SendResult {
	sent: boolean;
	skipped: boolean;
	reason?: "already_sent" | "send_failed";
}

export async function sendRefundConfirmationOnce(args: SendArgs): Promise<SendResult> {
	const { refundId } = args;

	// 1) Tentative de claim atomique du droit d'envoyer
	const claimed = await prisma.refund.updateMany({
		where: { id: refundId, confirmationEmailSentAt: null },
		data: { confirmationEmailSentAt: new Date() },
	});

	if (claimed.count === 0) {
		logger.info(`[REFUND-EMAIL] Confirmation already sent for refund ${refundId}, skipping`, {
			refundId,
		});
		return { sent: false, skipped: true, reason: "already_sent" };
	}

	// 2) Envoi avec idempotencyKey Resend cohérente (2e ligne de défense)
	try {
		await sendRefundConfirmationEmail({
			to: args.to,
			orderNumber: args.orderNumber,
			customerName: args.customerName,
			refundAmount: args.refundAmount,
			reason: args.reason,
			orderDetailsUrl: args.orderDetailsUrl,
			invoiceNumber: args.invoiceNumber,
			creditNoteNumber: args.creditNoteNumber,
			// ORD-STRIPE-005 : clé unique commune (Resend 24h dédup en backup)
			idempotencyKey: `refund-confirm-${refundId}`,
		});
		return { sent: true, skipped: false };
	} catch (error) {
		// L'envoi a échoué après le claim DB. Le flag reste posé pour éviter
		// le triple-envoi par un autre process, mais le cron reconcile-refunds
		// pourra retenter le pipeline complet si nécessaire. On laisse remonter
		// l'erreur au caller pour qu'il logge dans son contexte.
		logger.error(`[REFUND-EMAIL] Send failed for refund ${refundId}`, error, { refundId });
		return { sent: false, skipped: false, reason: "send_failed" };
	}
}
