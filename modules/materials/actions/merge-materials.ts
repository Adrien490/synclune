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
import { ADMIN_MATERIAL_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";

import { MATERIALS_CACHE_TAGS, getMaterialInvalidationTags } from "../constants/cache";
import { mergeMaterialsSchema } from "../schemas/materials.schemas";

/**
 * Admin server action to merge two materials.
 *
 * Reassigns every ProductSku linked to `sourceId` to `targetId`, then deletes
 * the source material. Runs atomically in a single Prisma transaction.
 *
 * Use case: catalogue cleanup (merge semantic duplicates like "Argent 925" and
 * "Argent sterling" into a single canonical material).
 *
 * ProductSku has a partial unique index on (productId, colorId, size, materialId)
 * where deletedAt IS NULL — so the merge is rejected if any product already
 * owns an active SKU in both source and target material for the same color/size.
 * The admin must resolve the conflict (e.g. soft-delete one SKU) before merging.
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

			// Detect partial-unique collisions before the updateMany:
			// any (productId, colorId, size) that already exists in BOTH materials
			// (active, non-deleted) would violate the unique index after reassign.
			const [sourceSkus, targetSkus] = await Promise.all([
				tx.productSku.findMany({
					where: { materialId: sourceId, deletedAt: null },
					select: {
						productId: true,
						colorId: true,
						size: true,
						product: { select: { title: true } },
					},
				}),
				tx.productSku.findMany({
					where: { materialId: targetId, deletedAt: null },
					select: { productId: true, colorId: true, size: true },
				}),
			]);

			const targetKeys = new Set(
				targetSkus.map((s) => `${s.productId}::${s.colorId ?? ""}::${s.size ?? ""}`),
			);
			const conflicts = sourceSkus.filter((s) =>
				targetKeys.has(`${s.productId}::${s.colorId ?? ""}::${s.size ?? ""}`),
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
				where: { materialId: sourceId },
				data: { materialId: targetId },
			});

			await tx.material.delete({ where: { id: sourceId } });

			return {
				kind: "ok" as const,
				source,
				target,
				reassignedCount: reassigned.count,
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
