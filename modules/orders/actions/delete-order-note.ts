"use server";

import { prisma } from "@/shared/lib/prisma";
import { requireAdmin } from "@/shared/lib/actions";
import { revalidatePath } from "next/cache";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";

/**
 * Server Action ADMIN pour supprimer une note de commande
 */
export async function deleteOrderNote(noteId: string): Promise<ActionState> {
	try {
		// 1. Vérification admin
		const adminCheck = await requireAdmin();
		if ("error" in adminCheck) {
			return adminCheck.error;
		}

		// 2. Vérifier que la note existe et récupérer l'orderId pour le cache
		const note = await prisma.orderNote.findUnique({
			where: { id: noteId },
			select: { id: true, orderId: true },
		});

		if (!note) {
			return {
				status: ActionStatus.ERROR,
				message: "Note non trouvée",
			};
		}

		// 3. Supprimer la note
		await prisma.orderNote.delete({
			where: { id: noteId },
		});

		// 4. Invalider le cache
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
