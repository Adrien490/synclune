/**
 * Shared test factories — volontairement MINIMAL depuis le schéma lean :
 * les anciennes usines (ordre complet, WebhookEvent, refunds…) décrivaient des
 * modèles disparus et n'avaient plus que deux consommateurs réels.
 */

export const VALID_CUID = "cm1234567890abcdefghijklm";

export function createMockFormData(entries: Record<string, string | null>): FormData {
	const formData = new FormData();
	for (const [key, value] of Object.entries(entries)) {
		if (value !== null) {
			formData.set(key, value);
		}
	}
	return formData;
}
