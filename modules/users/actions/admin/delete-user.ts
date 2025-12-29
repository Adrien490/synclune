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
	notFound,
	handleActionError,
} from "@/shared/lib/actions";
import { ADMIN_USER_LIMITS } from "@/shared/lib/rate-limit-config";
import { deleteUserSchema } from "../../schemas/user-admin.schemas";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { USERS_CACHE_TAGS } from "../../constants/cache";

export async function deleteUser(
	_prevState: unknown,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Rate limiting
		const rateCheck = await enforceRateLimitForCurrentUser(ADMIN_USER_LIMITS.DELETE_USER);
		if ("error" in rateCheck) return rateCheck.error;

		// 2. Verification des droits admin
		const adminCheck = await requireAdmin();
		if ("error" in adminCheck) return adminCheck.error;

		// 3. Extraire et valider l'ID
		const rawData = { id: formData.get("id") as string };
		const validation = validateInput(deleteUserSchema, rawData);
		if ("error" in validation) return validation.error;

		const { id: userId } = validation.data;

		// 4. Verifier qu'on ne supprime pas son propre compte
		const userAuth = await requireAuth();
		if ("error" in userAuth) return userAuth.error;

		if (userAuth.user.id === userId) {
			return error("Vous ne pouvez pas supprimer votre propre compte.");
		}

		// 5. Verifier que l'utilisateur existe
		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: { id: true, name: true, email: true, deletedAt: true },
		});

		if (!user) {
			return notFound("Utilisateur");
		}

		if (user.deletedAt) {
			return error("Cet utilisateur est deja supprime.");
		}

		// 6. Soft delete
		await prisma.user.update({
			where: { id: userId },
			data: { deletedAt: new Date() },
		});

		// 7. Revalider le cache
		updateTag(SHARED_CACHE_TAGS.ADMIN_CUSTOMERS_LIST);
		updateTag(SHARED_CACHE_TAGS.ADMIN_BADGES);
		updateTag(USERS_CACHE_TAGS.ACCOUNTS_LIST);

		return success(`L'utilisateur ${user.name || user.email} a ete supprime.`);
	} catch (e) {
		return handleActionError(e, "Erreur lors de la suppression de l'utilisateur");
	}
}
