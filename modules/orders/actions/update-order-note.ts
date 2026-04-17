"use server";

import { prisma } from "@/shared/lib/prisma";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { updateTag } from "next/cache";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { validateInput, handleActionError, success } from "@/shared/lib/actions";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_ORDER_LIMITS } from "@/shared/lib/rate-limit-config";
import { logAudit } from "@/shared/lib/audit-log";
import { sanitizeText } from "@/shared/lib/sanitize";
import { updateOrderNoteSchema } from "../schemas/order.schemas";
import { ORDERS_CACHE_TAGS } from "../constants/cache";
import { ORDER_ERROR_MESSAGES } from "../constants/order.constants";

/**
 * Server Action ADMIN pour modifier une note de commande
 *
 * Business rules:
 * - Seul l'auteur original de la note peut la modifier
 * - Les notes soft-deleted ne peuvent plus etre modifiees
 */
export async function updateOrderNote(noteId: string, content: string): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_ORDER_LIMITS.SINGLE_OPERATIONS);
		if ("error" in rateLimit) return rateLimit.error;

		const validated = validateInput(updateOrderNoteSchema, { noteId, content });
		if ("error" in validated) return validated.error;

		const sanitizedContent = sanitizeText(validated.data.content.trim());

		const note = await prisma.$transaction(async (tx) => {
			const found = await tx.orderNote.findUnique({
				where: { id: validated.data.noteId },
				select: { id: true, orderId: true, authorId: true, deletedAt: true },
			});

			if (!found || found.deletedAt) return null;

			if (found.authorId !== adminUser.id) {
				return { ...found, _error: "not_author" as const };
			}

			await tx.orderNote.update({
				where: { id: validated.data.noteId },
				data: { content: sanitizedContent },
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

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "order.updateNote",
			targetType: "orderNote",
			targetId: note.id,
			metadata: {
				orderId: note.orderId,
			},
		});

		return success("Note modifiée");
	} catch (e) {
		return handleActionError(e, ORDER_ERROR_MESSAGES.UPDATE_NOTE_FAILED);
	}
}
