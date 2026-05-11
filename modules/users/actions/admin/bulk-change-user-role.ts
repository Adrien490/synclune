"use server";

import { updateTag } from "next/cache";

import { Role } from "@/app/generated/prisma/client";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import {
	BusinessError,
	error,
	handleActionError,
	parseFormIds,
	safeFormGet,
	success,
	validateInput,
} from "@/shared/lib/actions";
import { logAudit } from "@/shared/lib/audit-log";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { notDeleted, prisma } from "@/shared/lib/prisma";
import { ADMIN_USER_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";

import { USER_AUDIT_ACTIONS } from "../../constants/audit-actions";
import { getUserFullInvalidationTags } from "../../constants/cache";
import { bulkChangeUserRoleSchema } from "../../schemas/user-admin.schemas";

/**
 * Change le rôle en lot d'un ensemble d'utilisateurs.
 *
 * Garde-fous :
 * - L'admin courant ne peut pas modifier son propre rôle (toujours skipped)
 * - Les utilisateurs supprimés/suspendus sont exclus
 * - Demotion ADMIN→USER bloquée si ça laisse 0 admin
 *
 * formData :
 * - `ids`  : JSON array cuid2 (1..200)
 * - `role` : "USER" | "ADMIN"
 */
export async function bulkChangeUserRole(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_USER_LIMITS.BULK_OPERATIONS);
		if ("error" in rateLimit) return rateLimit.error;

		const idsResult = parseFormIds(formData, "ids");
		if ("error" in idsResult) return idsResult.error;

		const validation = validateInput(bulkChangeUserRoleSchema, {
			ids: idsResult.ids,
			role: safeFormGet(formData, "role") ?? undefined,
		});
		if ("error" in validation) return validation.error;

		const { ids, role: targetRole } = validation.data;

		// Exclure l'admin courant systématiquement
		const filteredIds = ids.filter((id) => id !== adminUser.id);
		const skippedSelf = ids.length - filteredIds.length;

		if (filteredIds.length === 0) {
			return error("Vous ne pouvez pas modifier votre propre rôle");
		}

		const users = await prisma.user.findMany({
			where: {
				id: { in: filteredIds },
				...notDeleted,
				suspendedAt: null,
			},
			select: { id: true, name: true, email: true, role: true },
		});

		if (users.length === 0) {
			return error(
				"Aucun utilisateur valide trouvé (vérifiez qu'ils ne sont pas supprimés ou suspendus)",
			);
		}

		const eligible = users.filter((u) => u.role !== targetRole);

		if (eligible.length === 0) {
			return error(
				targetRole === Role.ADMIN
					? "Tous les utilisateurs sélectionnés sont déjà administrateurs"
					: "Tous les utilisateurs sélectionnés sont déjà utilisateurs",
			);
		}

		const eligibleIds = eligible.map((u) => u.id);

		// Demotion + admin count atomique (TOCTOU-safe).
		// Le count des admins restants HORS de la batch se fait DANS la transaction
		// pour eviter deux batchs concurrents qui passeraient chacun le check.
		await prisma.$transaction(
			async (tx) => {
				if (targetRole === Role.USER) {
					const demoting = eligible.filter((u) => u.role === Role.ADMIN);
					if (demoting.length > 0) {
						const remainingAdmins = await tx.user.count({
							where: {
								role: Role.ADMIN,
								...notDeleted,
								id: { notIn: eligibleIds },
							},
						});
						if (remainingAdmins < 1) {
							throw new BusinessError(
								"Impossible de retirer le rôle administrateur : au moins un admin doit rester actif",
								"LAST_ADMIN",
							);
						}
					}
				}

				await tx.user.updateMany({
					where: { id: { in: eligibleIds } },
					data: { role: targetRole },
				});
			},
			{ isolationLevel: "Serializable" },
		);

		updateTag(SHARED_CACHE_TAGS.ADMIN_CUSTOMERS_LIST);
		updateTag(SHARED_CACHE_TAGS.ADMIN_BADGES);
		const tags = new Set<string>();
		for (const id of eligibleIds) {
			getUserFullInvalidationTags(id).forEach((tag) => tags.add(tag));
		}
		tags.forEach((tag) => updateTag(tag));

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action:
				targetRole === Role.ADMIN
					? USER_AUDIT_ACTIONS.BULK_PROMOTE
					: USER_AUDIT_ACTIONS.BULK_DEMOTE,
			targetType: "user",
			targetId: eligibleIds.join(","),
			metadata: {
				count: eligibleIds.length,
				targetRole,
				userIds: eligibleIds,
				skippedSelf,
			},
		});

		const verb = targetRole === Role.ADMIN ? "promu" : "rétrogradé";
		const plural = eligibleIds.length > 1 ? "s" : "";
		const skippedHint = skippedSelf > 0 ? ` (votre propre compte ignoré)` : "";
		return success(
			`${eligibleIds.length} utilisateur${plural} ${verb}${plural} avec succès${skippedHint}`,
			{ count: eligibleIds.length, targetRole },
		);
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue lors du changement de rôle");
	}
}
