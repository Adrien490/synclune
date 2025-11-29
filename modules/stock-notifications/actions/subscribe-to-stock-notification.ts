"use server";

import { prisma } from "@/shared/lib/prisma";
import { getClientIp } from "@/shared/lib/rate-limit";
import { ActionState, ActionStatus } from "@/shared/types/server-action";
import { StockNotificationStatus } from "@/app/generated/prisma/client";
import { headers } from "next/headers";
import { updateTag } from "next/cache";
import { auth } from "@/modules/auth/lib/auth";
import { subscribeToStockNotificationSchema } from "../schemas/stock-notification.schemas";
import { getStockNotificationInvalidationTags } from "../constants/cache";

/**
 * Server Action pour s'inscrire aux notifications de retour en stock
 *
 * Permet à un utilisateur (connecté ou non) de demander à être notifié
 * quand un SKU en rupture de stock revient disponible.
 */
export async function subscribeToStockNotification(
	_previousState: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		// Récupérer les informations de traçabilité RGPD
		const headersList = await headers();
		const ipAddress = (await getClientIp(headersList)) || "unknown";
		const userAgent = headersList.get("user-agent") || "unknown";

		// Vérifier si l'utilisateur est connecté
		const session = await auth.api.getSession({ headers: headersList });
		const userId = session?.user?.id || null;

		// Validation des données
		const skuId = formData.get("skuId");
		const email = formData.get("email");
		const consent = formData.get("consent") === "true";

		const result = subscribeToStockNotificationSchema.safeParse({
			skuId,
			email,
			consent,
		});

		if (!result.success) {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message:
					result.error.issues[0]?.message ||
					"Veuillez remplir les champs obligatoires",
			};
		}

		const { skuId: validatedSkuId, email: validatedEmail } = result.data;
		const normalizedEmail = validatedEmail.toLowerCase();

		// Vérifier que le SKU existe et est en rupture de stock
		const sku = await prisma.productSku.findUnique({
			where: { id: validatedSkuId },
			select: {
				id: true,
				inventory: true,
				isActive: true,
				product: {
					select: { title: true },
				},
			},
		});

		if (!sku) {
			return {
				status: ActionStatus.NOT_FOUND,
				message: "Ce produit n'existe pas",
			};
		}

		if (!sku.isActive) {
			return {
				status: ActionStatus.ERROR,
				message: "Ce produit n'est plus disponible",
			};
		}

		// Si le produit est en stock, pas besoin de notification
		if (sku.inventory > 0) {
			return {
				status: ActionStatus.CONFLICT,
				message: "Ce produit est actuellement en stock !",
			};
		}

		// Vérifier si une demande existe déjà pour cet email/SKU
		const existingNotification = await prisma.stockNotificationRequest.findFirst(
			{
				where: {
					email: normalizedEmail,
					skuId: validatedSkuId,
				},
				orderBy: { createdAt: "desc" },
			}
		);

		if (existingNotification) {
			// Si déjà en attente, retourner un message
			if (existingNotification.status === StockNotificationStatus.PENDING) {
				return {
					status: ActionStatus.CONFLICT,
					message:
						"Vous êtes déjà inscrit(e) pour recevoir une notification pour ce produit",
				};
			}

			// Si NOTIFIED/EXPIRED/CANCELLED, réactiver la demande existante
			await prisma.stockNotificationRequest.update({
				where: { id: existingNotification.id },
				data: {
					status: StockNotificationStatus.PENDING,
					userId, // Mettre à jour le userId si l'utilisateur s'est connecté entre temps
					notifiedAt: null,
					notifiedInventory: null,
					ipAddress,
					userAgent,
				},
			});
		} else {
			// Créer une nouvelle demande de notification
			await prisma.stockNotificationRequest.create({
				data: {
					skuId: validatedSkuId,
					userId,
					email: normalizedEmail,
					status: StockNotificationStatus.PENDING,
					ipAddress,
					userAgent,
				},
			});
		}

		// Invalider le cache
		const tagsToInvalidate = getStockNotificationInvalidationTags(
			validatedSkuId,
			userId
		);
		tagsToInvalidate.forEach((tag) => updateTag(tag));

		return {
			status: ActionStatus.SUCCESS,
			message: `Parfait ! Nous vous préviendrons par email dès que "${sku.product.title}" sera de nouveau disponible.`,
		};
	} catch (error) {
		console.error("[subscribeToStockNotification] Error:", error);
		return {
			status: ActionStatus.ERROR,
			message: "Une erreur est survenue. Veuillez réessayer plus tard.",
		};
	}
}
