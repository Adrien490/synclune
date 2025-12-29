import { countPendingNotificationsBySku } from "../data/get-pending-notifications-by-sku";
import { notifyStockAvailable } from "../actions/notify-stock-available";

/**
 * Verifie si un SKU a des notifications en attente et declenche l'envoi
 *
 * Cette fonction est destinee a etre appelee depuis une action apres une mise a jour de stock
 * pour declencher automatiquement l'envoi des notifications.
 *
 * Note: Ce service appelle une action (notifyStockAvailable) - c'est une exception
 * au pattern standard car la logique de declenchement est liee au domaine stock-notifications.
 * Similaire a l'exception documentee pour le module webhooks dans CLAUDE.md.
 *
 * Note: Utilise countPendingNotificationsBySku du layer data/ (avec cache).
 * Le cache est acceptable ici car on verifie juste s'il y a des notifications
 * a envoyer, pas le nombre exact.
 *
 * @param skuId - ID du SKU dont le stock a change
 * @param previousInventory - Stock avant la modification
 * @param newInventory - Stock apres la modification
 */
export async function triggerStockNotificationsIfNeeded(
	skuId: string,
	previousInventory: number,
	newInventory: number
): Promise<void> {
	// Ne rien faire si le stock n'est pas passe de 0 a > 0
	if (previousInventory > 0 || newInventory <= 0) {
		return;
	}

	// Verifier s'il y a des demandes en attente (via data/ avec cache)
	const pendingCount = await countPendingNotificationsBySku(skuId);

	if (pendingCount === 0) {
		return;
	}

	// Declencher l'envoi des notifications (en background)
	// Note: On n'attend pas la fin pour ne pas bloquer l'operation principale
	notifyStockAvailable(skuId).catch((error) => {
		console.error(
			`[triggerStockNotificationsIfNeeded] Error sending notifications for SKU ${skuId}:`,
			error
		);
	});
}
