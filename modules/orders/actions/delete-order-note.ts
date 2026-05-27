"use server";

import { notDeleted, prisma } from "@/shared/lib/prisma";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { updateTag } from "next/cache";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { validateInput, handleActionError, success } from "@/shared/lib/actions";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_ORDER_LIMITS } from "@/shared/lib/rate-limit-config";
import { deleteOrderNoteSchema } from "../schemas/order.schemas";
import { ORDERS_CACHE_TAGS } from "../constants/cache";
import { ORDER_ERROR_MESSAGES } from "../constants/order.constants";

/**
 * Server Action ADMIN pour supprimer une note de commande.
 *
 * Business rules (parite avec updateOrderNote) :
 * - Seul l'auteur original peut supprimer sa note (FORBIDDEN sinon)
 * - Les notes soft-deleted sont traitees comme inexistantes (NOT_FOUND)
 */
export async function deleteOrderNote(noteId: string): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_ORDER_LIMITS.SINGLE_OPERATIONS);
		if ("error" in rateLimit) return rateLimit.error;

		const validated = validateInput(deleteOrderNoteSchema, { noteId });
		if ("error" in validated) return validated.error;

		const note = await prisma.$transaction(async (tx) => {
			const found = await tx.orderNote.findUnique({
				where: { id: validated.data.noteId, ...notDeleted },
				select: { id: true, orderId: true, authorId: true },
			});

			if (!found) return null;

			if (found.authorId !== adminUser.id) {
				return { ...found, _error: "not_author" as const };
			}

			// Soft delete (Art. L123-22 Code de Commerce)
			await tx.orderNote.update({
				where: { id: validated.data.noteId },
				data: { deletedAt: new Date() },
			});

			return found;
		});

		if (!note) {
			return {
				status: ActionStatus.NOT_FOUND,
				message: ORDER_ERROR_MESSAGES.NOTE_NOT_FOUND,
			};
		}

		if ("_error" in note) {
			return {
				status: ActionStatus.FORBIDDEN,
				message: ORDER_ERROR_MESSAGES.NOT_NOTE_AUTHOR,
			};
		}

		if (note.orderId) {
			updateTag(ORDERS_CACHE_TAGS.NOTES(note.orderId));
		}

		return success("Note supprimée");
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue");
	}
}
