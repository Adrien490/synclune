"use server";

import { prisma } from "@/shared/lib/prisma";
import { requireAdmin } from "@/shared/lib/actions";

export type OrderNoteItem = {
	id: string;
	content: string;
	authorId: string;
	authorName: string;
	createdAt: Date;
};

/**
 * Server Action ADMIN pour récupérer les notes d'une commande
 */
export async function getOrderNotes(
	orderId: string
): Promise<{ notes: OrderNoteItem[] } | { error: string }> {
	try {
		// 1. Vérification admin
		const adminCheck = await requireAdmin();
		if ("error" in adminCheck) {
			return { error: adminCheck.error.message };
		}

		// 2. Récupérer les notes
		const notes = await prisma.orderNote.findMany({
			where: { orderId },
			orderBy: { createdAt: "desc" },
			select: {
				id: true,
				content: true,
				authorId: true,
				authorName: true,
				createdAt: true,
			},
		});

		return { notes };
	} catch (error) {
		console.error("[GET_ORDER_NOTES] Erreur:", error);
		return { error: "Une erreur est survenue" };
	}
}
