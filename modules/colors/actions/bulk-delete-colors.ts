"use server";

import { updateTag } from "next/cache";

import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { validateInput, handleActionError, success, error } from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import { ADMIN_COLOR_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";

import { getColorInvalidationTags } from "../constants/cache";
import { bulkDeleteColorsSchema } from "../schemas/color.schemas";

export async function bulkDeleteColors(
	_prevState: unknown,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Verification des droits admin
		const admin = await requireAdmin();
		if ("error" in admin) return admin.error;

		// 2. Rate limiting
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_COLOR_LIMITS.BULK_OPERATIONS);
		if ("error" in rateLimit) return rateLimit.error;

		// 3. Extraire les IDs du FormData
		const idsString = formData.get("ids");
		let ids: unknown = [];
		try {
			ids = idsString ? JSON.parse(idsString as string) : [];
		} catch {
			return error("Format d'IDs invalide");
		}

		// Valider les donnees
		const validated = validateInput(bulkDeleteColorsSchema, { ids });
		if ("error" in validated) return validated.error;
		const validatedData = validated.data;

		// Verifier les couleurs utilisees
		const colorsWithUsage = await prisma.color.findMany({
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

		const usedColors = colorsWithUsage.filter((color) => color._count.skus > 0);

		if (usedColors.length > 0) {
			const colorNames = usedColors.map((c) => c.name).join(", ");
			return error(`${usedColors.length} couleur${usedColors.length > 1 ? "s" : ""} (${colorNames}) ${usedColors.length > 1 ? "sont utilisees" : "est utilisee"} par des variantes. Veuillez modifier ces variantes avant de supprimer.`);
		}

		// Supprimer les couleurs
		const result = await prisma.color.deleteMany({
			where: {
				id: {
					in: validatedData.ids,
				},
			},
		});

		// Invalider le cache
		const tags = getColorInvalidationTags();
		tags.forEach((tag) => updateTag(tag));

		return success(`${result.count} couleur${result.count > 1 ? "s" : ""} supprimée${result.count > 1 ? "s" : ""} avec succès`);
	} catch (e) {
		return handleActionError(e, "Impossible de supprimer les couleurs");
	}
}
