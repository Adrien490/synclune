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
	productImageUrl,
	productUrl,
	unsubscribeUrl,
	idempotencyKey,
}: {
	to: string;
	customerName: string;
	productTitle: string;
	productImageUrl?: string | null;
	productUrl: string;
	unsubscribeUrl: string;
	/**
	 * EMAIL-AUDIT-102 : dedup cross-instance Resend 24h. Le flag DB
	 * `WishlistItem.backInStockNotifiedAt` n'est posé qu'APRÈS l'envoi (en batch) ;
	 * un crash entre send réussi et écriture du flag, ou deux événements restock
	 * concurrents, pourraient re-sélectionner l'item et renvoyer l'email. Cette clé
	 * (`back-in-stock:${wishlistItemId}`) garantit qu'un même item ne déclenche
	 * qu'un seul envoi réel côté Resend dans la fenêtre 24h.
	 */
	idempotencyKey?: string;
}): Promise<EmailResult> {
	return renderAndSend(
		BackInStockEmail({ customerName, productTitle, productImageUrl, productUrl, unsubscribeUrl }),
		{
			to,
			subject: EMAIL_SUBJECTS.BACK_IN_STOCK,
			replyTo: EMAIL_CONTACT,
			unsubscribeUrl,
			tags: [{ name: "category", value: "marketing" }],
			...(idempotencyKey ? { idempotencyKey } : {}),
		},
	);
}
