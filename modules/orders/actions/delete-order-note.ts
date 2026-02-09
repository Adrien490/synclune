"use server";

import { prisma, softDelete } from "@/shared/lib/prisma";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { updateTag } from "next/cache";
import type { ActionState } from "@/shared/types/server-action";
import { validateInput, handleActionError, success, error } from "@/shared/lib/actions";
import { deleteOrderNoteSchema } from "../schemas/order.schemas";
import { getOrderInvalidationTags, ORDERS_CACHE_TAGS } from "../constants/cache";

/**
 * Server Action ADMIN pour supprimer une note de commande
 */
export async function deleteOrderNote(noteId: string): Promise<ActionState> {
	try {
		// 1. Validation des entrées
		const validated = validateInput(deleteOrderNoteSchema, { noteId });
		if ("error" in validated) return validated.error;

		// 2. Vérification admin
		const adminCheck = await requireAdmin();
		if ("error" in adminCheck) {
			return adminCheck.error;
		}

		// 3. Vérifier que la note existe et récupérer l'orderId pour le cache
		const note = await prisma.orderNote.findUnique({
			where: { id: validated.data.noteId },
			select: { id: true, orderId: true },
		});

		if (!note) {
			return error("Note non trouvee");
		}

		// 4. Soft delete au lieu de hard delete (conformité légale)
		// Conservation des notes pour audit trail (Art. L123-22 Code de Commerce)
		await softDelete.orderNote(validated.data.noteId);

		// 5. Invalider le cache
		getOrderInvalidationTags().forEach(tag => updateTag(tag));
		updateTag(ORDERS_CACHE_TAGS.NOTES(note.orderId));

		return success("Note supprimee");
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue");
	}
}
