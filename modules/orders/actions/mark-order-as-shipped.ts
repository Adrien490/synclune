"use server";

import { requireAdmin } from "@/modules/admin-auth/lib/require-admin";
import { sendShippingConfirmationEmail } from "@/modules/emails/services/send-shipping-confirmation";
import { error, handleActionError, success, validateInput } from "@/shared/lib/actions";
import { updateTagsAfterMutation } from "@/shared/lib/cache";
import { logger } from "@/shared/lib/logger";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { getOrderInvalidationTags } from "../constants/cache";
import { markOrderAsShippedSchema } from "../schemas/order.schemas";

/**
 * « Marquer expédiée » : PAID → SHIPPED, pose `shippedAt` + `trackingNumber`
 * et envoie l'email d'expédition.
 *
 * Transition en `updateMany` gardée sur le statut SOURCE : un double clic, ou
 * une commande annulée entre-temps, rend count = 0 — jamais d'écrasement d'un
 * autre statut. ⚠️ N'écrit JAMAIS `invoiceNumber` (seul le webhook l'écrit).
 */
export async function markOrderAsShipped(
	_prevState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	const admin = await requireAdmin();
	if ("error" in admin) return admin.error;

	const validation = validateInput(markOrderAsShippedSchema, {
		orderId: formData.get("orderId"),
		trackingNumber: formData.get("trackingNumber"),
	});
	if ("error" in validation) return validation.error;
	const { orderId, trackingNumber } = validation.data;

	try {
		const shippedAt = new Date();
		const { count } = await prisma.order.updateMany({
			where: { id: orderId, status: "PAID" },
			data: { status: "SHIPPED", shippedAt, trackingNumber },
		});

		if (count === 0) {
			return error(
				"Cette commande ne peut pas être expédiée : elle n'est pas (ou plus) au statut « payée ».",
			);
		}

		updateTagsAfterMutation(getOrderInvalidationTags(orderId));

		const order = await prisma.order.findUnique({
			where: { id: orderId },
			select: {
				id: true,
				invoiceNumber: true,
				email: true,
				customerName: true,
				trackingNumber: true,
				shippedAt: true,
				shippingLine1: true,
				shippingLine2: true,
				shippingZip: true,
				shippingCity: true,
				shippingCountry: true,
			},
		});

		if (order?.email && order.trackingNumber && order.shippedAt) {
			const result = await sendShippingConfirmationEmail({
				...order,
				trackingNumber: order.trackingNumber,
				shippedAt: order.shippedAt,
			});
			if (!result.success) {
				logger.error("[markOrderAsShipped] Email d'expédition non envoyé", {
					orderId,
					error: result.error,
				});
				return success(
					"Commande marquée expédiée — mais l'email d'expédition n'est pas parti. Réessaie ou préviens la cliente directement.",
				);
			}
		}

		return success("Commande expédiée, email envoyé à la cliente.");
	} catch (e) {
		return handleActionError(e, "Impossible de marquer la commande comme expédiée.");
	}
}
