"use server";

import { requireAuth } from "@/modules/auth/lib/require-auth";
import { prisma } from "@/shared/lib/prisma";
import { handleActionError, success, error } from "@/shared/lib/actions";
import type { ActionState } from "@/shared/types/server-action";
import { updateTag } from "next/cache";
import { SESSION_CACHE_TAGS } from "@/shared/constants/cache-tags";

/**
 * Revoke a specific session by ID.
 * Only allows revoking the user's own sessions (not the current one).
 */
export async function revokeSession(
	_: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	const auth = await requireAuth();
	if ("error" in auth) return auth.error;
	const { user } = auth;

	const sessionId = formData.get("sessionId") as string;
	if (!sessionId) return error("ID de session manquant");

	try {
		// Verify session belongs to user
		const session = await prisma.session.findFirst({
			where: { id: sessionId, userId: user.id },
			select: { id: true },
		});

		if (!session) {
			return error("Session introuvable");
		}

		await prisma.session.delete({
			where: { id: sessionId },
		});

		updateTag(SESSION_CACHE_TAGS.SESSIONS(user.id));

		return success("Session révoquée");
	} catch (e) {
		return handleActionError(e, "Erreur lors de la révocation");
	}
}
