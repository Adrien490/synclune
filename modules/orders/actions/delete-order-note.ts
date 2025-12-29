"use server";

import { prisma, softDelete } from "@/shared/lib/prisma";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { revalidatePath } from "next/cache";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { deleteOrderNoteSchema } from "../schemas/order.schemas";

/**
 * Server Action ADMIN pour supprimer une note de commande
 */
export async function deleteOrderNote(noteId: string): Promise<ActionState> {
	try {
		// 1. Validation des entrées
		const validation = deleteOrderNoteSchema.safeParse({ noteId });
		if (!validation.success) {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: validation.error.issues[0]?.message || "ID note invalide",
			};
		}

		// 2. Vérification admin
		const adminCheck = await requireAdmin();
		if ("error" in adminCheck) {
			return adminCheck.error;
		}

		// 3. Vérifier que la note existe et récupérer l'orderId pour le cache
		const note = await prisma.orderNote.findUnique({
			where: { id: validation.data.noteId },
			select: { id: true, orderId: true },
		});

		if (!note) {
			return {
				status: ActionStatus.ERROR,
				message: "Note non trouvée",
			};
		}

		// 4. 🔴 FIX: Soft delete au lieu de hard delete (conformité légale)
		// Conservation des notes pour audit trail (Art. L123-22 Code de Commerce)
		await softDelete.orderNote(validation.data.noteId);

		// 5. Invalider le cache
		revalidatePath("/admin/ventes/commandes");
		revalidatePath(`/admin/ventes/commandes/${note.orderId}`);

		return {
			status: ActionStatus.SUCCESS,
			message: "Note supprimée",
		};
	} catch (error) {
		console.error("[DELETE_ORDER_NOTE] Erreur:", error);
		return {
			status: ActionStatus.ERROR,
			message: "Une erreur est survenue",
		};
	}
}
