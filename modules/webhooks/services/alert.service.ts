import { sendWebhookFailedAlertEmail } from "@/modules/emails/services/admin-emails";

interface WebhookFailedAlertParams {
	eventId: string;
	eventType: string;
	attempts: number;
	error: string;
}

/**
 * P0.2: Envoie une alerte admin lorsqu'un webhook échoue plusieurs fois
 *
 * Appelé après 3 tentatives échouées pour alerter l'admin
 * d'un problème potentiel nécessitant une intervention manuelle.
 */
export async function sendWebhookFailedAlert({
	eventId,
	eventType,
	attempts,
	error,
}: WebhookFailedAlertParams): Promise<{ success: boolean; error?: unknown }> {
	const result = await sendWebhookFailedAlertEmail({
		eventId,
		eventType,
		attempts,
		error,
	});

	if (!result.success) {
		console.error("[WEBHOOK_ALERT] Erreur envoi alerte:", result.error);
	}

	return result;
}
