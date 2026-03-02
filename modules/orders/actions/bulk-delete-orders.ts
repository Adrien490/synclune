"use server";

import { PaymentStatus } from "@/app/generated/prisma/client";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import {
	validateInput,
	handleActionError,
	success,
	error,
	safeFormGet,
} from "@/shared/lib/actions";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_ORDER_LIMITS } from "@/shared/lib/rate-limit-config";
import { updateTag } from "next/cache";

import { ORDER_ERROR_MESSAGES } from "../constants/order.constants";
import { getOrderInvalidationTags, ORDERS_CACHE_TAGS } from "../constants/cache";
import { logAudit } from "@/shared/lib/audit-log";
import { bulkDeleteOrdersSchema } from "../schemas/order.schemas";

/**
 * Supprime plusieurs commandes en masse
 * Réservé aux administrateurs
 *
 * Règles métier :
 * - Seules les commandes éligibles seront supprimées
 * - Une commande est éligible si :
 *   1. Aucune facture n'a été émise (invoiceNumber === null)
 *   2. Elle n'a jamais été payée (paymentStatus !== PAID et !== REFUNDED)
 * - Les commandes non éligibles sont ignorées (avec compteur)
 */
export async function bulkDeleteOrders(
	_prevState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_ORDER_LIMITS.BULK_OPERATIONS);
		if ("error" in rateLimit) return rateLimit.error;

		const idsRaw = safeFormGet(formData, "ids");
		let ids: unknown = [];
		try {
			ids = idsRaw ? JSON.parse(idsRaw) : [];
		} catch {
			return error("Format d'IDs invalide");
		}

		const validated = validateInput(bulkDeleteOrdersSchema, { ids });
		if ("error" in validated) return validated.error;

		// Transaction: fetch + validate + soft delete atomically (prevents TOCTOU race)
		const { deletableOrders, deletableIds, skippedCount } = await prisma.$transaction(
			async (tx) => {
				// Récupérer les commandes pour vérifier leur éligibilité (exclure déjà supprimées)
				const orders = await tx.order.findMany({
					where: {
						id: { in: validated.data.ids },
						...notDeleted,
					},
					select: {
						id: true,
						orderNumber: true,
						userId: true,
						invoiceNumber: true,
						paymentStatus: true,
					},
				});

				// Filter orders eligible for deletion
				const eligible = orders.filter(
					(order) =>
						!order.invoiceNumber &&
						order.paymentStatus !== PaymentStatus.PAID &&
						order.paymentStatus !== PaymentStatus.REFUNDED,
				);

				const eligibleIds = eligible.map((order) => order.id);

				if (eligibleIds.length > 0) {
					// Soft delete des commandes éligibles (Art. L123-22 Code de Commerce - conservation 10 ans)
					await tx.order.updateMany({
						where: { id: { in: eligibleIds } },
						data: { deletedAt: new Date() },
					});
				}

				return {
					deletableOrders: eligible,
					deletableIds: eligibleIds,
					skippedCount: orders.length - eligibleIds.length,
				};
			},
		);

		if (deletableIds.length === 0) {
			return error(ORDER_ERROR_MESSAGES.BULK_DELETE_NONE_ELIGIBLE);
		}

		// Invalider les caches pour chaque userId unique
		const uniqueUserIds = [
			...new Set(deletableOrders.map((o) => o.userId).filter(Boolean)),
		] as string[];
		uniqueUserIds.forEach((userId) => {
			getOrderInvalidationTags(userId).forEach((tag) => updateTag(tag));
		});
		// Toujours invalider la liste admin (même si pas d'userId)
		getOrderInvalidationTags().forEach((tag) => updateTag(tag));
		// Invalider l'historique de chaque commande
		deletableOrders.forEach((o) => updateTag(ORDERS_CACHE_TAGS.HISTORY(o.id)));

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "order.bulkDelete",
			targetType: "order",
			targetId: deletableIds.join(","),
			metadata: {
				count: deletableIds.length,
				orderNumbers: deletableOrders.map((o) => o.orderNumber),
				skippedCount,
			},
		});

		const message =
			skippedCount > 0
				? `${deletableIds.length} commande(s) supprimee(s), ${skippedCount} ignoree(s) (facturees ou payees)`
				: `${deletableIds.length} commande(s) supprimee(s)`;

		return success(message);
	} catch (e) {
		return handleActionError(e, ORDER_ERROR_MESSAGES.DELETE_FAILED);
	}
}
