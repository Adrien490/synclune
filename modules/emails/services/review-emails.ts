import { ReviewRequestEmail } from "@/emails/review-request-email";
import { EMAIL_CONTACT, EMAIL_SUBJECTS } from "../constants/email.constants";
import { renderAndSend } from "./send-email";
import type { EmailResult } from "../types/email.types";

/**
 * Envoie un email de demande d'avis post-livraison à un client authentifié.
 *
 * Une seule fois par commande, J+7 après `actualDelivery` (cf. cron
 * `send-review-requests`). Le déclencheur est géré côté service appelant
 * (`modules/reviews/services/send-review-requests.service.ts`) ; cette
 * fonction se contente d'envoyer.
 *
 * Inclut `List-Unsubscribe` (RFC 8058 one-click) car catégorie commerciale.
 */
export async function sendReviewRequestEmail({
	to,
	customerName,
	orderNumber,
	items,
	unsubscribeUrl,
}: {
	to: string;
	customerName: string;
	orderNumber: string;
	items: Array<{
		productTitle: string;
		productSlug: string;
		productUrl: string;
		productImageUrl?: string | null;
	}>;
	unsubscribeUrl: string;
}): Promise<EmailResult> {
	return renderAndSend(ReviewRequestEmail({ customerName, orderNumber, items, unsubscribeUrl }), {
		to,
		subject: EMAIL_SUBJECTS.REVIEW_REQUEST,
		replyTo: EMAIL_CONTACT,
		unsubscribeUrl,
		tags: [
			{ name: "category", value: "review" },
			{ name: "transactional", value: "false" },
		],
	});
}
