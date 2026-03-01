import { BackInStockEmail } from "@/emails/back-in-stock-email";
import { EMAIL_CONTACT, EMAIL_SUBJECTS } from "../constants/email.constants";
import { renderAndSend } from "./send-email";
import type { EmailResult } from "../types/email.types";

/**
 * Envoie un email de notification retour en stock pour un produit en wishlist
 */
export async function sendBackInStockEmail({
	to,
	customerName,
	productTitle,
	productUrl,
	unsubscribeUrl,
}: {
	to: string;
	customerName: string;
	productTitle: string;
	productUrl: string;
	unsubscribeUrl: string;
}): Promise<EmailResult> {
	return renderAndSend(
		BackInStockEmail({ customerName, productTitle, productUrl, unsubscribeUrl }),
		{
			to,
			subject: EMAIL_SUBJECTS.BACK_IN_STOCK,
			replyTo: EMAIL_CONTACT,
			headers: {
				"List-Unsubscribe": `<${unsubscribeUrl}>`,
				"List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
			},
			tags: [{ name: "category", value: "marketing" }],
		},
	);
}
