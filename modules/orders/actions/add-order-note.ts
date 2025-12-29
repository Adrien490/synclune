"use server";

import { prisma } from "@/shared/lib/prisma";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { addOrderNoteSchema } from "../schemas/order.schemas";
import { handleActionError } from "@/shared/lib/actions";
import { getOrderInvalidationTags } from "../constants/cache";
import { updateTag } from "next/cache";

/**
 * Server Action ADMIN pour ajouter une note interne à une commande
 */
export async function addOrderNote(
	orderId: string,
	content: string
): Promise<ActionState> {
	try {
		// 1. Vérification authentification et admin
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;

		// 2. Validation des entrées
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
		getOrderInvalidationTags().forEach(tag => updateTag(tag));

		return {
			status: ActionStatus.SUCCESS,
			message: "Note ajoutée",
		};
	} catch (error) {
		return handleActionError(error, "Une erreur est survenue");
	}
}
