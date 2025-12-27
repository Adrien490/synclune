import { render } from "@react-email/components"
import { BackInStockEmail } from "@/emails/back-in-stock-email"
import { EMAIL_SUBJECTS } from "../constants/email.constants"
import { sendEmail } from "./send-email"
import type { EmailResult } from "../types/email.types"

/**
 * Envoie un email de notification de retour en stock
 */
export async function sendBackInStockEmail({
	to,
	productTitle,
	productUrl,
	skuColor,
	skuMaterial,
	skuSize,
	skuImageUrl,
	price,
	availableQuantity,
	unsubscribeUrl,
}: {
	to: string
	productTitle: string
	productUrl: string
	skuColor: string | null
	skuMaterial: string | null
	skuSize: string | null
	skuImageUrl: string | null
	price: number
	availableQuantity: number
	unsubscribeUrl: string
}): Promise<EmailResult> {
	const html = await render(
		BackInStockEmail({
			productTitle,
			productUrl,
			skuColor,
			skuMaterial,
			skuSize,
			skuImageUrl,
			price,
			availableQuantity,
			unsubscribeUrl,
		})
	)
	console.log(
		`✅ [EMAIL] Back in stock notification sent to ${to} for ${productTitle}`
	)
	return sendEmail({ to, subject: EMAIL_SUBJECTS.BACK_IN_STOCK, html })
}
