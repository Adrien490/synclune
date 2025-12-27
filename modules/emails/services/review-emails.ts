import { render } from "@react-email/components"
import { ReviewRequestEmail } from "@/emails/review-request-email"
import { ReviewResponseEmail } from "@/emails/review-response-email"
import { EMAIL_SUBJECTS } from "../constants/email.constants"
import { sendEmail } from "./send-email"
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
	const html = await render(
		ReviewRequestEmail({ customerName, orderNumber, products, reviewUrl })
	)
	console.log(
		`✅ [EMAIL] Review request sent to ${to} for order ${orderNumber}`
	)
	return sendEmail({ to, subject: EMAIL_SUBJECTS.REVIEW_REQUEST, html })
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
	const html = await render(
		ReviewResponseEmail({
			customerName,
			productTitle,
			reviewContent,
			responseContent,
			responseAuthorName,
			productUrl,
		})
	)
	console.log(`✅ [EMAIL] Review response sent to ${to} for ${productTitle}`)
	return sendEmail({ to, subject: EMAIL_SUBJECTS.REVIEW_RESPONSE, html })
}
