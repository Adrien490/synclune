"use server";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";

import { updateTag } from "next/cache";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { requireAdmin, requireAuth } from "@/modules/auth/lib/require-auth";
import {
	validateInput,
	success,
	error,
	handleActionError,
} from "@/shared/lib/actions";
import { ADMIN_USER_LIMITS } from "@/shared/lib/rate-limit-config";
import { bulkSuspendUsersSchema } from "../../schemas/user-admin.schemas";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { getUserFullInvalidationTags } from "../../constants/cache";

export async function bulkSuspendUsers(
	_prevState: unknown,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Rate limiting
		const rateCheck = await enforceRateLimitForCurrentUser(ADMIN_USER_LIMITS.BULK_OPERATIONS);
		if ("error" in rateCheck) return rateCheck.error;

		// 2. Verification des droits admin
		const adminCheck = await requireAdmin();
		if ("error" in adminCheck) return adminCheck.error;

		// 3. Extraire et valider les IDs
		const idsString = formData.get("ids");
		const rawData = {
			ids: idsString ? JSON.parse(idsString as string) : [],
		};

		const validation = validateInput(bulkSuspendUsersSchema, rawData);
		if ("error" in validation) return validation.error;

		const validatedData = validation.data;

		// 4. Verifier qu'on ne suspend pas son propre compte
		const userAuth = await requireAuth();
		if ("error" in userAuth) return userAuth.error;

		if (validatedData.ids.includes(userAuth.user.id)) {
			return error("Vous ne pouvez pas suspendre votre propre compte.");
		}

		// 4. Filtrer les utilisateurs eligibles (non supprimes, non deja suspendus)
		const eligibleUsers = await prisma.user.findMany({
			where: {
				id: { in: validatedData.ids },
				deletedAt: null,
				suspendedAt: null,
			},
			select: { id: true },
		});

		if (eligibleUsers.length === 0) {
			return error("Aucun utilisateur eligible pour la suspension.");
		}

		const eligibleIds = eligibleUsers.map((u) => u.id);

		// 6. Suspendre les utilisateurs ET invalider leurs sessions
		await prisma.$transaction([
			prisma.user.updateMany({
				where: { id: { in: eligibleIds } },
				data: { suspendedAt: new Date() },
			}),
			// Invalider toutes les sessions pour forcer la deconnexion
			prisma.session.deleteMany({
				where: { userId: { in: eligibleIds } },
			}),
		]);

		// 7. Revalider le cache
		updateTag(SHARED_CACHE_TAGS.ADMIN_CUSTOMERS_LIST);
		updateTag(SHARED_CACHE_TAGS.ADMIN_BADGES);
		for (const id of eligibleIds) {
			for (const tag of getUserFullInvalidationTags(id)) {
				updateTag(tag);
			}
		}

		return success(
			`${eligibleIds.length} utilisateur${eligibleIds.length > 1 ? "s" : ""} suspendu${eligibleIds.length > 1 ? "s" : ""} avec succes.`
		);
	} catch (e) {
		return handleActionError(e, "Erreur lors de la suspension des utilisateurs");
	}
}
