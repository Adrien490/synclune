"use server";

import { requireAuth } from "@/modules/auth/lib/require-auth";
import { handleActionError, success } from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";

export async function markWelcomeShown(): Promise<ActionState> {
	const auth = await requireAuth();
	if ("error" in auth) return auth.error;

	try {
		await prisma.user.updateMany({
			where: { id: auth.user.id, welcomeShownAt: null },
			data: { welcomeShownAt: new Date() },
		});
		return success("Bisous bisous");
	} catch (e) {
		return handleActionError(e, "Erreur lors de la fermeture du message");
	}
}
