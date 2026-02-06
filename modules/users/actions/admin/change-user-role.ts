"use server";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";

import { updateTag } from "next/cache";
import { prisma } from "@/shared/lib/prisma";
import { Role } from "@/app/generated/prisma/client";
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
import { changeUserRoleSchema } from "../../schemas/user-admin.schemas";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { getUserFullInvalidationTags } from "../../constants/cache";

export async function changeUserRole(
	_prevState: unknown,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Rate limiting
		const rateCheck = await enforceRateLimitForCurrentUser(ADMIN_USER_LIMITS.SINGLE_OPERATIONS);
		if ("error" in rateCheck) return rateCheck.error;

		// 2. Verification des droits admin
		const adminCheck = await requireAdmin();
		if ("error" in adminCheck) return adminCheck.error;

		// 3. Extraire et valider les donnees
		const rawData = {
			id: formData.get("id") as string,
			role: formData.get("role") as Role,
		};

		const validation = validateInput(changeUserRoleSchema, rawData);
		if ("error" in validation) return validation.error;

		const { id: userId, role: newRole } = validation.data;

		// 4. Verifier qu'on ne change pas son propre role
		const userAuth = await requireAuth();
		if ("error" in userAuth) return userAuth.error;

		if (userAuth.user.id === userId) {
			return error("Vous ne pouvez pas changer votre propre role.");
		}

		// 5. Verifier que l'utilisateur existe
		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: { id: true, name: true, email: true, role: true, deletedAt: true },
		});

		if (!user) {
			return notFound("Utilisateur");
		}

		if (user.deletedAt) {
			return error("Impossible de changer le role d'un utilisateur supprime.");
		}

		if (user.role === newRole) {
			return error(`Cet utilisateur a deja le role ${newRole}.`);
		}

		// 6. Si on retire le role admin, verifier qu'il reste au moins un admin
		if (user.role === Role.ADMIN && newRole === Role.USER) {
			const adminCount = await prisma.user.count({
				where: {
					role: Role.ADMIN,
					deletedAt: null,
				},
			});

			if (adminCount <= 1) {
				return error("Impossible de retirer le dernier administrateur.");
			}
		}

		// 7. Changer le role
		await prisma.user.update({
			where: { id: userId },
			data: { role: newRole },
		});

		// 8. Revalider le cache
		updateTag(SHARED_CACHE_TAGS.ADMIN_CUSTOMERS_LIST);
		updateTag(SHARED_CACHE_TAGS.ADMIN_BADGES);
		for (const tag of getUserFullInvalidationTags(userId)) {
			updateTag(tag);
		}

		const roleLabel = newRole === Role.ADMIN ? "administrateur" : "utilisateur";
		return success(`${user.name || user.email} est maintenant ${roleLabel}.`);
	} catch (e) {
		return handleActionError(e, "Erreur lors du changement de role");
	}
}
