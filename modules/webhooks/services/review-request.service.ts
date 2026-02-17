import { sendReviewRequestEmailInternal } from "@/modules/reviews/services/send-review-request-email.service";
import { ActionStatus } from "@/shared/types/server-action";

/**
 * Service pour gerer l'envoi automatique des emails de demande d'avis
 * apres qu'une commande soit livree.
 */

interface ScheduleReviewRequestResult {
	success: boolean;
	message?: string;
	error?: string;
}

/**
 * Planifie l'envoi d'un email de demande d'avis pour une commande livree.
 *
 * Note: Actuellement l'email est envoye immediatement.
 * Une amelioration future serait d'utiliser un systeme de taches planifiees
 * pour envoyer l'email 2-3 jours apres la livraison.
 *
 * @param orderId - L'ID de la commande
 */
export async function scheduleReviewRequestEmail(
	orderId: string
): Promise<ScheduleReviewRequestResult> {
	try {
		const result = await sendReviewRequestEmailInternal(orderId);

		if (result.status !== ActionStatus.SUCCESS) {
			// Log mais ne bloque pas le flux principal (la livraison est plus importante)
			console.warn(
				`[REVIEW_REQUEST] Could not send review request email for order ${orderId}: ${result.message}`
			);
			return {
				success: false,
				error: result.message,
			};
		}

		console.log(`[REVIEW_REQUEST] Review request email scheduled for order ${orderId}`);
		return {
			success: true,
			message: result.message,
		};
	} catch (error) {
		// Ne jamais faire echouer le flux principal a cause de l'email d'avis
		console.error(`[REVIEW_REQUEST] Error scheduling review request email for order ${orderId}:`, error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * Planifie l'envoi d'emails de demande d'avis pour plusieurs commandes.
 * Utilisé lors du bulk mark as delivered.
 *
 * @param orderIds - Les IDs des commandes
 */
export async function scheduleReviewRequestEmailsBulk(
	orderIds: string[]
): Promise<{ sent: number; failed: number }> {
	let sent = 0;
	let failed = 0;

	// Traitement séquentiel pour éviter de surcharger le service d'email
	for (const orderId of orderIds) {
		const result = await scheduleReviewRequestEmail(orderId);
		if (result.success) {
			sent++;
		} else {
			failed++;
		}
	}

	console.log(
		`[REVIEW_REQUEST] Bulk review request emails: ${sent} sent, ${failed} failed`
	);

	return { sent, failed };
}
