import { prisma } from "@/shared/lib/prisma";
import { BATCH_SIZE_SMALL, BATCH_DEADLINE_MS, MAX_EMAIL_RETRY_ATTEMPTS } from "../constants/limits";
import { sendShippingConfirmationEmail, sendOrderConfirmationEmail, sendDeliveryConfirmationEmail, sendTrackingUpdateEmail } from "@/modules/emails/services/order-emails";
import { sendCancelOrderConfirmationEmail, sendReturnConfirmationEmail } from "@/modules/emails/services/status-emails";
import { sendRefundConfirmationEmail, sendRefundApprovedEmail, sendRefundRejectedEmail } from "@/modules/emails/services/refund-emails";
import { sendPaymentFailedEmail } from "@/modules/emails/services/payment-emails";
import { sendAdminNewOrderEmail } from "@/modules/emails/services/admin-emails";


type EmailSender = (payload: Record<string, unknown>) => Promise<unknown>;

const EMAIL_SENDERS: Record<string, EmailSender> = {
	// Admin action emails (from mark-as-shipped/delivered/returned actions)
	"shipping-confirmation": (p) =>
		sendShippingConfirmationEmail(p as Parameters<typeof sendShippingConfirmationEmail>[0]),
	"delivery-confirmation": (p) =>
		sendDeliveryConfirmationEmail(p as Parameters<typeof sendDeliveryConfirmationEmail>[0]),
	"return-confirmation": (p) =>
		sendReturnConfirmationEmail(p as Parameters<typeof sendReturnConfirmationEmail>[0]),
	// Webhook-triggered emails (from execute-post-tasks)
	"order-confirmation": (p) =>
		sendOrderConfirmationEmail(p as Parameters<typeof sendOrderConfirmationEmail>[0]),
	"admin-new-order": (p) =>
		sendAdminNewOrderEmail(p as Parameters<typeof sendAdminNewOrderEmail>[0]),
	"refund-confirmation": (p) =>
		sendRefundConfirmationEmail(p as Parameters<typeof sendRefundConfirmationEmail>[0]),
	"payment-failed": (p) =>
		sendPaymentFailedEmail(p as Parameters<typeof sendPaymentFailedEmail>[0]),
	// Admin action emails (from cancel-order, approve/reject-refund, update-tracking)
	"cancel-order-confirmation": (p) =>
		sendCancelOrderConfirmationEmail(p as Parameters<typeof sendCancelOrderConfirmationEmail>[0]),
	"refund-approved": (p) =>
		sendRefundApprovedEmail(p as Parameters<typeof sendRefundApprovedEmail>[0]),
	"refund-rejected": (p) =>
		sendRefundRejectedEmail(p as Parameters<typeof sendRefundRejectedEmail>[0]),
	"tracking-update": (p) =>
		sendTrackingUpdateEmail(p as Parameters<typeof sendTrackingUpdateEmail>[0]),
};

/**
 * Retries failed transactional emails
 * Called by the retry-failed-emails cron job every 15 minutes
 */
export async function retryFailedEmails(): Promise<{
	found: number;
	retried: number;
	exhausted: number;
	errors: number;
}> {
	const startTime = Date.now();

	const failedEmails = await prisma.failedEmail.findMany({
		where: {
			status: "PENDING",
			attempts: { lt: MAX_EMAIL_RETRY_ATTEMPTS },
		},
		orderBy: { createdAt: "asc" },
		take: BATCH_SIZE_SMALL,
	});

	let retried = 0;
	let exhausted = 0;
	let errors = 0;

	for (const email of failedEmails) {
		if (Date.now() - startTime > BATCH_DEADLINE_MS) {
			console.log("[RETRY_EMAILS] Deadline reached, stopping early");
			break;
		}

		const sender = EMAIL_SENDERS[email.template];
		if (!sender) {
			console.error(`[RETRY_EMAILS] Unknown template: ${email.template}`);
			await prisma.failedEmail.update({
				where: { id: email.id },
				data: {
					status: "EXHAUSTED",
					lastError: `Unknown template: ${email.template}`,
					attempts: email.attempts + 1,
				},
			});
			exhausted++;
			continue;
		}

		try {
			const payload = email.payload as Record<string, unknown>;
			// Re-inject the `to` field into the payload
			await sender({ ...payload, to: email.to });

			await prisma.failedEmail.update({
				where: { id: email.id },
				data: { status: "RETRIED", attempts: email.attempts + 1 },
			});
			retried++;
			console.log(`[RETRY_EMAILS] Retried successfully: ${email.template} to ${email.to}`);
		} catch (e) {
			const newAttempts = email.attempts + 1;
			const isExhausted = newAttempts >= MAX_EMAIL_RETRY_ATTEMPTS;

			await prisma.failedEmail.update({
				where: { id: email.id },
				data: {
					status: isExhausted ? "EXHAUSTED" : "PENDING",
					attempts: newAttempts,
					lastError: e instanceof Error ? e.message : String(e),
				},
			});

			if (isExhausted) {
				exhausted++;
			} else {
				errors++;
			}

			console.error(
				`[RETRY_EMAILS] Failed retry (attempt ${newAttempts}/${MAX_EMAIL_RETRY_ATTEMPTS}):`,
				email.template,
				email.to,
				e
			);
		}
	}

	console.log(
		`[RETRY_EMAILS] Done: ${failedEmails.length} found, ${retried} retried, ${exhausted} exhausted, ${errors} errors`
	);

	return { found: failedEmails.length, retried, exhausted, errors };
}
