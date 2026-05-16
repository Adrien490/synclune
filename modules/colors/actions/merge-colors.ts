"use server";

import { updateTag } from "next/cache";

import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { validateInput, handleActionError, success, notFound } from "@/shared/lib/actions";
import { logAudit } from "@/shared/lib/audit-log";
import { prisma } from "@/shared/lib/prisma";
import { ADMIN_COLOR_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";

import { COLORS_CACHE_TAGS, getColorInvalidationTags } from "../constants/cache";
import { mergeColorsSchema } from "../schemas/color.schemas";

/**
 * Admin server action to merge two colors.
 *
 * Réassigne tous les liens `ProductSkuColor` du source vers le target, puis
 * supprime la couleur source. Runs atomically in a single Prisma transaction.
 *
 * Use case: catalogue cleanup (merge semantic duplicates like "Bleu ciel" and
 * "Bleu clair" into a single canonical color).
 *
 * Depuis la migration M2M couleurs (2026-05-15), un SKU peut avoir plusieurs
 * couleurs. La jointure `ProductSkuColor` a un unique partiel sur
 * (skuId, colorId) — donc si un SKU contient déjà à la fois source et target,
 * le simple `updateMany` casserait l'unicité. On supprime alors la ligne source
 * (le target reste, l'utilisateur n'a pas besoin d'agir).
 */
export async function mergeColors(
	_prevState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_COLOR_LIMITS.MERGE);
		if ("error" in rateLimit) return rateLimit.error;

		const validated = validateInput(mergeColorsSchema, {
			sourceId: formData.get("sourceId"),
			targetId: formData.get("targetId"),
		});
		if ("error" in validated) return validated.error;
		const { sourceId, targetId } = validated.data;

		const merged = await prisma.$transaction(async (tx) => {
			const [source, target] = await Promise.all([
				tx.color.findUnique({
					where: { id: sourceId },
					select: { id: true, name: true, slug: true },
				}),
				tx.color.findUnique({
					where: { id: targetId },
					select: { id: true, name: true, slug: true },
				}),
			]);

			if (!source) return { kind: "source-missing" as const };
			if (!target) return { kind: "target-missing" as const };

			// SKUs liés à la couleur source via la jointure M2M
			const sourceLinks = await tx.productSkuColor.findMany({
				where: { colorId: sourceId },
				select: { id: true, skuId: true, position: true },
			});

			// SKUs qui ont DÉJÀ la couleur cible — collision : on ne crée pas un
			// doublon (skuId, colorId), on supprime simplement le lien source.
			const targetSkuIds = new Set(
				(
					await tx.productSkuColor.findMany({
						where: { colorId: targetId, skuId: { in: sourceLinks.map((l) => l.skuId) } },
						select: { skuId: true },
					})
				).map((l) => l.skuId),
			);

			const linksToReassign = sourceLinks.filter((l) => !targetSkuIds.has(l.skuId));
			const linksToDelete = sourceLinks.filter((l) => targetSkuIds.has(l.skuId));

			// Réassigne les liens sans collision : on bascule colorId source → target
			// (la position est conservée, donc l'ordre de priorité reste cohérent).
			if (linksToReassign.length > 0) {
				await tx.productSkuColor.updateMany({
					where: { id: { in: linksToReassign.map((l) => l.id) } },
					data: { colorId: targetId },
				});
			}

			// Supprime les liens en collision (le SKU a déjà target, on ne duplique pas)
			if (linksToDelete.length > 0) {
				await tx.productSkuColor.deleteMany({
					where: { id: { in: linksToDelete.map((l) => l.id) } },
				});
			}

			await tx.color.delete({ where: { id: sourceId } });

			return {
				kind: "ok" as const,
				source,
				target,
				reassignedCount: linksToReassign.length,
			};
		});

		if (merged.kind === "source-missing") return notFound("Couleur source");
		if (merged.kind === "target-missing") return notFound("Couleur cible");

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "color.merge",
			targetType: "color",
			targetId: merged.target.id,
			metadata: {
				sourceId: merged.source.id,
				sourceName: merged.source.name,
				targetId: merged.target.id,
				targetName: merged.target.name,
				reassignedSkus: merged.reassignedCount,
			},
		});

		const tagSet = new Set(getColorInvalidationTags());
		tagSet.add(COLORS_CACHE_TAGS.DETAIL(merged.source.slug));
		tagSet.add(COLORS_CACHE_TAGS.DETAIL(merged.target.slug));
		tagSet.forEach((tag) => updateTag(tag));

		return success(
			merged.reassignedCount > 0
				? `Couleur fusionnée : ${merged.reassignedCount} variante${merged.reassignedCount > 1 ? "s" : ""} réassignée${merged.reassignedCount > 1 ? "s" : ""} vers « ${merged.target.name} »`
				: `Couleur « ${merged.source.name} » supprimée et fusionnée avec « ${merged.target.name} »`,
			{ reassignedCount: merged.reassignedCount, targetId: merged.target.id },
		);
	} catch (e) {
		return handleActionError(e, "Impossible de fusionner les couleurs");
	}
}
