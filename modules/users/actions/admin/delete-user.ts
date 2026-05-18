"use server";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";

import { updateTag } from "next/cache";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { AccountStatus, Role } from "@/app/generated/prisma/client";
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
import { deleteUserSchema } from "../../schemas/user-admin.schemas";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { USERS_CACHE_TAGS, getUserFullInvalidationTags } from "../../constants/cache";

export async function deleteUser(_prevState: unknown, formData: FormData): Promise<ActionState> {
	try {
		// 1. Verification des droits admin (avant rate-limit)
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		// 2. Rate limiting
		const rateCheck = await enforceRateLimitForCurrentUser(ADMIN_USER_LIMITS.DELETE_USER);
		if ("error" in rateCheck) return rateCheck.error;

		// 3. Extraire et valider l'ID
		const rawData = { id: safeFormGet(formData, "id") };
		const validation = validateInput(deleteUserSchema, rawData);
		if ("error" in validation) return validation.error;

		const { id: userId } = validation.data;

		// 4. Verifier qu'on ne supprime pas son propre compte
		if (adminUser.id === userId) {
			return error("Vous ne pouvez pas supprimer votre propre compte.");
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
			return error("Cet utilisateur est deja supprime.");
		}

		// 5b-6. Soft delete + admin count atomique (TOCTOU-safe)
		await prisma.$transaction(
			async (tx) => {
				if (user.role === Role.ADMIN) {
					const otherAdmins = await tx.user.count({
						where: { role: Role.ADMIN, ...notDeleted, id: { not: userId } },
					});
					if (otherAdmins < 1) {
						throw new BusinessError(
							"Impossible de supprimer le dernier administrateur.",
							"LAST_ADMIN",
						);
					}
				}

				await tx.user.update({
					where: { id: userId },
					data: { deletedAt: new Date(), accountStatus: AccountStatus.INACTIVE },
				});
			},
			{ isolationLevel: "Serializable" },
		);

		// 7. Revalider le cache
		updateTag(SHARED_CACHE_TAGS.ADMIN_CUSTOMERS_LIST);
		updateTag(SHARED_CACHE_TAGS.ADMIN_BADGES);
		updateTag(USERS_CACHE_TAGS.ACCOUNTS_LIST);
		for (const tag of getUserFullInvalidationTags(userId)) {
			updateTag(tag);
		}

		return success(`L'utilisateur ${user.name ?? user.email} a ete supprime.`);
	} catch (e) {
		return handleActionError(e, "Erreur lors de la suppression de l'utilisateur");
	}
}
