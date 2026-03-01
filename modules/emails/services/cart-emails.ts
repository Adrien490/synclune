import { AbandonedCartEmail } from "@/emails/abandoned-cart-email";
import { EMAIL_CONTACT, EMAIL_SUBJECTS } from "../constants/email.constants";
import { renderAndSend } from "./send-email";
import type { EmailResult } from "../types/email.types";

interface CartItemData {
	productTitle: string;
	skuColor: string | null;
	skuMaterial: string | null;
	quantity: number;
	price: number;
}

/**
 * Envoie un email de relance panier abandonne
 */
export async function sendAbandonedCartEmail({
	to,
	customerName,
	items,
	total,
	cartUrl,
	unsubscribeUrl,
}: {
	to: string;
	customerName: string;
	items: CartItemData[];
	total: number;
	cartUrl: string;
	unsubscribeUrl: string;
}): Promise<EmailResult> {
	return renderAndSend(
		AbandonedCartEmail({ customerName, items, total, cartUrl, unsubscribeUrl }),
		{
			to,
			subject: EMAIL_SUBJECTS.ABANDONED_CART,
			replyTo: EMAIL_CONTACT,
			headers: {
				"List-Unsubscribe": `<${unsubscribeUrl}>`,
				"List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
			},
			tags: [{ name: "category", value: "marketing" }],
		},
	);
}
