"use server";

import { prisma, notDeleted } from "@/shared/lib/prisma";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import type { ActionState } from "@/shared/types/server-action";
import { validateInput, handleActionError, success, error } from "@/shared/lib/actions";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_ORDER_LIMITS } from "@/shared/lib/rate-limit-config";
import { addOrderNoteSchema } from "../schemas/order.schemas";
import { sanitizeText } from "@/shared/lib/sanitize";
import { ORDERS_CACHE_TAGS } from "../constants/cache";
import { updateTag } from "next/cache";

/**
 * Server Action ADMIN pour ajouter une note interne à une commande
 *
 * @param isInternal Si true, la note est filtree par `getOrderNotesForUser`
 *                   et n'apparaitra jamais cote client. Default false pour
 *                   preserver le comportement historique.
 */
export async function addOrderNote(
	orderId: string,
	content: string,
	isInternal = false,
): Promise<ActionState> {
	try {
		// 1. Vérification authentification et admin
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_ORDER_LIMITS.SINGLE_OPERATIONS);
		if ("error" in rateLimit) return rateLimit.error;

		// 2. Validation des entrées
		const validated = validateInput(addOrderNoteSchema, { orderId, content, isInternal });
		if ("error" in validated) return validated.error;

		// 4. Sanitize input
		const sanitizedContent = sanitizeText(validated.data.content.trim());

		// 5. Transaction: verify order exists + create note atomically (prevents TOCTOU race)
		const order = await prisma.$transaction(async (tx) => {
			const found = await tx.order.findUnique({
				where: { id: validated.data.orderId, ...notDeleted },
				select: { id: true },
			});

			if (!found) return null;

			await tx.orderNote.create({
				data: {
					orderId: validated.data.orderId,
					content: sanitizedContent,
					authorId: auth.user.id,
					authorName: auth.user.name ?? auth.user.email,
					isInternal: validated.data.isInternal,
				},
			});

			return found;
		});

		if (!order) {
			return error("Commande non trouvée");
		}

		// 6. Invalider le cache
		updateTag(ORDERS_CACHE_TAGS.NOTES(validated.data.orderId));

		return success("Note ajoutée");
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue");
	}
}
