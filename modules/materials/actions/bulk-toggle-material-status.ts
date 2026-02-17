"use server";

import { updateTag } from "next/cache";

import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { handleActionError, success, error, validateInput } from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import { ADMIN_MATERIAL_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";

import { getMaterialInvalidationTags } from "../constants/cache";
import { bulkToggleMaterialStatusSchema } from "../schemas/materials.schemas";

export async function bulkToggleMaterialStatus(
	_prevState: unknown,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Verification des droits admin
		const admin = await requireAdmin();
		if ("error" in admin) return admin.error;

		// 2. Rate limiting
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_MATERIAL_LIMITS.BULK_OPERATIONS);
		if ("error" in rateLimit) return rateLimit.error;

		// 3. Extraire les donnees du FormData
		const idsString = formData.get("ids");
		let ids: unknown[];
		try {
			ids = idsString ? JSON.parse(idsString as string) : [];
		} catch {
			return error("Format des IDs invalide");
		}
		const isActive = formData.get("isActive") === "true";

		// Valider les donnees
		const validated = validateInput(bulkToggleMaterialStatusSchema, { ids, isActive });
		if ("error" in validated) return validated.error;
		const validatedData = validated.data;

		// Recuperer les slugs avant mutation pour invalidation cache
		const materials = await prisma.material.findMany({
			where: { id: { in: validatedData.ids } },
			select: { slug: true },
		});
		const slugs = materials.map((m) => m.slug);

		// Mettre a jour le statut des materiaux
		const result = await prisma.material.updateMany({
			where: {
				id: {
					in: validatedData.ids,
				},
			},
			data: {
				isActive: validatedData.isActive,
			},
		});

		// Invalider le cache (list + detail de chaque materiau)
		const tags = getMaterialInvalidationTags();
		for (const slug of slugs) {
			tags.push(...getMaterialInvalidationTags(slug));
		}
		const uniqueTags = [...new Set(tags)];
		uniqueTags.forEach((tag) => updateTag(tag));

		const statusText = validatedData.isActive ? "active" : "desactive";
		return success(`${result.count} materiau${result.count > 1 ? "x" : ""} ${statusText}${result.count > 1 ? "s" : ""} avec succes`);
	} catch (e) {
		return handleActionError(e, "Impossible de modifier le statut des materiaux");
	}
}
