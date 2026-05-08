"use server";

import { updateTag } from "next/cache";

import { ProductStatus } from "@/app/generated/prisma/client";
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
import { ADMIN_SKU_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";
import { z } from "zod";

import { getSkuInvalidationTags } from "../utils/cache.utils";

const bulkToggleSkusStatusInputSchema = z.object({
	skuIds: z
		.array(z.cuid2("ID de variante invalide"))
		.min(1, "Au moins une variante est requise")
		.max(100, "Maximum 100 variantes par opération"),
	targetIsActive: z.boolean(),
});

/**
 * Active ou désactive en lot un ensemble de variantes (SKUs).
 *
 * Règles métier (parité avec `update-sku-status`) :
 * - Variantes par défaut (`isDefault=true`) exclues automatiquement
 * - Pour un produit PUBLIC, on n'autorise pas la désactivation si elle laisse
 *   le produit sans aucun SKU actif
 *
 * formData :
 * - `skuIds`          : JSON array cuid2 (1..100)
 * - `targetIsActive`  : "true" | "false"
 */
export async function bulkToggleSkusStatus(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_SKU_LIMITS.BULK_OPERATIONS);
		if ("error" in rateLimit) return rateLimit.error;

		const idsResult = parseFormIds(formData, "skuIds");
		if ("error" in idsResult) return idsResult.error;

		const targetIsActive = safeFormGet(formData, "targetIsActive") === "true";

		const validation = validateInput(bulkToggleSkusStatusInputSchema, {
			skuIds: idsResult.ids,
			targetIsActive,
		});
		if ("error" in validation) return validation.error;

		const { skuIds } = validation.data;

		const skus = await prisma.productSku.findMany({
			where: { id: { in: skuIds } },
			select: {
				id: true,
				sku: true,
				isActive: true,
				isDefault: true,
				productId: true,
				product: {
					select: {
						slug: true,
						status: true,
						_count: {
							select: { skus: { where: { isActive: true, deletedAt: null } } },
						},
					},
				},
			},
		});

		if (skus.length === 0) {
			return error("Aucune variante valide trouvée");
		}

		const wrongStatus = skus.filter((s) => s.isActive !== targetIsActive);
		const skippedDefault = wrongStatus.filter((s) => s.isDefault);
		const candidates = wrongStatus.filter((s) => !s.isDefault);

		// Pour la désactivation : garantir au moins 1 SKU actif par produit PUBLIC
		const eligible = candidates.filter((s) => {
			if (targetIsActive) return true;
			if (s.product.status !== ProductStatus.PUBLIC) return true;
			// Au moment du fetch, ce SKU est encore actif (filtré par wrongStatus)
			// Le produit doit avoir > 1 actif pour qu'on puisse en désactiver un.
			return s.product._count.skus > 1;
		});

		// Si désactivation et 2 SKUs actifs du même produit dans la sélection,
		// on n'en désactive qu'un (sécurité supplémentaire — group par productId).
		const safeEligible: typeof eligible = [];
		if (!targetIsActive) {
			const productSkuCount = new Map<string, number>();
			for (const sku of eligible) {
				const remaining = sku.product._count.skus - (productSkuCount.get(sku.productId) ?? 0);
				if (remaining > 1) {
					safeEligible.push(sku);
					productSkuCount.set(sku.productId, (productSkuCount.get(sku.productId) ?? 0) + 1);
				}
			}
		} else {
			safeEligible.push(...eligible);
		}

		if (safeEligible.length === 0) {
			if (skippedDefault.length > 0) {
				return error(
					"Les variantes par défaut ne peuvent pas être désactivées. Définissez d'abord une autre variante par défaut.",
				);
			}
			return error(
				targetIsActive
					? "Toutes les variantes sélectionnées sont déjà actives"
					: "Impossible : un produit public doit conserver au moins une variante active",
			);
		}

		const eligibleIds = safeEligible.map((s) => s.id);

		await prisma.productSku.updateMany({
			where: { id: { in: eligibleIds } },
			data: { isActive: targetIsActive },
		});

		const tags = new Set<string>();
		for (const s of safeEligible) {
			getSkuInvalidationTags(s.sku, s.productId, s.product.slug, s.id).forEach((tag) =>
				tags.add(tag),
			);
		}
		tags.forEach((tag) => updateTag(tag));

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: targetIsActive ? "sku.bulkActivate" : "sku.bulkDeactivate",
			targetType: "sku",
			targetId: eligibleIds.join(","),
			metadata: {
				count: eligibleIds.length,
				targetIsActive,
				skuIds: eligibleIds,
				skippedDefault: skippedDefault.length,
				skippedPublicGuard: candidates.length - eligible.length,
			},
		});

		const verb = targetIsActive ? "activée" : "désactivée";
		const plural = eligibleIds.length > 1 ? "s" : "";
		const skippedHint =
			skippedDefault.length > 0
				? ` (${skippedDefault.length} variante${skippedDefault.length > 1 ? "s" : ""} par défaut ignorée${skippedDefault.length > 1 ? "s" : ""})`
				: "";
		return success(
			`${eligibleIds.length} variante${plural} ${verb}${plural} avec succès${skippedHint}`,
			{ count: eligibleIds.length, targetIsActive },
		);
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue lors de l'opération groupée");
	}
}
