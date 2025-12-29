import { Resend } from "resend";
import { EMAIL_FROM, EMAIL_ADMIN } from "@/shared/lib/email-config";
import { getBaseUrl, EXTERNAL_URLS } from "@/shared/constants/urls";

const resend = new Resend(process.env.RESEND_API_KEY);

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
	try {
		const baseUrl = getBaseUrl();
		const stripeDashboardUrl = EXTERNAL_URLS.STRIPE.WEBHOOKS;

		// Email simple en HTML (pas de template React pour les alertes techniques)
		const html = `
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<style>
		body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
		.container { max-width: 600px; margin: 0 auto; padding: 20px; }
		.alert { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin-bottom: 20px; }
		.alert h1 { color: #dc2626; margin: 0 0 8px 0; font-size: 18px; }
		.details { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; }
		.details dt { font-weight: 600; color: #374151; margin-top: 12px; }
		.details dd { margin: 4px 0 0 0; color: #6b7280; }
		.error { background: #1f2937; color: #f87171; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 13px; overflow-x: auto; }
		.actions { margin-top: 20px; }
		.actions a { display: inline-block; background: #3b82f6; color: white; padding: 10px 16px; border-radius: 6px; text-decoration: none; margin-right: 8px; }
		.actions a:hover { background: #2563eb; }
	</style>
</head>
<body>
	<div class="container">
		<div class="alert">
			<h1>Webhook Stripe en echec</h1>
			<p>Un webhook a echoue apres <strong>${attempts} tentatives</strong>. Une action manuelle peut etre requise.</p>
		</div>

		<div class="details">
			<dl>
				<dt>Event ID</dt>
				<dd>${eventId}</dd>

				<dt>Type d'evenement</dt>
				<dd>${eventType}</dd>

				<dt>Tentatives</dt>
				<dd>${attempts}</dd>

				<dt>Derniere erreur</dt>
				<dd class="error">${error}</dd>
			</dl>
		</div>

		<div class="actions">
			<a href="${stripeDashboardUrl}">Voir dans Stripe</a>
			<a href="${baseUrl}/admin">Dashboard Admin</a>
		</div>

		<p style="margin-top: 24px; font-size: 13px; color: #9ca3af;">
			Cet email a ete envoye automatiquement par le systeme de monitoring Synclune.
		</p>
	</div>
</body>
</html>
		`.trim();

		const { data, error: sendError } = await resend.emails.send({
			from: EMAIL_FROM,
			to: EMAIL_ADMIN,
			subject: `[ALERTE] Webhook ${eventType} echoue (${attempts} tentatives)`,
			html,
		});

		if (sendError) {
			console.error("[WEBHOOK_ALERT] Erreur envoi alerte:", sendError);
			return { success: false, error: sendError };
		}

		console.log(`[WEBHOOK_ALERT] Alerte envoyee pour ${eventId}`);
		return { success: true };
	} catch (error) {
		console.error("[WEBHOOK_ALERT] Exception:", error);
		return { success: false, error };
	}
}
