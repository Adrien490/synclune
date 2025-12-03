"use server";

import { updateTag } from "next/cache";
import { prisma } from "@/shared/lib/prisma";
import { Role } from "@/app/generated/prisma";
import type { ActionState } from "@/shared/types/server-action";
import {
	requireAdmin,
	requireAuth,
	enforceRateLimitForCurrentUser,
	validateInput,
	success,
	error,
	handleActionError,
} from "@/shared/lib/actions";
import { bulkChangeUserRoleSchema } from "../../schemas/user-admin.schemas";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";

// Rate limit: 5 requêtes par minute (bulk actions)
const BULK_CHANGE_ROLE_RATE_LIMIT = { limit: 5, windowMs: 60 * 1000 };

export async function bulkChangeUserRole(
	_prevState: unknown,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Rate limiting
		const rateCheck = await enforceRateLimitForCurrentUser(BULK_CHANGE_ROLE_RATE_LIMIT);
		if ("error" in rateCheck) return rateCheck.error;

		// 2. Verification des droits admin
		const adminCheck = await requireAdmin();
		if ("error" in adminCheck) return adminCheck.error;

		// 3. Extraire et valider les donnees
		const idsString = formData.get("ids");
		const rawData = {
			ids: idsString ? JSON.parse(idsString as string) : [],
			role: formData.get("role") as Role,
		};

		const validation = validateInput(bulkChangeUserRoleSchema, rawData);
		if ("error" in validation) return validation.error;

		const validatedData = validation.data;

		// 4. Verifier qu'on ne change pas son propre role
		const userAuth = await requireAuth();
		if ("error" in userAuth) return userAuth.error;

		if (validatedData.ids.includes(userAuth.user.id)) {
			return error("Vous ne pouvez pas changer votre propre role.");
		}

		// 4. Filtrer les utilisateurs eligibles (non supprimes, avec role different)
		const eligibleUsers = await prisma.user.findMany({
			where: {
				id: { in: validatedData.ids },
				deletedAt: null,
				role: { not: validatedData.role },
			},
			select: { id: true, role: true },
		});

		if (eligibleUsers.length === 0) {
			return error("Aucun utilisateur eligible pour le changement de role.");
		}

		// 5. Si on retire le role admin, verifier qu'il reste au moins un admin
		if (validatedData.role === Role.USER) {
			const adminsToDowngrade = eligibleUsers.filter((u) => u.role === Role.ADMIN);

			if (adminsToDowngrade.length > 0) {
				const totalAdminCount = await prisma.user.count({
					where: {
						role: Role.ADMIN,
						deletedAt: null,
					},
				});

				if (totalAdminCount - adminsToDowngrade.length < 1) {
					return error("Impossible de retirer tous les administrateurs. Au moins un admin doit rester.");
				}
			}
		}

		const eligibleIds = eligibleUsers.map((u) => u.id);

		// 8. Changer les roles
		const result = await prisma.user.updateMany({
			where: { id: { in: eligibleIds } },
			data: { role: validatedData.role },
		});

		// 9. Revalider le cache
		updateTag(SHARED_CACHE_TAGS.ADMIN_CUSTOMERS_LIST);
		updateTag(SHARED_CACHE_TAGS.ADMIN_BADGES);

		const roleLabel = validatedData.role === Role.ADMIN ? "administrateurs" : "utilisateurs";
		return success(
			`${result.count} utilisateur${result.count > 1 ? "s" : ""} ${result.count > 1 ? "sont" : "est"} maintenant ${roleLabel}.`
		);
	} catch (e) {
		return handleActionError(e, "Erreur lors du changement de role");
	}
}
