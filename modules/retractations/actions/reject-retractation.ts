"use server";

import { requireAdmin } from "@/modules/admin-auth/lib/require-admin";
import { sendRetractationRejectedEmail } from "@/modules/emails/services/send-retractation-emails";
import { error, handleActionError, notFound, success, validateInput } from "@/shared/lib/actions";
import { updateTagsAfterMutation } from "@/shared/lib/cache";
import { logger } from "@/shared/lib/logger";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { getRetractationInvalidationTags } from "../constants/cache";
import { rejectRetractationSchema } from "../schemas/retractation.schemas";

/**
 * « Rejeter » une demande (hors délai, bijou personnalisé/sur-mesure —
 * art. L221-28 3°) : décision HUMAINE, jamais automatique, motif REQUIS —
 * il part dans l'email d'information. Possible tant que la demande n'est
 * pas remboursée (transitions monotones : jamais de retour arrière depuis
 * REFUNDED). Le motif n'est pas persisté (schéma lean) : il ne vit que
 * dans l'email.
 */
export async function rejectRetractation(
	_prevState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	const admin = await requireAdmin();
	if ("error" in admin) return admin.error;

	const validation = validateInput(rejectRetractationSchema, {
		retractationId: formData.get("retractationId"),
		adminReason: formData.get("adminReason"),
	});
	if ("error" in validation) return validation.error;
	const { retractationId, adminReason } = validation.data;

	try {
		const { count } = await prisma.retractationRequest.updateMany({
			where: {
				id: retractationId,
				status: { in: ["RECEIVED", "ACKNOWLEDGED", "AWAITING_RETURN"] },
			},
			data: { status: "REJECTED" },
		});

		if (count === 0) {
			const exists = await prisma.retractationRequest.findUnique({
				where: { id: retractationId },
				select: { id: true },
			});
			if (!exists) return notFound("Demande introuvable.");
			return error("Cette demande est déjà remboursée ou rejetée — plus rien à rejeter.");
		}

		const retractation = await prisma.retractationRequest.findUnique({
			where: { id: retractationId },
			select: {
				orderId: true,
				order: {
					select: { id: true, invoiceNumber: true, email: true, customerName: true },
				},
			},
		});

		if (retractation) {
			updateTagsAfterMutation(
				getRetractationInvalidationTags({ retractationId, orderId: retractation.orderId }),
			);

			if (retractation.order.email) {
				const emailResult = await sendRetractationRejectedEmail({
					order: retractation.order,
					rejectionReason: adminReason,
				});
				if (!emailResult.success) {
					logger.error("[rejectRetractation] Email de rejet non envoyé", {
						retractationId,
						error: emailResult.error,
					});
					return success(
						"Demande rejetée — mais l'email d'information n'est pas parti. Préviens la cliente directement.",
					);
				}
			}
		}

		return success("Demande rejetée, la cliente est informée par email.");
	} catch (e) {
		return handleActionError(e, "Impossible de rejeter la demande.");
	}
}
