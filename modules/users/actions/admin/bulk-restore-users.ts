"use server";

import { updateTag } from "next/cache";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import {
	requireAdmin,
	enforceRateLimitForCurrentUser,
	validateInput,
	success,
	error,
	handleActionError,
} from "@/shared/lib/actions";
import { bulkRestoreUsersSchema } from "../../schemas/user-admin.schemas";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";

// Rate limit: 5 requêtes par minute (bulk actions)
const BULK_RESTORE_RATE_LIMIT = { limit: 5, windowMs: 60 * 1000 };

export async function bulkRestoreUsers(
	_prevState: unknown,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Rate limiting
		const rateCheck = await enforceRateLimitForCurrentUser(BULK_RESTORE_RATE_LIMIT);
		if ("error" in rateCheck) return rateCheck.error;

		// 2. Verification des droits admin
		const adminCheck = await requireAdmin();
		if ("error" in adminCheck) return adminCheck.error;

		// 3. Extraire et valider les IDs
		const idsString = formData.get("ids");
		const rawData = {
			ids: idsString ? JSON.parse(idsString as string) : [],
		};

		const validation = validateInput(bulkRestoreUsersSchema, rawData);
		if ("error" in validation) return validation.error;

		const validatedData = validation.data;

		// 3. Filtrer les utilisateurs eligibles (supprimes ou suspendus)
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

		// 4. Restaurer les utilisateurs
		const result = await prisma.user.updateMany({
			where: { id: { in: eligibleIds } },
			data: {
				deletedAt: null,
				suspendedAt: null,
			},
		});

		// 5. Revalider le cache
		updateTag(SHARED_CACHE_TAGS.ADMIN_CUSTOMERS_LIST);
		updateTag(SHARED_CACHE_TAGS.ADMIN_BADGES);

		return success(
			`${result.count} utilisateur${result.count > 1 ? "s" : ""} restaure${result.count > 1 ? "s" : ""} avec succes.`
		);
	} catch (e) {
		return handleActionError(e, "Erreur lors de la restauration des utilisateurs");
	}
}
