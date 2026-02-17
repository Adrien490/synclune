"use server";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";

import { updateTag } from "next/cache";
import { AccountStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import {
	validateInput,
	success,
	error,
	handleActionError,
} from "@/shared/lib/actions";
import { ADMIN_USER_LIMITS } from "@/shared/lib/rate-limit-config";
import { bulkRestoreUsersSchema } from "../../schemas/user-admin.schemas";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { USERS_CACHE_TAGS, getUserFullInvalidationTags } from "../../constants/cache";

export async function bulkRestoreUsers(
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
		let parsedIds: unknown;
		try {
			parsedIds = idsString ? JSON.parse(idsString as string) : [];
		} catch {
			return error("Format des IDs invalide.");
		}

		const validation = validateInput(bulkRestoreUsersSchema, { ids: parsedIds });
		if ("error" in validation) return validation.error;

		const validatedData = validation.data;

		// 4. Filtrer les utilisateurs eligibles (supprimes ou suspendus)
		const eligibleUsers = await prisma.user.findMany({
			where: {
				id: { in: validatedData.ids },
				OR: [
					{ deletedAt: { not: null } },
					{ suspendedAt: { not: null } },
				],
			},
			select: { id: true },
		});

		if (eligibleUsers.length === 0) {
			return error("Aucun utilisateur eligible pour la restauration.");
		}

		const eligibleIds = eligibleUsers.map((u) => u.id);

		// 5. Restaurer les utilisateurs
		const result = await prisma.user.updateMany({
			where: { id: { in: eligibleIds } },
			data: {
				deletedAt: null,
				suspendedAt: null,
				accountStatus: AccountStatus.ACTIVE,
			},
		});

		// 6. Revalider le cache
		updateTag(SHARED_CACHE_TAGS.ADMIN_CUSTOMERS_LIST);
		updateTag(SHARED_CACHE_TAGS.ADMIN_BADGES);
		updateTag(USERS_CACHE_TAGS.ACCOUNTS_LIST);
		for (const id of eligibleIds) {
			for (const tag of getUserFullInvalidationTags(id)) {
				updateTag(tag);
			}
		}

		return success(
			`${result.count} utilisateur${result.count > 1 ? "s" : ""} restaure${result.count > 1 ? "s" : ""} avec succes.`
		);
	} catch (e) {
		return handleActionError(e, "Erreur lors de la restauration des utilisateurs");
	}
}
