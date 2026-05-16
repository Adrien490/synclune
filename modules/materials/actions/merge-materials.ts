"use server";

import { updateTag } from "next/cache";

import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { validateInput, handleActionError, success, notFound } from "@/shared/lib/actions";
import { logAudit } from "@/shared/lib/audit-log";
import { prisma } from "@/shared/lib/prisma";
import { ADMIN_MATERIAL_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";

import { MATERIALS_CACHE_TAGS, getMaterialInvalidationTags } from "../constants/cache";
import { mergeMaterialsSchema } from "../schemas/materials.schemas";

/**
 * Admin server action to merge two materials.
 *
 * Reassigns every ProductSkuMaterial linked to `sourceId` to `targetId`, then
 * deletes the source material. Runs atomically in a single Prisma transaction.
 *
 * Use case: catalogue cleanup (merge semantic duplicates like "Argent 925" et
 * "Argent sterling" into a single canonical material).
 *
 * Depuis la migration M2M matériaux (2026-05-14), un SKU peut avoir plusieurs
 * matériaux. La jointure `ProductSkuMaterial` a un unique partiel sur
 * (skuId, materialId) — donc si un SKU contient déjà à la fois source et
 * target, le simple `updateMany` casserait l'unicité. On supprime alors la
 * ligne source (le target reste, l'utilisateur n'a pas besoin d'agir).
 */
export async function mergeMaterials(
	_prevState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_MATERIAL_LIMITS.MERGE);
		if ("error" in rateLimit) return rateLimit.error;

		const validated = validateInput(mergeMaterialsSchema, {
			sourceId: formData.get("sourceId"),
			targetId: formData.get("targetId"),
		});
		if ("error" in validated) return validated.error;
		const { sourceId, targetId } = validated.data;

		const merged = await prisma.$transaction(async (tx) => {
			const [source, target] = await Promise.all([
				tx.material.findUnique({
					where: { id: sourceId },
					select: { id: true, name: true, slug: true },
				}),
				tx.material.findUnique({
					where: { id: targetId },
					select: { id: true, name: true, slug: true },
				}),
			]);

			if (!source) return { kind: "source-missing" as const };
			if (!target) return { kind: "target-missing" as const };

			// SKUs liés au matériau source via la jointure M2M
			const sourceLinks = await tx.productSkuMaterial.findMany({
				where: { materialId: sourceId },
				select: { id: true, skuId: true, position: true },
			});

			// SKUs qui ont DÉJÀ le matériau cible — collision : on ne crée pas un
			// doublon (skuId, materialId), on supprime simplement le lien source.
			const targetSkuIds = new Set(
				(
					await tx.productSkuMaterial.findMany({
						where: { materialId: targetId, skuId: { in: sourceLinks.map((l) => l.skuId) } },
						select: { skuId: true },
					})
				).map((l) => l.skuId),
			);

			const linksToReassign = sourceLinks.filter((l) => !targetSkuIds.has(l.skuId));
			const linksToDelete = sourceLinks.filter((l) => targetSkuIds.has(l.skuId));

			// Réassigne les liens sans collision : on bascule materialId source → target
			// (la position est conservée, donc l'ordre de priorité reste cohérent).
			if (linksToReassign.length > 0) {
				await tx.productSkuMaterial.updateMany({
					where: { id: { in: linksToReassign.map((l) => l.id) } },
					data: { materialId: targetId },
				});
			}

			// Supprime les liens en collision (le SKU a déjà target, on ne duplique pas)
			if (linksToDelete.length > 0) {
				await tx.productSkuMaterial.deleteMany({
					where: { id: { in: linksToDelete.map((l) => l.id) } },
				});
			}

			await tx.material.delete({ where: { id: sourceId } });

			return {
				kind: "ok" as const,
				source,
				target,
				reassignedCount: linksToReassign.length,
			};
		});

		if (merged.kind === "source-missing") return notFound("Matériau source");
		if (merged.kind === "target-missing") return notFound("Matériau cible");

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "material.merge",
			targetType: "material",
			targetId: merged.target.id,
			metadata: {
				sourceId: merged.source.id,
				sourceName: merged.source.name,
				targetId: merged.target.id,
				targetName: merged.target.name,
				reassignedSkus: merged.reassignedCount,
			},
		});

		const tagSet = new Set(getMaterialInvalidationTags());
		tagSet.add(MATERIALS_CACHE_TAGS.DETAIL(merged.source.slug));
		tagSet.add(MATERIALS_CACHE_TAGS.DETAIL(merged.target.slug));
		tagSet.forEach((tag) => updateTag(tag));

		return success(
			merged.reassignedCount > 0
				? `Matériau fusionné : ${merged.reassignedCount} variante${merged.reassignedCount > 1 ? "s" : ""} réassignée${merged.reassignedCount > 1 ? "s" : ""} vers « ${merged.target.name} »`
				: `Matériau « ${merged.source.name} » supprimé et fusionné avec « ${merged.target.name} »`,
			{ reassignedCount: merged.reassignedCount, targetId: merged.target.id },
		);
	} catch (e) {
		return handleActionError(e, "Impossible de fusionner les matériaux");
	}
}
