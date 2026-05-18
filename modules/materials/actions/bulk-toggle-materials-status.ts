"use server";

import { updateTag } from "next/cache";

import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import {
	error,
	handleActionError,
	parseFormIds,
	safeFormGet,
	success,
	validateInput,
} from "@/shared/lib/actions";
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
		const auth = await requireAdmin();
		if ("error" in auth) return auth.error;
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

		// Cascade : récupère en une seule requête tous les product slugs touchés
		// par le bulk-toggle (évite N+1 sur eligible.length matériaux).
		const skus = await prisma.productSku.findMany({
			where: { deletedAt: null, materials: { some: { materialId: { in: eligibleIds } } } },
			select: { product: { select: { slug: true } } },
			distinct: ["productId"],
		});
		const affectedProductSlugs = skus.map((s) => s.product.slug).filter(Boolean);

		const tags = new Set<string>();
		for (const m of eligible) {
			getMaterialInvalidationTags({ slug: m.slug, affectedProductSlugs }).forEach((tag) =>
				tags.add(tag),
			);
		}
		tags.forEach((tag) => updateTag(tag));

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
