import { CancelOrderConfirmationEmail } from "@/emails/cancel-order-confirmation-email";
import { EMAIL_CONTACT, EMAIL_SUBJECTS } from "../constants/email.constants";
import { renderAndSend } from "./send-email";
import type { EmailResult } from "../types/email.types";

/**
 * Envoie un email de confirmation d'annulation de commande au client
 */
export async function sendCancelOrderConfirmationEmail({
	to,
	orderNumber,
	customerName,
	orderTotal,
	reason,
	wasRefunded,
	orderDetailsUrl,
}: {
	to: string;
	orderNumber: string;
	customerName: string;
	orderTotal: number;
	reason?: string;
	wasRefunded: boolean;
	orderDetailsUrl: string;
}): Promise<EmailResult> {
	return renderAndSend(
		CancelOrderConfirmationEmail({
			orderNumber,
			customerName,
			orderTotal,
			reason,
			wasRefunded,
			orderDetailsUrl,
		}),
		{
			to,
			subject: EMAIL_SUBJECTS.ORDER_CANCELLED,
			replyTo: EMAIL_CONTACT,
			tags: [{ name: "category", value: "order" }],
		},
	);
}
