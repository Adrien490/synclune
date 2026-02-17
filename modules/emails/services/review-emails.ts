import { ReviewRequestEmail } from "@/emails/review-request-email"
import { ReviewResponseEmail } from "@/emails/review-response-email"
import { EMAIL_CONTACT, EMAIL_SUBJECTS } from "../constants/email.constants"
import { renderAndSend } from "./send-email"
import type { EmailResult } from "../types/email.types"

/**
 * Envoie un email de demande d'avis apres livraison
 */
export async function sendReviewRequestEmail({
	to,
	customerName,
	orderNumber,
	products,
	reviewUrl,
}: {
	to: string
	customerName: string
	orderNumber: string
	products: Array<{
		title: string
		slug: string
		imageUrl: string | null
		skuVariants: string | null
	}>
	reviewUrl: string
}): Promise<EmailResult> {
	return renderAndSend(ReviewRequestEmail({ customerName, orderNumber, products, reviewUrl }), {
		to,
		subject: EMAIL_SUBJECTS.REVIEW_REQUEST,
		replyTo: EMAIL_CONTACT,
		tags: [{ name: "category", value: "order" }],
	})
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
	to: string
	customerName: string
	productTitle: string
	reviewContent: string
	responseContent: string
	responseAuthorName: string
	productUrl: string
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
	)
}
