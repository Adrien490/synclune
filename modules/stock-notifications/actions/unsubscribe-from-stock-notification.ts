"use server";

import { headers } from "next/headers";
import { prisma } from "@/shared/lib/prisma";
import { ActionState, ActionStatus } from "@/shared/types/server-action";
import { StockNotificationStatus } from "@/app/generated/prisma/client";
import { updateTag } from "next/cache";
import { auth } from "@/modules/auth/lib/auth";
import { unsubscribeFromStockNotificationSchema } from "../schemas/stock-notification.schemas";
import { getStockNotificationInvalidationTags } from "../constants/cache";
import { getNotificationByToken } from "../data/get-notification-by-token";

/**
 * Server Action pour se désinscrire d'une notification de retour en stock
 *
 * Permet à un utilisateur de se désinscrire via un lien contenant son token unique.
 * Le token est envoyé dans l'email de notification ou peut être accessible
 * depuis son compte.
 */
export async function unsubscribeFromStockNotification(
	_previousState: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		// Validation des données
		const token = formData.get("token");

		const result = unsubscribeFromStockNotificationSchema.safeParse({ token });

		if (!result.success) {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: "Le lien de désinscription est invalide",
			};
		}

		const { token: validatedToken } = result.data;

		// Récupérer la demande de notification
		const notification = await getNotificationByToken(validatedToken);

		if (!notification) {
			return {
				status: ActionStatus.NOT_FOUND,
				message: "Cette demande de notification n'existe pas",
			};
		}

		// Vérifier le statut actuel
		if (notification.status === StockNotificationStatus.CANCELLED) {
			return {
				status: ActionStatus.CONFLICT,
				message: "Vous êtes déjà désinscrit(e) de cette notification",
			};
		}

		if (notification.status === StockNotificationStatus.NOTIFIED) {
			return {
				status: ActionStatus.CONFLICT,
				message:
					"Cette notification a déjà été envoyée. Elle ne sera pas envoyée à nouveau.",
			};
		}

		// Annuler la demande
		await prisma.stockNotificationRequest.update({
			where: { id: notification.id },
			data: {
				status: StockNotificationStatus.CANCELLED,
			},
		});

		// Invalider le cache
		const tagsToInvalidate = getStockNotificationInvalidationTags(
			notification.skuId,
			notification.userId
		);
		tagsToInvalidate.forEach((tag) => updateTag(tag));

		return {
			status: ActionStatus.SUCCESS,
			message: `Vous ne recevrez plus de notification pour "${notification.sku.product.title}".`,
		};
	} catch (error) {
		console.error("[unsubscribeFromStockNotification] Error:", error);
		return {
			status: ActionStatus.ERROR,
			message: "Une erreur est survenue. Veuillez réessayer plus tard.",
		};
	}
}

/**
 * Server Action pour annuler une notification par ID (pour utilisateur connecté ou admin)
 * Compatible avec useActionState
 */
export async function cancelStockNotification(
	_: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		const notificationId = formData.get("notificationId") as string;

		if (!notificationId) {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: "ID de notification requis",
			};
		}

		// 1. Vérifier l'authentification
		const headersList = await headers();
		const session = await auth.api.getSession({ headers: headersList });

		if (!session?.user) {
			return {
				status: ActionStatus.UNAUTHORIZED,
				message: "Vous devez être connecté pour effectuer cette action",
			};
		}

		// 2. Récupérer la demande de notification avec email
		const notification = await prisma.stockNotificationRequest.findUnique({
			where: { id: notificationId },
			select: {
				id: true,
				skuId: true,
				userId: true,
				email: true,
				status: true,
				sku: {
					select: {
						product: {
							select: { title: true },
						},
					},
				},
			},
		});

		if (!notification) {
			return {
				status: ActionStatus.NOT_FOUND,
				message: "Cette demande de notification n'existe pas",
			};
		}

		// 3. Vérifier ownership ou admin
		const isOwner =
			notification.userId === session.user.id ||
			notification.email.toLowerCase() === session.user.email?.toLowerCase();
		const isAdmin = session.user.role === "ADMIN";

		if (!isOwner && !isAdmin) {
			return {
				status: ActionStatus.FORBIDDEN,
				message: "Vous n'êtes pas autorisé à annuler cette notification",
			};
		}

		// 4. Vérifier le statut
		if (notification.status !== StockNotificationStatus.PENDING) {
			return {
				status: ActionStatus.CONFLICT,
				message: "Cette notification ne peut plus être annulée",
			};
		}

		// 5. Annuler la demande
		await prisma.stockNotificationRequest.update({
			where: { id: notificationId },
			data: {
				status: StockNotificationStatus.CANCELLED,
			},
		});

		// 6. Invalider le cache
		const tagsToInvalidate = getStockNotificationInvalidationTags(
			notification.skuId,
			notification.userId
		);
		tagsToInvalidate.forEach((tag) => updateTag(tag));

		return {
			status: ActionStatus.SUCCESS,
			message: `Notification annulée pour "${notification.sku.product.title}".`,
		};
	} catch (error) {
		console.error("[cancelStockNotification] Error:", error);
		return {
			status: ActionStatus.ERROR,
			message: "Une erreur est survenue. Veuillez réessayer plus tard.",
		};
	}
}
