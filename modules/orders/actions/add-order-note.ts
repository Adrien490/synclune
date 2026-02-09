"use server";

import { prisma } from "@/shared/lib/prisma";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import type { ActionState } from "@/shared/types/server-action";
import { validateInput, handleActionError, success, error } from "@/shared/lib/actions";
import { addOrderNoteSchema } from "../schemas/order.schemas";
import { sanitizeText } from "@/shared/lib/sanitize";
import { getOrderInvalidationTags, ORDERS_CACHE_TAGS } from "../constants/cache";
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
		const validated = validateInput(addOrderNoteSchema, { orderId, content });
		if ("error" in validated) return validated.error;

		// 4. Vérifier que la commande existe
		const order = await prisma.order.findUnique({
			where: { id: orderId },
			select: { id: true },
		});

		if (!order) {
			return error("Commande non trouvee");
		}

		// 5. Sanitize and create the note
		const sanitizedContent = sanitizeText(content.trim());
		await prisma.orderNote.create({
			data: {
				orderId,
				content: sanitizedContent,
				authorId: auth.user.id,
				authorName: auth.user.name || auth.user.email,
			},
		});

		// 6. Invalider le cache
		getOrderInvalidationTags().forEach(tag => updateTag(tag));
		updateTag(ORDERS_CACHE_TAGS.NOTES(orderId));

		return success("Note ajoutee");
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue");
	}
}
