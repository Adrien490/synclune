"use server";

import { updateTag } from "next/cache";
import { AccountStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import {
	requireAdmin,
	enforceRateLimitForCurrentUser,
	validateInput,
	success,
	error,
	notFound,
	handleActionError,
} from "@/shared/lib/actions";
import { restoreUserSchema } from "../../schemas/user-admin.schemas";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";

// Rate limit: 20 requêtes par minute
const RESTORE_USER_RATE_LIMIT = { limit: 20, windowMs: 60 * 1000 };

export async function restoreUser(
	_prevState: unknown,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Rate limiting
		const rateCheck = await enforceRateLimitForCurrentUser(RESTORE_USER_RATE_LIMIT);
		if ("error" in rateCheck) return rateCheck.error;

		// 2. Verification des droits admin
		const adminCheck = await requireAdmin();
		if ("error" in adminCheck) return adminCheck.error;

		// 3. Extraire et valider l'ID
		const rawData = { id: formData.get("id") as string };
		const validation = validateInput(restoreUserSchema, rawData);
		if ("error" in validation) return validation.error;

		const { id: userId } = validation.data;

		// 4. Verifier que l'utilisateur existe
		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: { id: true, name: true, email: true, suspendedAt: true, deletedAt: true },
		});

		if (!user) {
			return notFound("Utilisateur");
		}

		if (!user.deletedAt && !user.suspendedAt) {
			return error("Cet utilisateur n'est ni supprime ni suspendu.");
		}

		// 5. Restaurer l'utilisateur (clear both deletedAt and suspendedAt)
		await prisma.user.update({
			where: { id: userId },
			data: {
				deletedAt: null,
				suspendedAt: null,
				accountStatus: AccountStatus.ACTIVE,
			},
		});

		// 6. Revalider le cache
		updateTag(SHARED_CACHE_TAGS.ADMIN_CUSTOMERS_LIST);
		updateTag(SHARED_CACHE_TAGS.ADMIN_BADGES);

		return success(`L'utilisateur ${user.name || user.email} a ete restaure.`);
	} catch (e) {
		return handleActionError(e, "Erreur lors de la restauration de l'utilisateur");
	}
}
