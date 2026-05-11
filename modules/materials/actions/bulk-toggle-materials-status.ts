"use server";

import { updateTag } from "next/cache";

import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import {
	error,
	handleActionError,
	parseFormIds,
	safeFormGet,
	success,
	validateInput,
} from "@/shared/lib/actions";
import { logAudit } from "@/shared/lib/audit-log";
import { prisma } from "@/shared/lib/prisma";
import { ADMIN_MATERIAL_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";

import { getMaterialInvalidationTags } from "../constants/cache";
import { bulkToggleMaterialStatusSchema } from "../schemas/materials.schemas";

/**
 * Active ou désactive en lot un ensemble de matériaux.
 *
 * formData :
 * - `ids`        : JSON array cuid2 (1..200)
 * - `isActive`   : "true" | "false"
 */
export async function bulkToggleMaterialsStatus(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_MATERIAL_LIMITS.BULK_OPERATIONS);
		if ("error" in rateLimit) return rateLimit.error;

		const idsResult = parseFormIds(formData, "ids");
		if ("error" in idsResult) return idsResult.error;

		const isActive = safeFormGet(formData, "isActive") === "true";

		const validation = validateInput(bulkToggleMaterialStatusSchema, {
			ids: idsResult.ids,
			isActive,
		});
		if ("error" in validation) return validation.error;

		const { ids } = validation.data;

		const materials = await prisma.material.findMany({
			where: { id: { in: ids } },
			select: { id: true, slug: true, name: true, isActive: true },
		});

		if (materials.length === 0) {
			return error("Aucun matériau valide trouvé");
		}

		const eligible = materials.filter((m) => m.isActive !== isActive);

		if (eligible.length === 0) {
			return error(
				isActive
					? "Tous les matériaux sélectionnés sont déjà actifs"
					: "Tous les matériaux sélectionnés sont déjà inactifs",
			);
		}

		const eligibleIds = eligible.map((m) => m.id);

		await prisma.material.updateMany({
			where: { id: { in: eligibleIds } },
			data: { isActive },
		});

		const tags = new Set<string>();
		for (const m of eligible) {
			getMaterialInvalidationTags(m.slug).forEach((tag) => tags.add(tag));
		}
		tags.forEach((tag) => updateTag(tag));

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: isActive ? "material.bulkActivate" : "material.bulkDeactivate",
			targetType: "material",
			// Bulk : utiliser "bulk" comme targetId pour éviter dépassement VARCHAR
			// (200 cuid joints = ~5200 chars). La liste complète vit dans metadata.materialIds.
			targetId: "bulk",
			metadata: { count: eligibleIds.length, isActive, materialIds: eligibleIds },
		});

		const verb = isActive ? "activé" : "désactivé";
		const plural = eligibleIds.length > 1 ? "s" : "";
		return success(`${eligibleIds.length} matériau${plural} ${verb}${plural} avec succès`, {
			count: eligibleIds.length,
			isActive,
		});
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue lors de l'opération groupée");
	}
}
