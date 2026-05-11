"use server";

import { updateTag } from "next/cache";

import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { validateInput, handleActionError, success, error, notFound } from "@/shared/lib/actions";
import { logAudit } from "@/shared/lib/audit-log";
import { prisma } from "@/shared/lib/prisma";
import { ADMIN_PRODUCT_TYPE_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";

import { getProductTypeInvalidationTags } from "../utils/cache.utils";
import { mergeProductTypesSchema } from "../schemas/product-type.schemas";

/**
 * Server Action pour fusionner deux ProductType.
 *
 * Reassigne tous les Products de `sourceId` vers `targetId`,
 * puis supprime le type source. Execute atomiquement dans une transaction Prisma.
 *
 * Protections:
 * - Source et cible doivent etre differents (refine au niveau du schema).
 * - Source != isSystem (un type systeme ne peut pas etre supprime).
 * - Target peut etre isSystem (consolidation vers un type canonique OK).
 *
 * Cas d'usage: nettoyage du catalogue (fusionner "Bague fantaisie" et "Bague" en un seul).
 */
export async function mergeProductTypes(
	_prevState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_PRODUCT_TYPE_LIMITS.MERGE);
		if ("error" in rateLimit) return rateLimit.error;

		const validated = validateInput(mergeProductTypesSchema, {
			sourceId: formData.get("sourceId"),
			targetId: formData.get("targetId"),
		});
		if ("error" in validated) return validated.error;
		const { sourceId, targetId } = validated.data;

		const merged = await prisma.$transaction(async (tx) => {
			const [source, target] = await Promise.all([
				tx.productType.findUnique({
					where: { id: sourceId },
					select: { id: true, label: true, slug: true, isSystem: true },
				}),
				tx.productType.findUnique({
					where: { id: targetId },
					select: { id: true, label: true, slug: true, isSystem: true },
				}),
			]);

			if (!source) return { kind: "source-missing" as const };
			if (!target) return { kind: "target-missing" as const };
			if (source.isSystem) {
				return { kind: "source-system" as const, sourceLabel: source.label };
			}

			const reassignedProducts = await tx.product.updateMany({
				where: { typeId: sourceId },
				data: { typeId: targetId },
			});

			await tx.productType.delete({ where: { id: sourceId } });

			return {
				kind: "ok" as const,
				source,
				target,
				reassignedProducts: reassignedProducts.count,
			};
		});

		if (merged.kind === "source-missing") return notFound("Type source");
		if (merged.kind === "target-missing") return notFound("Type cible");
		if (merged.kind === "source-system") {
			return error(
				`Le type "${merged.sourceLabel}" est un type systeme et ne peut pas etre fusionne (impossible a supprimer)`,
			);
		}

		const total = merged.reassignedProducts;

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "productType.merge",
			targetType: "productType",
			targetId: merged.target.id,
			metadata: {
				sourceId: merged.source.id,
				sourceLabel: merged.source.label,
				targetId: merged.target.id,
				targetLabel: merged.target.label,
				reassignedProducts: merged.reassignedProducts,
			},
		});

		const tagSet = new Set<string>([
			...getProductTypeInvalidationTags(merged.source.slug),
			...getProductTypeInvalidationTags(merged.target.slug),
		]);
		tagSet.forEach((tag) => updateTag(tag));

		const message =
			total > 0
				? `${total} élément(s) fusionné(s) dans « ${merged.target.label} »`
				: `Type « ${merged.source.label} » supprimé et fusionné avec « ${merged.target.label} »`;

		return success(message, {
			targetId: merged.target.id,
			reassignedProducts: merged.reassignedProducts,
		});
	} catch (e) {
		return handleActionError(e, "Impossible de fusionner les types de produit");
	}
}
