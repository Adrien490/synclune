import { BackInStockEmail } from "@/emails/back-in-stock-email";
import { EMAIL_SUBJECTS } from "../constants/email.constants";
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
}: {
	to: string;
	customerName: string;
	productTitle: string;
	productUrl: string;
}): Promise<EmailResult> {
	return renderAndSend(BackInStockEmail({ customerName, productTitle, productUrl }), {
		to,
		subject: EMAIL_SUBJECTS.BACK_IN_STOCK,
		tags: [{ name: "category", value: "marketing" }],
	});
}
