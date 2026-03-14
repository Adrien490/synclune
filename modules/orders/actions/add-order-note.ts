"use server";

import { prisma, notDeleted } from "@/shared/lib/prisma";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import type { ActionState } from "@/shared/types/server-action";
import { validateInput, handleActionError, success, error } from "@/shared/lib/actions";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_ORDER_LIMITS } from "@/shared/lib/rate-limit-config";
import { logAudit } from "@/shared/lib/audit-log";
import { addOrderNoteSchema } from "../schemas/order.schemas";
import { sanitizeText } from "@/shared/lib/sanitize";
import { ORDERS_CACHE_TAGS } from "../constants/cache";
import { updateTag } from "next/cache";

/**
 * Server Action ADMIN pour ajouter une note interne à une commande
 */
export async function addOrderNote(orderId: string, content: string): Promise<ActionState> {
	try {
		// 1. Vérification authentification et admin
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_ORDER_LIMITS.SINGLE_OPERATIONS);
		if ("error" in rateLimit) return rateLimit.error;

		// 2. Validation des entrées
		const validated = validateInput(addOrderNoteSchema, { orderId, content });
		if ("error" in validated) return validated.error;

		// 4. Vérifier que la commande existe
		const order = await prisma.order.findUnique({
			where: { id: validated.data.orderId, ...notDeleted },
			select: { id: true },
		});

		if (!order) {
			return error("Commande non trouvée");
		}

		// 5. Sanitize and create the note
		const sanitizedContent = sanitizeText(validated.data.content.trim());
		await prisma.orderNote.create({
			data: {
				orderId: validated.data.orderId,
				content: sanitizedContent,
				authorId: auth.user.id,
				authorName: auth.user.name ?? auth.user.email,
			},
		});

		// 6. Invalider le cache
		updateTag(ORDERS_CACHE_TAGS.NOTES(validated.data.orderId));

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "order.addNote",
			targetType: "order",
			targetId: validated.data.orderId,
			metadata: {},
		});

		return success("Note ajoutée");
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue");
	}
}
