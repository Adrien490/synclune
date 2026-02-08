"use server";

import { headers } from "next/headers";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { StockNotificationStatus } from "@/app/generated/prisma/client";
import { updateTag } from "next/cache";
import { auth } from "@/modules/auth/lib/auth";
import {
	validateInput,
	handleActionError,
	success,
	error,
	notFound,
	unauthorized,
	forbidden,
	validationError,
} from "@/shared/lib/actions";
import { unsubscribeFromStockNotificationSchema } from "../schemas/stock-notification.schemas";
import { getStockNotificationInvalidationTags } from "../constants/cache";
import { getNotificationByToken } from "../data/get-notification-by-token";
import { getNotificationById } from "../data/get-notification-by-id";

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

		const validated = validateInput(unsubscribeFromStockNotificationSchema, { token });
		if ("error" in validated) return validated.error;

		const { token: validatedToken } = validated.data;

		// Récupérer la demande de notification
		const notification = await getNotificationByToken(validatedToken);

		if (!notification) {
			return notFound("Cette demande de notification");
		}

		// Vérifier le statut actuel
		if (notification.status === StockNotificationStatus.CANCELLED) {
			return error(
				"Vous êtes déjà désinscrit(e) de cette notification",
				ActionStatus.CONFLICT
			);
		}

		if (notification.status === StockNotificationStatus.NOTIFIED) {
			return error(
				"Cette notification a déjà été envoyée. Elle ne sera pas envoyée à nouveau.",
				ActionStatus.CONFLICT
			);
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
			notification.userId,
			notification.email,
			notification.unsubscribeToken,
			notification.id
		);
		tagsToInvalidate.forEach((tag) => updateTag(tag));

		return success(
			`Vous ne recevrez plus de notification pour "${notification.sku.product.title}".`
		);
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue. Veuillez réessayer plus tard.");
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
			return validationError("ID de notification requis");
		}

		// 1. Vérifier l'authentification
		const headersList = await headers();
		const session = await auth.api.getSession({ headers: headersList });

		if (!session?.user) {
			return unauthorized();
		}

		// 2. Récupérer la demande de notification
		const notification = await getNotificationById(notificationId);

		if (!notification) {
			return notFound("Cette demande de notification");
		}

		// 3. Vérifier ownership ou admin
		// Note: On vérifie uniquement par userId pour éviter les edge cases
		// où un utilisateur change d'email et un autre reprend l'ancien email
		const isOwner = notification.userId === session.user.id;
		const isAdmin = session.user.role === "ADMIN";

		if (!isOwner && !isAdmin) {
			return forbidden("Vous n'êtes pas autorisé à annuler cette notification");
		}

		// 4. Vérifier le statut
		if (notification.status !== StockNotificationStatus.PENDING) {
			return error(
				"Cette notification ne peut plus être annulée",
				ActionStatus.CONFLICT
			);
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
			notification.userId,
			notification.email,
			notification.unsubscribeToken,
			notification.id
		);
		tagsToInvalidate.forEach((tag) => updateTag(tag));

		return success(
			`Notification annulée pour "${notification.sku.product.title}".`
		);
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue. Veuillez réessayer plus tard.");
	}
}
