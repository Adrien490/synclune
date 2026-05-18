"use server";

import { prisma } from "@/shared/lib/prisma";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { updateTag } from "next/cache";
import type { ActionState } from "@/shared/types/server-action";
import { validateInput, handleActionError, success, error } from "@/shared/lib/actions";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_ORDER_LIMITS } from "@/shared/lib/rate-limit-config";
import { deleteOrderNoteSchema } from "../schemas/order.schemas";
import { ORDERS_CACHE_TAGS } from "../constants/cache";

/**
 * Server Action ADMIN pour supprimer une note de commande
 */
export async function deleteOrderNote(noteId: string): Promise<ActionState> {
	try {
		// 1. Vérification admin (avant validation pour cohérence)
		const auth = await requireAdmin();
		if ("error" in auth) return auth.error;
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_ORDER_LIMITS.SINGLE_OPERATIONS);
		if ("error" in rateLimit) return rateLimit.error;

		// 2. Validation des entrées
		const validated = validateInput(deleteOrderNoteSchema, { noteId });
		if ("error" in validated) return validated.error;

		// 3. Transaction: fetch + soft delete atomically (prevents TOCTOU race)
		const note = await prisma.$transaction(async (tx) => {
			const found = await tx.orderNote.findUnique({
				where: { id: validated.data.noteId },
				select: { id: true, orderId: true },
			});

			if (!found) return null;

			// Soft delete (Art. L123-22 Code de Commerce)
			await tx.orderNote.update({
				where: { id: validated.data.noteId },
				data: { deletedAt: new Date() },
			});

			return found;
		});

		if (!note) {
			return error("Note non trouvée");
		}

		// 5. Invalider le cache des notes uniquement (pas de changement de statut)
		if (note.orderId) {
			updateTag(ORDERS_CACHE_TAGS.NOTES(note.orderId));
		}

		return success("Note supprimée");
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue");
	}
}
