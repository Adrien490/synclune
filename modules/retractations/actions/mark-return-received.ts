"use server";

import { requireAdmin } from "@/modules/admin-auth/lib/require-admin";
import { error, handleActionError, notFound, success, validateInput } from "@/shared/lib/actions";
import { updateTagsAfterMutation } from "@/shared/lib/cache";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { getRetractationInvalidationTags } from "../constants/cache";
import { markReturnReceivedSchema } from "../schemas/retractation.schemas";

/**
 * « Colis reçu » : la demande passe AWAITING_RETURN avec `itemReceivedAt` —
 * l'état « retour en main, prêt à rembourser » de la machine monotone
 * RECEIVED → ACKNOWLEDGED → AWAITING_RETURN → REFUNDED.
 *
 * RECEIVED est accepté comme source : si l'accusé de réception a échoué, la
 * demande n'a jamais atteint ACKNOWLEDGED et le colis peut pourtant arriver.
 */
export async function markReturnReceived(
	_prevState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	const admin = await requireAdmin();
	if ("error" in admin) return admin.error;

	const validation = validateInput(markReturnReceivedSchema, {
		retractationId: formData.get("retractationId"),
	});
	if ("error" in validation) return validation.error;
	const { retractationId } = validation.data;

	try {
		const { count } = await prisma.retractationRequest.updateMany({
			where: { id: retractationId, status: { in: ["RECEIVED", "ACKNOWLEDGED"] } },
			data: { status: "AWAITING_RETURN", itemReceivedAt: new Date() },
		});

		if (count === 0) {
			const exists = await prisma.retractationRequest.findUnique({
				where: { id: retractationId },
				select: { id: true },
			});
			if (!exists) return notFound("Demande introuvable.");
			return error("Cette demande n'est plus dans un état où le retour peut être pointé.");
		}

		const retractation = await prisma.retractationRequest.findUnique({
			where: { id: retractationId },
			select: { orderId: true },
		});
		if (retractation) {
			updateTagsAfterMutation(
				getRetractationInvalidationTags({ retractationId, orderId: retractation.orderId }),
			);
		}

		return success("Retour pointé — la demande est prête à être remboursée.");
	} catch (e) {
		return handleActionError(e, "Impossible de pointer le retour.");
	}
}
