"use server";

import { prisma } from "@/shared/lib/prisma";
import { StockNotificationStatus } from "@/app/generated/prisma/client";
import { updateTag } from "next/cache";
import { sendBackInStockEmail } from "@/shared/lib/email";
import { requireAdmin } from "@/shared/lib/actions";
import { ActionState, ActionStatus } from "@/shared/types/server-action";
import { getNotifyStockInvalidationTags } from "../constants/cache";
import {
	STOCK_NOTIFICATION_BATCH_SIZE,
	STOCK_NOTIFICATION_COOLDOWN_HOURS,
	STOCK_NOTIFICATION_EMAIL_CONCURRENCY,
	STOCK_NOTIFICATION_WITH_SKU_SELECT,
} from "../constants/stock-notification.constants";
import type { NotifyStockAvailableResult } from "../types/stock-notification.types";

/**
 * Notifie tous les utilisateurs en attente quand un SKU revient en stock
 *
 * Cette action est destinée à être appelée :
 * - Automatiquement quand le stock d'un SKU passe de 0 à > 0
 * - Manuellement par un admin depuis le dashboard
 * - Par un cron job qui vérifie périodiquement les stocks
 *
 * @param skuId - ID du SKU qui est de retour en stock
 * @returns Résultat du traitement avec nombre de notifications envoyées
 */
export async function notifyStockAvailable(
	skuId: string
): Promise<NotifyStockAvailableResult> {
	const result: NotifyStockAvailableResult = {
		totalNotifications: 0,
		successfulNotifications: 0,
		failedNotifications: 0,
		notificationIds: [],
	};

	try {
		// Vérifier que le SKU existe et est en stock
		const sku = await prisma.productSku.findUnique({
			where: { id: skuId },
			select: {
				id: true,
				sku: true,
				inventory: true,
				priceInclTax: true,
				isActive: true,
				color: { select: { name: true } },
				material: { select: { id: true, name: true } },
				size: true,
				images: {
					select: { url: true },
					where: { isPrimary: true },
					take: 1,
				},
				product: {
					select: {
						id: true,
						slug: true,
						title: true,
					},
				},
			},
		});

		if (!sku) {
			console.error(`[notifyStockAvailable] SKU ${skuId} not found`);
			return result;
		}

		if (!sku.isActive) {
			console.warn(`[notifyStockAvailable] SKU ${skuId} is not active`);
			return result;
		}

		if (sku.inventory <= 0) {
			console.warn(`[notifyStockAvailable] SKU ${skuId} is still out of stock`);
			return result;
		}

		// Calculer la date limite du cooldown (24h par défaut)
		const cooldownDate = new Date(
			Date.now() - STOCK_NOTIFICATION_COOLDOWN_HOURS * 60 * 60 * 1000
		);

		// Récupérer toutes les demandes en attente pour ce SKU
		// Exclut les demandes déjà notifiées dans les dernières 24h (cooldown anti-spam)
		const pendingNotifications = await prisma.stockNotificationRequest.findMany(
			{
				where: {
					skuId,
					status: StockNotificationStatus.PENDING,
					// Cooldown: soit jamais notifié, soit notifié il y a plus de 24h
					OR: [
						{ notifiedAt: null },
						{ notifiedAt: { lt: cooldownDate } },
					],
				},
				select: {
					id: true,
					email: true,
					unsubscribeToken: true,
				},
				take: STOCK_NOTIFICATION_BATCH_SIZE,
				orderBy: { createdAt: "asc" },
			}
		);

		if (pendingNotifications.length === 0) {
			console.log(`[notifyStockAvailable] No pending notifications for SKU ${skuId}`);
			return result;
		}

		result.totalNotifications = pendingNotifications.length;

		// Construire les URLs
		const baseUrl = process.env.BETTER_AUTH_URL || "https://synclune.fr";
		const productUrl = `${baseUrl}/creations/${sku.product.slug}`;
		const skuImageUrl = sku.images[0]?.url || null;

		// Collecter les IDs des notifications réussies pour batch update
		const successfulIds: string[] = [];

		// Fonction pour traiter une notification (envoi email seulement)
		const processNotification = async (notification: (typeof pendingNotifications)[0]) => {
			try {
				const unsubscribeUrl = `${baseUrl}/notifications/stock/unsubscribe?token=${notification.unsubscribeToken}`;

				const emailResult = await sendBackInStockEmail({
					to: notification.email,
					productTitle: sku.product.title,
					productUrl,
					skuColor: sku.color?.name || null,
					skuMaterial: sku.material?.name || null,
					skuSize: sku.size,
					skuImageUrl,
					price: sku.priceInclTax,
					availableQuantity: sku.inventory,
					unsubscribeUrl,
				});

				if (emailResult.success) {
					// Collecter l'ID pour batch update ultérieur
					successfulIds.push(notification.id);
					result.successfulNotifications++;
					result.notificationIds.push(notification.id);
				} else {
					result.failedNotifications++;
					console.error(
						`[notifyStockAvailable] Failed to send email to ${notification.email}:`,
						emailResult.error
					);
				}
			} catch (error) {
				result.failedNotifications++;
				console.error(
					`[notifyStockAvailable] Error processing notification ${notification.id}:`,
					error
				);
			}
		};

		// Envoyer les notifications par batch pour limiter la concurrence
		for (let i = 0; i < pendingNotifications.length; i += STOCK_NOTIFICATION_EMAIL_CONCURRENCY) {
			const batch = pendingNotifications.slice(i, i + STOCK_NOTIFICATION_EMAIL_CONCURRENCY);
			await Promise.all(batch.map(processNotification));
		}

		// ⚠️ AUDIT FIX: Batch update de toutes les notifications réussies en une seule requête
		if (successfulIds.length > 0) {
			await prisma.stockNotificationRequest.updateMany({
				where: { id: { in: successfulIds } },
				data: {
					status: StockNotificationStatus.NOTIFIED,
					notifiedAt: new Date(),
					notifiedInventory: sku.inventory,
				},
			});
		}

		// Invalider le cache
		const tagsToInvalidate = getNotifyStockInvalidationTags(skuId);
		tagsToInvalidate.forEach((tag) => updateTag(tag));

		console.log(
			`[notifyStockAvailable] Completed for SKU ${skuId}: ${result.successfulNotifications}/${result.totalNotifications} notifications sent`
		);

		return result;
	} catch (error) {
		console.error("[notifyStockAvailable] Error:", error);
		return result;
	}
}

/**
 * Vérifie et notifie tous les SKUs qui sont revenus en stock
 *
 * Cette fonction est destinée à être appelée par un cron job
 * pour traiter tous les SKUs qui ont des demandes en attente
 * et qui sont maintenant en stock.
 *
 * @returns Nombre total de notifications envoyées
 */
export async function processAllPendingStockNotifications(): Promise<{
	skusProcessed: number;
	totalNotificationsSent: number;
}> {
	try {
		// Trouver tous les SKUs avec des demandes en attente ET du stock disponible
		const skusWithPendingNotifications = await prisma.productSku.findMany({
			where: {
				inventory: { gt: 0 },
				isActive: true,
				stockNotificationRequests: {
					some: {
						status: StockNotificationStatus.PENDING,
					},
				},
			},
			select: { id: true },
		});

		let totalNotificationsSent = 0;

		for (const sku of skusWithPendingNotifications) {
			const result = await notifyStockAvailable(sku.id);
			totalNotificationsSent += result.successfulNotifications;
		}

		console.log(
			`[processAllPendingStockNotifications] Processed ${skusWithPendingNotifications.length} SKUs, sent ${totalNotificationsSent} notifications`
		);

		return {
			skusProcessed: skusWithPendingNotifications.length,
			totalNotificationsSent,
		};
	} catch (error) {
		console.error("[processAllPendingStockNotifications] Error:", error);
		return {
			skusProcessed: 0,
			totalNotificationsSent: 0,
		};
	}
}

/**
 * Server Action pour envoyer manuellement les notifications (admin uniquement)
 * Compatible avec useActionState
 */
export async function notifyStockAvailableAction(
	_: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	const admin = await requireAdmin();
	if (!admin) {
		return {
			status: ActionStatus.UNAUTHORIZED,
			message: "Accès non autorisé. Droits administrateur requis.",
		};
	}

	const skuId = formData.get("skuId") as string;

	if (!skuId) {
		return {
			status: ActionStatus.VALIDATION_ERROR,
			message: "ID de SKU requis",
		};
	}

	const result = await notifyStockAvailable(skuId);

	if (result.successfulNotifications > 0) {
		return {
			status: ActionStatus.SUCCESS,
			message: `${result.successfulNotifications} notification(s) envoyée(s)`,
			data: result,
		};
	}

	if (result.totalNotifications === 0) {
		return {
			status: ActionStatus.ERROR,
			message: "Aucune notification en attente pour ce produit",
		};
	}

	return {
		status: ActionStatus.ERROR,
		message: "Échec de l'envoi des notifications",
		data: result,
	};
}
