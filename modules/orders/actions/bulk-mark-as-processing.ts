"use server";

import { OrderStatus, FulfillmentStatus, HistorySource } from "@/app/generated/prisma/client";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { validateInput, handleActionError, success, error } from "@/shared/lib/actions";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_ORDER_LIMITS } from "@/shared/lib/rate-limit-config";
import { updateTag } from "next/cache";
import { logAudit } from "@/shared/lib/audit-log";
import { bulkMarkAsProcessingSchema } from "../schemas/order.schemas";
import { getOrderInvalidationTags, ORDERS_CACHE_TAGS } from "../constants/cache";
import { createOrderAuditTx } from "../utils/order-audit";

/**
 * Passe plusieurs commandes en cours de préparation en masse
 * Réservé aux administrateurs
 *
 * Filtrage automatique :
 * - Seules les commandes PENDING payées (PAID ou PARTIALLY_REFUNDED) seront traitées
 * - Les commandes déjà en PROCESSING, SHIPPED, DELIVERED, CANCELLED sont ignorées
 */
export async function bulkMarkAsProcessing(
	_prevState: unknown,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_ORDER_LIMITS.BULK_OPERATIONS);
		if ("error" in rateLimit) return rateLimit.error;

		const idsString = formData.get("ids");
		let ids: unknown = [];
		try {
			ids = idsString ? JSON.parse(String(idsString)) : [];
		} catch {
			return error("Format d'IDs invalide");
		}

		const validated = validateInput(bulkMarkAsProcessingSchema, { ids });
		if ("error" in validated) return validated.error;

		const { ids: validatedIds } = validated.data;

		// Transaction : filtrage + mise à jour + audit trail atomiques (prévient TOCTOU)
		const eligibleOrders = await prisma.$transaction(async (tx) => {
			const eligible = await tx.order.findMany({
				where: {
					id: { in: validatedIds },
					status: OrderStatus.PENDING,
					paymentStatus: { in: ["PAID", "PARTIALLY_REFUNDED"] },
					...notDeleted,
				},
				select: {
					id: true,
					orderNumber: true,
					status: true,
					paymentStatus: true,
					fulfillmentStatus: true,
					userId: true,
				},
			});

			if (eligible.length === 0) return [];

			const eligibleIds = eligible.map((o) => o.id);

			await tx.order.updateMany({
				where: { id: { in: eligibleIds } },
				data: {
					status: OrderStatus.PROCESSING,
					fulfillmentStatus: FulfillmentStatus.PROCESSING,
				},
			});

			await Promise.all(
				eligible.map((order) =>
					createOrderAuditTx(tx, {
						orderId: order.id,
						action: "PROCESSING",
						previousStatus: order.status,
						newStatus: OrderStatus.PROCESSING,
						previousFulfillmentStatus: order.fulfillmentStatus,
						newFulfillmentStatus: FulfillmentStatus.PROCESSING,
						authorId: adminUser.id,
						authorName: adminUser.name ?? "Admin",
						source: HistorySource.ADMIN,
						metadata: { bulk: true },
					}),
				),
			);

			return eligible;
		});

		if (eligibleOrders.length === 0) {
			return error(
				"Aucune commande éligible (doivent être au statut PENDING avec paiement confirmé).",
			);
		}

		// Invalider les caches pour chaque userId unique
		const uniqueUserIds = [
			...new Set(eligibleOrders.map((o) => o.userId).filter(Boolean)),
		] as string[];
		uniqueUserIds.forEach((userId) => {
			getOrderInvalidationTags(userId).forEach((tag) => updateTag(tag));
		});
		getOrderInvalidationTags().forEach((tag) => updateTag(tag));
		eligibleOrders.forEach((o) => updateTag(ORDERS_CACHE_TAGS.HISTORY(o.id)));

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "order.bulkMarkProcessing",
			targetType: "order",
			targetId: eligibleOrders.map((o) => o.id).join(","),
			metadata: {
				count: eligibleOrders.length,
				orderNumbers: eligibleOrders.map((o) => o.orderNumber),
			},
		});

		const count = eligibleOrders.length;
		return success(
			`${count} commande${count > 1 ? "s" : ""} passée${count > 1 ? "s" : ""} en préparation.`,
		);
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue lors de la mise à jour des commandes.");
	}
}
