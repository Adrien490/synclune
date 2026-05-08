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
import { ADMIN_COLOR_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";

import { getColorInvalidationTags } from "../constants/cache";
import { bulkToggleColorsStatusSchema } from "../schemas/color.schemas";

/**
 * Active ou désactive en lot un ensemble de couleurs.
 *
 * formData :
 * - `colorIds`        : JSON array cuid2 (1..200)
 * - `targetIsActive`  : "true" | "false"
 */
export async function bulkToggleColorsStatus(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_COLOR_LIMITS.BULK_OPERATIONS);
		if ("error" in rateLimit) return rateLimit.error;

		const idsResult = parseFormIds(formData, "colorIds");
		if ("error" in idsResult) return idsResult.error;

		const targetIsActive = safeFormGet(formData, "targetIsActive") === "true";

		const validation = validateInput(bulkToggleColorsStatusSchema, {
			colorIds: idsResult.ids,
			targetIsActive,
		});
		if ("error" in validation) return validation.error;

		const { colorIds } = validation.data;

		const colors = await prisma.color.findMany({
			where: { id: { in: colorIds } },
			select: { id: true, slug: true, name: true, isActive: true },
		});

		if (colors.length === 0) {
			return error("Aucune couleur valide trouvée");
		}

		const eligible = colors.filter((c) => c.isActive !== targetIsActive);

		if (eligible.length === 0) {
			return error(
				targetIsActive
					? "Toutes les couleurs sélectionnées sont déjà actives"
					: "Toutes les couleurs sélectionnées sont déjà inactives",
			);
		}

		const eligibleIds = eligible.map((c) => c.id);

		await prisma.color.updateMany({
			where: { id: { in: eligibleIds } },
			data: { isActive: targetIsActive },
		});

		const tags = new Set<string>();
		for (const c of eligible) {
			getColorInvalidationTags(c.slug).forEach((tag) => tags.add(tag));
		}
		tags.forEach((tag) => updateTag(tag));

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: targetIsActive ? "color.bulkActivate" : "color.bulkDeactivate",
			targetType: "color",
			targetId: eligibleIds.join(","),
			metadata: { count: eligibleIds.length, targetIsActive, colorIds: eligibleIds },
		});

		const verb = targetIsActive ? "activée" : "désactivée";
		const plural = eligibleIds.length > 1 ? "s" : "";
		return success(`${eligibleIds.length} couleur${plural} ${verb}${plural} avec succès`, {
			count: eligibleIds.length,
			targetIsActive,
		});
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue lors de l'opération groupée");
	}
}
