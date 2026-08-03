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
 * Server Action ADMIN pour ajouter une note interne à une commande.
 * Toutes les notes sont internes de fait : seule l'admin les voit (la colonne
 * `isInternal` a été purgée au Lot 0, migration 20260803).
 */
export async function addOrderNote(orderId: string, content: string): Promise<ActionState> {
	try {
		// 1. Vérification authentification et admin
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_ORDER_LIMITS.SINGLE_OPERATIONS);
		if ("error" in rateLimit) return rateLimit.error;

		// 2. Validation des entrées
		const validated = validateInput(addOrderNoteSchema, { orderId, content });
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
					// `?? "Admin"` et non `?? email` : authorName est conservé 10 ans et
					// n'est PAS couvert par le scrub des notes (PURGED_ORDER_NOTE_CONTENT
					// ne remplace que content) — un email admin n'a rien à y faire.
					// Aligné sur les 12 autres actions du module (audit 2026-08-01, P3).
					authorName: auth.user.name ?? "Admin",
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
