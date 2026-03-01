import { ReviewReminderEmail } from "@/emails/review-reminder-email";
import { ReviewRequestEmail } from "@/emails/review-request-email";
import { ReviewResponseEmail } from "@/emails/review-response-email";
import { EMAIL_CONTACT, EMAIL_SUBJECTS } from "../constants/email.constants";
import { renderAndSend } from "./send-email";
import type { EmailResult } from "../types/email.types";

/**
 * Envoie un email de demande d'avis apres livraison
 */
export async function sendReviewRequestEmail({
	to,
	customerName,
	orderNumber,
	products,
	reviewUrl,
	unsubscribeUrl,
}: {
	to: string;
	customerName: string;
	orderNumber: string;
	products: Array<{
		title: string;
		slug: string;
		imageUrl: string | null;
		skuVariants: string | null;
	}>;
	reviewUrl: string;
	unsubscribeUrl: string;
}): Promise<EmailResult> {
	return renderAndSend(
		ReviewRequestEmail({ customerName, orderNumber, products, reviewUrl, unsubscribeUrl }),
		{
			to,
			subject: EMAIL_SUBJECTS.REVIEW_REQUEST,
			replyTo: EMAIL_CONTACT,
			headers: {
				"List-Unsubscribe": `<${unsubscribeUrl}>`,
				"List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
			},
			tags: [{ name: "category", value: "order" }],
		},
	);
}

/**
 * Envoie un rappel de demande d'avis (2e tentative)
 */
export async function sendReviewReminderEmail({
	to,
	customerName,
	orderNumber,
	reviewUrl,
	unsubscribeUrl,
}: {
	to: string;
	customerName: string;
	orderNumber: string;
	reviewUrl: string;
	unsubscribeUrl: string;
}): Promise<EmailResult> {
	return renderAndSend(
		ReviewReminderEmail({ customerName, orderNumber, reviewUrl, unsubscribeUrl }),
		{
			to,
			subject: EMAIL_SUBJECTS.REVIEW_REMINDER,
			replyTo: EMAIL_CONTACT,
			headers: {
				"List-Unsubscribe": `<${unsubscribeUrl}>`,
				"List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
			},
			tags: [{ name: "category", value: "order" }],
		},
	);
}

/**
 * Envoie un email au client quand un admin repond a son avis
 */
export async function sendReviewResponseEmail({
	to,
	customerName,
	productTitle,
	reviewContent,
	responseContent,
	responseAuthorName,
	productUrl,
}: {
	to: string;
	customerName: string;
	productTitle: string;
	reviewContent: string;
	responseContent: string;
	responseAuthorName: string;
	productUrl: string;
}): Promise<EmailResult> {
	return renderAndSend(
		ReviewResponseEmail({
			customerName,
			productTitle,
			reviewContent,
			responseContent,
			responseAuthorName,
			productUrl,
		}),
		{
			to,
			subject: EMAIL_SUBJECTS.REVIEW_RESPONSE,
			replyTo: EMAIL_CONTACT,
			tags: [{ name: "category", value: "order" }],
		},
	);
}
