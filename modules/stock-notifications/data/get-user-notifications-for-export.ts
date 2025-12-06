"use server";

import { prisma, notDeleted } from "@/shared/lib/prisma";
import { requireAuth } from "@/shared/lib/actions";
import type { ActionState } from "@/shared/types/server-action";
import { success, handleActionError } from "@/shared/lib/actions";

/**
 * Données exportées pour les notifications de stock (RGPD Art. 20)
 */
export interface StockNotificationExport {
	email: string;
	status: string;
	productTitle: string;
	productSlug: string;
	variant: string | null;
	createdAt: string;
	notifiedAt: string | null;
}

/**
 * Récupère les notifications de stock d'un utilisateur pour export RGPD
 *
 * Conforme à l'article 20 du RGPD - Droit à la portabilité des données.
 */
export async function getUserNotificationsForExport(): Promise<ActionState> {
	try {
		const auth = await requireAuth();
		if ("error" in auth) return auth.error;

		const notifications = await prisma.stockNotificationRequest.findMany({
			where: {
				OR: [
					{ userId: auth.user.id },
					{ email: auth.user.email.toLowerCase() },
				],
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

		const exportData: StockNotificationExport[] = notifications.map((n) => {
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

		return success("Notifications exportées avec succès", exportData);
	} catch (e) {
		return handleActionError(e, "Erreur lors de l'export des notifications");
	}
}
