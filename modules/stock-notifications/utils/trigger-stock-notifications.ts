import { prisma } from "@/shared/lib/prisma";
import { StockNotificationStatus } from "@/app/generated/prisma/client";
import { notifyStockAvailable } from "../actions/notify-stock-available";

/**
 * Vérifie si un SKU a des notifications en attente et déclenche l'envoi
 *
 * Cette fonction est destinée à être appelée après une mise à jour de stock
 * pour déclencher automatiquement l'envoi des notifications.
 *
 * @param skuId - ID du SKU dont le stock a changé
 * @param previousInventory - Stock avant la modification
 * @param newInventory - Stock après la modification
 */
export async function triggerStockNotificationsIfNeeded(
	skuId: string,
	previousInventory: number,
	newInventory: number
): Promise<void> {
	// Ne rien faire si le stock n'est pas passé de 0 à > 0
	if (previousInventory > 0 || newInventory <= 0) {
		return;
	}

	// Vérifier s'il y a des demandes en attente
	const hasPendingNotifications =
		await prisma.stockNotificationRequest.findFirst({
			where: {
				skuId,
				status: StockNotificationStatus.PENDING,
			},
			select: { id: true },
		});

	if (!hasPendingNotifications) {
		return;
	}

	// Déclencher l'envoi des notifications (en background)
	// Note: On n'attend pas la fin pour ne pas bloquer l'opération principale
	notifyStockAvailable(skuId).catch((error) => {
		console.error(
			`[triggerStockNotificationsIfNeeded] Error sending notifications for SKU ${skuId}:`,
			error
		);
	});
}

/**
 * Compte le nombre de demandes de notification en attente pour un SKU
 *
 * Utile pour afficher un badge dans l'admin ou sur la fiche produit
 *
 * @param skuId - ID du SKU
 * @returns Nombre de demandes en attente
 */
export async function countPendingNotificationsForSku(
	skuId: string
): Promise<number> {
	return prisma.stockNotificationRequest.count({
		where: {
			skuId,
			status: StockNotificationStatus.PENDING,
		},
	});
}

/**
 * Vérifie si un email a déjà une demande en attente pour un SKU
 *
 * @param email - Email du demandeur
 * @param skuId - ID du SKU
 * @returns true si une demande en attente existe
 */
export async function isAlreadySubscribed(
	email: string,
	skuId: string
): Promise<boolean> {
	const existing = await prisma.stockNotificationRequest.findFirst({
		where: {
			email: email.toLowerCase(),
			skuId,
			status: StockNotificationStatus.PENDING,
		},
		select: { id: true },
	});

	return existing !== null;
}
