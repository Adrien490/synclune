"use server";

import { updateTag } from "next/cache";

import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { handleActionError, success, error, validateInput } from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import { ADMIN_MATERIAL_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";

import { getMaterialInvalidationTags } from "../constants/cache";
import { bulkDeleteMaterialsSchema } from "../schemas/materials.schemas";

export async function bulkDeleteMaterials(
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

		// 3. Extraire les IDs du FormData
		const idsString = formData.get("ids");
		let ids: unknown[];
		try {
			ids = idsString ? JSON.parse(idsString as string) : [];
		} catch {
			return error("Format des IDs invalide");
		}

		// Valider les donnees
		const validated = validateInput(bulkDeleteMaterialsSchema, { ids });
		if ("error" in validated) return validated.error;
		const validatedData = validated.data;

		// Verifier les materiaux utilises
		const materialsWithUsage = await prisma.material.findMany({
			where: {
				id: {
					in: validatedData.ids,
				},
			},
			include: {
				_count: {
					select: {
						skus: true,
					},
				},
			},
		});

		const usedMaterials = materialsWithUsage.filter((material) => material._count.skus > 0);

		if (usedMaterials.length > 0) {
			const materialNames = usedMaterials.map((m) => m.name).join(", ");
			return error(`${usedMaterials.length} materiau${usedMaterials.length > 1 ? "x" : ""} (${materialNames}) ${usedMaterials.length > 1 ? "sont utilises" : "est utilise"} par des variantes. Veuillez modifier ces variantes avant de supprimer.`);
		}

		// Recuperer les slugs avant suppression pour invalidation cache
		const slugs = materialsWithUsage.map((m) => m.slug);

		// Supprimer les materiaux
		const result = await prisma.material.deleteMany({
			where: {
				id: {
					in: validatedData.ids,
				},
			},
		});

		// Invalider le cache (list + detail de chaque materiau)
		const tags = getMaterialInvalidationTags();
		for (const slug of slugs) {
			tags.push(...getMaterialInvalidationTags(slug));
		}
		// Deduplicate tags
		const uniqueTags = [...new Set(tags)];
		uniqueTags.forEach((tag) => updateTag(tag));

		return success(`${result.count} materiau${result.count > 1 ? "x" : ""} supprime${result.count > 1 ? "s" : ""} avec succes`);
	} catch (e) {
		return handleActionError(e, "Impossible de supprimer les materiaux");
	}
}
