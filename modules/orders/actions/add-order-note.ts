"use server";

import { prisma } from "@/shared/lib/prisma";
import { requireAuth } from "@/shared/lib/actions";
import { isAdmin } from "@/modules/auth/utils/guards";
import { revalidatePath } from "next/cache";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { z } from "zod";

const addOrderNoteSchema = z.object({
	orderId: z.cuid(),
	content: z.string().min(1, "La note ne peut pas être vide").max(5000, "Note trop longue (max 5000 caractères)"),
});

/**
 * Server Action ADMIN pour ajouter une note interne à une commande
 */
export async function addOrderNote(
	orderId: string,
	content: string
): Promise<ActionState> {
	try {
		// 1. Vérification authentification
		const auth = await requireAuth();
		if ("error" in auth) {
			return auth.error;
		}

		// 2. Vérification admin
		const admin = await isAdmin();
		if (!admin) {
			return {
				status: ActionStatus.FORBIDDEN,
				message: "Accès réservé aux administrateurs",
			};
		}

		// 3. Validation des entrées
		const validation = addOrderNoteSchema.safeParse({ orderId, content });
		if (!validation.success) {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: validation.error.issues[0]?.message || "Données invalides",
			};
		}

		// 4. Vérifier que la commande existe
		const order = await prisma.order.findUnique({
			where: { id: orderId },
			select: { id: true },
		});

		if (!order) {
			return {
				status: ActionStatus.ERROR,
				message: "Commande non trouvée",
			};
		}

		// 5. Créer la note
		await prisma.orderNote.create({
			data: {
				orderId,
				content: content.trim(),
				authorId: auth.user.id,
				authorName: auth.user.name || auth.user.email,
			},
		});

		// 6. Invalider le cache
		revalidatePath("/admin/ventes/commandes");
		revalidatePath(`/admin/ventes/commandes/${orderId}`);

		return {
			status: ActionStatus.SUCCESS,
			message: "Note ajoutée",
		};
	} catch (error) {
		console.error("[ADD_ORDER_NOTE] Erreur:", error);
		return {
			status: ActionStatus.ERROR,
			message: "Une erreur est survenue",
		};
	}
}
