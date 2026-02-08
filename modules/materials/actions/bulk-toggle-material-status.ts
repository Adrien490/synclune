"use server";

import { updateTag } from "next/cache";

import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { handleActionError, success, validateInput } from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
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

		// 2. Extraire les donnees du FormData
		const idsString = formData.get("ids");
		const ids = idsString ? JSON.parse(idsString as string) : [];
		const isActive = formData.get("isActive") === "true";

		// Valider les donnees
		const validated = validateInput(bulkToggleMaterialStatusSchema, { ids, isActive });
		if ("error" in validated) return validated.error;
		const validatedData = validated.data;

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

		// Invalider le cache
		const tags = getMaterialInvalidationTags();
		tags.forEach((tag) => updateTag(tag));

		const statusText = validatedData.isActive ? "active" : "desactive";
		return success(`${result.count} materiau${result.count > 1 ? "x" : ""} ${statusText}${result.count > 1 ? "s" : ""} avec succes`);
	} catch (e) {
		return handleActionError(e, "Impossible de modifier le statut des materiaux");
	}
}
