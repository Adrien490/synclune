"use server";

import { OrderStatus, FulfillmentStatus, HistorySource } from "@/app/generated/prisma/client";
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
import { logAudit } from "@/shared/lib/audit-log";
import { logger } from "@/shared/lib/logger";
import { bulkMarkAsShippedSchema } from "../schemas/order.schemas";
import { getOrderInvalidationTags, ORDERS_CACHE_TAGS } from "../constants/cache";
import { createOrderAuditTx } from "../utils/order-audit";

/**
 * Marque plusieurs commandes comme expédiées en masse
 * Réservé aux administrateurs
 *
 * Filtrage automatique :
 * - Seules les commandes PROCESSING payées (PAID ou PARTIALLY_REFUNDED) seront traitées
 * - Les commandes déjà SHIPPED, DELIVERED, CANCELLED sont ignorées
 */
export async function bulkMarkAsShipped(
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

		const sendEmail = safeFormGet(formData, "sendEmail");

		const validated = validateInput(bulkMarkAsShippedSchema, {
			ids,
			sendEmail: sendEmail ?? "false",
		});
		if ("error" in validated) return validated.error;

		const validatedData = validated.data;
		const { ids: validatedIds } = validatedData;

		// Transaction : filtrage + mise à jour + audit trail atomiques (prévient TOCTOU)
		const eligibleOrders = await prisma.$transaction(async (tx) => {
			const eligible = await tx.order.findMany({
				where: {
					id: { in: validatedIds },
					status: OrderStatus.PROCESSING,
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
					status: OrderStatus.SHIPPED,
					fulfillmentStatus: FulfillmentStatus.SHIPPED,
					shippedAt: new Date(),
				},
			});

			await Promise.all(
				eligible.map((order) =>
					createOrderAuditTx(tx, {
						orderId: order.id,
						action: "SHIPPED",
						previousStatus: order.status,
						newStatus: OrderStatus.SHIPPED,
						previousFulfillmentStatus: order.fulfillmentStatus,
						newFulfillmentStatus: FulfillmentStatus.SHIPPED,
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
				"Aucune commande éligible (doivent être au statut EN PRÉPARATION avec paiement confirmé).",
			);
		}

		// Shipping emails require tracking numbers (per mark-as-shipped).
		// Bulk operations don't collect per-order tracking data, so emails
		// are deferred until tracking is added via update-tracking.
		if (validatedData.sendEmail) {
			logger.info("Bulk shipped: sendEmail ignored (no tracking numbers in bulk mode)", {
				action: "bulk-mark-as-shipped",
				count: eligibleOrders.length,
			});
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
			action: "order.bulkMarkShipped",
			targetType: "order",
			targetId: eligibleOrders.map((o) => o.id).join(","),
			metadata: {
				count: eligibleOrders.length,
				orderNumbers: eligibleOrders.map((o) => o.orderNumber),
			},
		});

		const count = eligibleOrders.length;
		return success(
			`${count} commande${count > 1 ? "s" : ""} marquée${count > 1 ? "s" : ""} comme expédiée${count > 1 ? "s" : ""}.`,
		);
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue lors de la mise à jour des commandes.");
	}
}
