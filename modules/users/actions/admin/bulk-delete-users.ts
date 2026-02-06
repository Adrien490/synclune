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
	handleActionError,
} from "@/shared/lib/actions";
import { ADMIN_USER_LIMITS } from "@/shared/lib/rate-limit-config";
import { bulkDeleteUsersSchema } from "../../schemas/user-admin.schemas";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { USERS_CACHE_TAGS, getUserFullInvalidationTags } from "../../constants/cache";

export async function bulkDeleteUsers(
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

		const validation = validateInput(bulkDeleteUsersSchema, rawData);
		if ("error" in validation) return validation.error;

		const validatedData = validation.data;

		// 4. Verifier qu'on ne supprime pas son propre compte
		const userAuth = await requireAuth();
		if ("error" in userAuth) return userAuth.error;

		if (validatedData.ids.includes(userAuth.user.id)) {
			return error("Vous ne pouvez pas supprimer votre propre compte.");
		}

		// 5. Filtrer les utilisateurs eligibles (non deja supprimes)
		const eligibleUsers = await prisma.user.findMany({
			where: {
				id: { in: validatedData.ids },
				deletedAt: null,
			},
			select: { id: true, role: true },
		});

		if (eligibleUsers.length === 0) {
			return error("Aucun utilisateur eligible pour la suppression.");
		}

		// 5b. Verifier qu'on ne supprime pas tous les admins
		const adminsToDelete = eligibleUsers.filter((u) => u.role === Role.ADMIN);
		if (adminsToDelete.length > 0) {
			const totalAdminCount = await prisma.user.count({
				where: { role: Role.ADMIN, deletedAt: null },
			});
			if (totalAdminCount - adminsToDelete.length < 1) {
				return error("Impossible de supprimer tous les administrateurs. Au moins un admin doit rester.");
			}
		}

		const eligibleIds = eligibleUsers.map((u) => u.id);

		// 6. Soft delete
		const result = await prisma.user.updateMany({
			where: { id: { in: eligibleIds } },
			data: { deletedAt: new Date() },
		});

		// 7. Revalider le cache
		updateTag(SHARED_CACHE_TAGS.ADMIN_CUSTOMERS_LIST);
		updateTag(SHARED_CACHE_TAGS.ADMIN_BADGES);
		updateTag(USERS_CACHE_TAGS.ACCOUNTS_LIST);
		for (const id of eligibleIds) {
			for (const tag of getUserFullInvalidationTags(id)) {
				updateTag(tag);
			}
		}

		return success(
			`${result.count} utilisateur${result.count > 1 ? "s" : ""} supprime${result.count > 1 ? "s" : ""} avec succes.`
		);
	} catch (e) {
		return handleActionError(e, "Erreur lors de la suppression des utilisateurs");
	}
}
