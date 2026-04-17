"use server";

import { updateTag } from "next/cache";

import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import {
	validateInput,
	handleActionError,
	success,
	notFound,
	BusinessError,
} from "@/shared/lib/actions";
import { logAudit } from "@/shared/lib/audit-log";
import { prisma } from "@/shared/lib/prisma";
import { ADMIN_COLOR_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";

import { COLORS_CACHE_TAGS, getColorInvalidationTags } from "../constants/cache";
import { mergeColorsSchema } from "../schemas/color.schemas";

/**
 * Admin server action to merge two colors.
 *
 * Reassigns every ProductSku linked to `sourceId` to `targetId`, then deletes
 * the source color. Runs atomically in a single Prisma transaction.
 *
 * Use case: catalogue cleanup (merge semantic duplicates like "Bleu ciel" and
 * "Bleu clair" into a single canonical color).
 *
 * ProductSku has a partial unique index on (productId, colorId, size, materialId)
 * where deletedAt IS NULL — so the merge is rejected if any product already
 * owns an active SKU in both source and target color for the same size/material.
 * The admin must resolve the conflict (e.g. soft-delete one SKU) before merging.
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

			// Detect partial-unique collisions before the updateMany:
			// any (productId, size, materialId) that already exists in BOTH colors
			// (active, non-deleted) would violate the unique index after reassign.
			const [sourceSkus, targetSkus] = await Promise.all([
				tx.productSku.findMany({
					where: { colorId: sourceId, deletedAt: null },
					select: {
						productId: true,
						size: true,
						materialId: true,
						product: { select: { title: true } },
					},
				}),
				tx.productSku.findMany({
					where: { colorId: targetId, deletedAt: null },
					select: { productId: true, size: true, materialId: true },
				}),
			]);

			const targetKeys = new Set(
				targetSkus.map((s) => `${s.productId}::${s.size ?? ""}::${s.materialId ?? ""}`),
			);
			const conflicts = sourceSkus.filter((s) =>
				targetKeys.has(`${s.productId}::${s.size ?? ""}::${s.materialId ?? ""}`),
			);

			if (conflicts.length > 0) {
				const names = Array.from(new Set(conflicts.map((c) => c.product.title))).slice(0, 5);
				const more =
					conflicts.length > names.length ? ` (+${conflicts.length - names.length})` : "";
				throw new BusinessError(
					`Impossible de fusionner : ${conflicts.length} variante${conflicts.length > 1 ? "s" : ""} en conflit sur ${names.join(", ")}${more}. Supprimez ou modifiez ces variantes avant de fusionner.`,
				);
			}

			const reassigned = await tx.productSku.updateMany({
				where: { colorId: sourceId },
				data: { colorId: targetId },
			});

			await tx.color.delete({ where: { id: sourceId } });

			return {
				kind: "ok" as const,
				source,
				target,
				reassignedCount: reassigned.count,
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
