import { CrossSellEmail } from "@/emails/cross-sell-email";
import { EMAIL_SUBJECTS } from "../constants/email.constants";
import { renderAndSend } from "./send-email";
import type { EmailResult } from "../types/email.types";

interface SuggestedProduct {
	title: string;
	imageUrl: string | null;
	price: number;
	productUrl: string;
}

/**
 * Envoie un email de cross-sell post-livraison
 */
export async function sendCrossSellEmail({
	to,
	customerName,
	products,
	shopUrl,
	unsubscribeUrl,
}: {
	to: string;
	customerName: string;
	products: SuggestedProduct[];
	shopUrl: string;
	unsubscribeUrl: string;
}): Promise<EmailResult> {
	return renderAndSend(CrossSellEmail({ customerName, products, shopUrl }), {
		to,
		subject: EMAIL_SUBJECTS.CROSS_SELL,
		headers: {
			"List-Unsubscribe": `<${unsubscribeUrl}>`,
			"List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
		},
		tags: [{ name: "category", value: "marketing" }],
	});
}
