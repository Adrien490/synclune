"use server";

import { requireAdmin } from "@/modules/admin-auth/lib/require-admin";
import { sendShippingConfirmationEmail } from "@/modules/emails/services/send-shipping-confirmation";
import { error, handleActionError, success, validateInput } from "@/shared/lib/actions";
import { updateTagsAfterMutation } from "@/shared/lib/cache";
import { logger } from "@/shared/lib/logger";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { getOrderInvalidationTags } from "../constants/cache";
import { updateTrackingNumberSchema } from "../schemas/order.schemas";

/**
 * « Corriger le n° de suivi » : remplace `trackingNumber` d'une commande DÉJÀ
 * expédiée — une faute de frappe était sinon définitivement verrouillée (la
 * transition « Marquer expédiée » est gardée sur PAID, donc injouable une
 * seconde fois), avec un mauvais lien dans l'email parti et sur le suivi.
 *
 * `updateMany` gardé sur `status: "SHIPPED"` : même convention que les
 * transitions — une commande remboursée entre-temps rend count = 0, jamais
 * d'écriture sur un autre statut. Ne touche NI `shippedAt` NI le statut.
 *
 * Renvoi d'email opt-in : la clé d'idempotence Resend inclut le numéro
 * (`order-shipped:<id>:<tracking>`), le renvoi rectifié n'est donc pas
 * dédupliqué avec l'envoi initial erroné.
 */
export async function updateTrackingNumber(
	_prevState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	const admin = await requireAdmin();
	if ("error" in admin) return admin.error;

	const validation = validateInput(updateTrackingNumberSchema, {
		orderId: formData.get("orderId"),
		trackingNumber: formData.get("trackingNumber"),
		resendEmail: formData.get("resendEmail"),
	});
	if ("error" in validation) return validation.error;
	const { orderId, trackingNumber, resendEmail } = validation.data;

	try {
		const { count } = await prisma.order.updateMany({
			where: { id: orderId, status: "SHIPPED" },
			data: { trackingNumber },
		});

		if (count === 0) {
			return error(
				"Le numéro de suivi ne peut être corrigé que sur une commande au statut « expédiée ».",
			);
		}

		updateTagsAfterMutation(getOrderInvalidationTags(orderId));

		if (!resendEmail) {
			return success("Numéro de suivi corrigé.");
		}

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

		if (!order?.email || !order.trackingNumber || !order.shippedAt) {
			logger.warn("[updateTrackingNumber] Renvoi demandé mais aucun email connu", { orderId });
			return success(
				"Numéro de suivi corrigé — aucun email connu pour cette commande, la cliente n'a PAS été prévenue.",
			);
		}

		const result = await sendShippingConfirmationEmail({
			...order,
			trackingNumber: order.trackingNumber,
			shippedAt: order.shippedAt,
		});
		if (!result.success) {
			logger.error("[updateTrackingNumber] Email rectifié non envoyé", {
				orderId,
				error: result.error,
			});
			return success(
				"Numéro de suivi corrigé — mais l'email rectifié n'est pas parti. Réessaie ou préviens la cliente directement.",
			);
		}

		return success("Numéro de suivi corrigé, email rectifié envoyé à la cliente.");
	} catch (e) {
		return handleActionError(e, "Impossible de corriger le numéro de suivi.");
	}
}
