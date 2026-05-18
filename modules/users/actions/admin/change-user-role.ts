"use server";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";

import { updateTag } from "next/cache";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { Role } from "@/app/generated/prisma/client";
import type { ActionState } from "@/shared/types/server-action";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import {
	validateInput,
	success,
	error,
	notFound,
	handleActionError,
	safeFormGet,
	BusinessError,
} from "@/shared/lib/actions";
import { ADMIN_USER_LIMITS } from "@/shared/lib/rate-limit-config";
import { changeUserRoleSchema } from "../../schemas/user-admin.schemas";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { getUserFullInvalidationTags } from "../../constants/cache";

export async function changeUserRole(
	_prevState: unknown,
	formData: FormData,
): Promise<ActionState> {
	try {
		// 1. Verification des droits admin (avant rate-limit pour eviter
		// la consommation de bucket par un non-admin + leak 429 vs 403).
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		// 2. Rate limiting
		const rateCheck = await enforceRateLimitForCurrentUser(ADMIN_USER_LIMITS.SINGLE_OPERATIONS);
		if ("error" in rateCheck) return rateCheck.error;

		// 3. Extraire et valider les donnees
		const rawData = {
			id: safeFormGet(formData, "id"),
			role: safeFormGet(formData, "role"),
		};

		const validation = validateInput(changeUserRoleSchema, rawData);
		if ("error" in validation) return validation.error;

		const { id: userId, role: newRole } = validation.data;

		// 4. Verifier qu'on ne change pas son propre role
		if (adminUser.id === userId) {
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
			return error("Impossible de changer le rôle d'un utilisateur supprimé.");
		}

		if (user.role === newRole) {
			return error(`Cet utilisateur a déjà le rôle ${newRole}.`);
		}

		// 6-7. Demotion + admin count atomique (TOCTOU-safe)
		// Le count des admins restants se fait DANS la transaction pour eviter
		// deux admins concurrents qui se demote/delete mutuellement → 0 admin.
		await prisma.$transaction(
			async (tx) => {
				if (user.role === Role.ADMIN && newRole === Role.USER) {
					const otherAdmins = await tx.user.count({
						where: { role: Role.ADMIN, ...notDeleted, id: { not: userId } },
					});

					if (otherAdmins < 1) {
						throw new BusinessError(
							"Impossible de retirer le dernier administrateur.",
							"LAST_ADMIN",
						);
					}
				}

				await tx.user.update({
					where: { id: userId },
					data: { role: newRole },
				});
			},
			{ isolationLevel: "Serializable" },
		);

		// 8. Revalider le cache
		updateTag(SHARED_CACHE_TAGS.ADMIN_CUSTOMERS_LIST);
		updateTag(SHARED_CACHE_TAGS.ADMIN_BADGES);
		for (const tag of getUserFullInvalidationTags(userId)) {
			updateTag(tag);
		}

		const roleLabel = newRole === Role.ADMIN ? "administrateur" : "utilisateur";
		return success(`${user.name ?? user.email} est maintenant ${roleLabel}.`);
	} catch (e) {
		return handleActionError(e, "Erreur lors du changement de role");
	}
}
