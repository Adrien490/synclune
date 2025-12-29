import { cacheLife, cacheTag } from "next/cache";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { requireAuth } from "@/modules/auth/lib/require-auth";
import type { ActionState } from "@/shared/types/server-action";
import { success, handleActionError } from "@/shared/lib/actions";
import type { StockNotificationExport } from "../types/stock-notification.types";
import { STOCK_NOTIFICATIONS_CACHE_TAGS } from "../constants/cache";

export type { StockNotificationExport } from "../types/stock-notification.types";

/**
 * Récupère les notifications de stock d'un utilisateur pour export RGPD
 *
 * Le cache est géré dans fetchUserNotifications() avec "use cache"
 *
 * Conforme à l'article 20 du RGPD - Droit à la portabilité des données.
 */
export async function getUserNotificationsForExport(): Promise<ActionState> {
	try {
		const auth = await requireAuth();
		if ("error" in auth) return auth.error;

		const exportData = await fetchUserNotifications(
			auth.user.id,
			auth.user.email.toLowerCase()
		);

		return success("Notifications exportées avec succès", exportData);
	} catch (e) {
		return handleActionError(e, "Erreur lors de l'export des notifications");
	}
}

/**
 * Récupère les notifications d'un utilisateur depuis la DB avec "use cache"
 */
async function fetchUserNotifications(
	userId: string,
	email: string
): Promise<StockNotificationExport[]> {
	"use cache: private";
	cacheLife("session");
	cacheTag(STOCK_NOTIFICATIONS_CACHE_TAGS.BY_USER(userId));

	const notifications = await prisma.stockNotificationRequest.findMany({
		where: {
			OR: [{ userId }, { email }],
			...notDeleted,
		},
		select: {
			email: true,
			status: true,
			createdAt: true,
			notifiedAt: true,
			sku: {
				select: {
					color: { select: { name: true } },
					material: { select: { name: true } },
					size: true,
					product: {
						select: {
							title: true,
							slug: true,
						},
					},
				},
			},
		},
		orderBy: { createdAt: "desc" },
	});

	return notifications.map((n) => {
		const variantParts = [
			n.sku.color?.name,
			n.sku.material?.name,
			n.sku.size,
		].filter(Boolean);

		return {
			email: n.email,
			status: n.status,
			productTitle: n.sku.product.title,
			productSlug: n.sku.product.slug,
			variant: variantParts.length > 0 ? variantParts.join(" / ") : null,
			createdAt: n.createdAt.toISOString(),
			notifiedAt: n.notifiedAt?.toISOString() ?? null,
		};
	});
}
