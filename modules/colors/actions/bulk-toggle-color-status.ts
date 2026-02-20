"use server";

import { updateTag } from "next/cache";

import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { validateInput, handleActionError, success, error } from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import { ADMIN_COLOR_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";

import { getColorInvalidationTags } from "../constants/cache";
import { bulkToggleColorStatusSchema } from "../schemas/color.schemas";

export async function bulkToggleColorStatus(
	_prevState: unknown,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Admin authorization check
		const admin = await requireAdmin();
		if ("error" in admin) return admin.error;

		// 2. Rate limiting
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_COLOR_LIMITS.BULK_OPERATIONS);
		if ("error" in rateLimit) return rateLimit.error;

		// 3. Extract data from FormData
		const idsString = formData.get("ids");
		let ids: unknown = [];
		try {
			ids = idsString ? JSON.parse(idsString as string) : [];
		} catch {
			return error("Format d'IDs invalide");
		}
		const isActive = formData.get("isActive") === "true";

		// Validate data
		const validated = validateInput(bulkToggleColorStatusSchema, { ids, isActive });
		if ("error" in validated) return validated.error;
		const validatedData = validated.data;

		// Update colors status
		const result = await prisma.color.updateMany({
			where: {
				id: {
					in: validatedData.ids,
				},
			},
			data: {
				isActive: validatedData.isActive,
			},
		});

		// Invalidate cache
		const tags = getColorInvalidationTags();
		tags.forEach((tag) => updateTag(tag));

		const statusText = validatedData.isActive ? "activée" : "désactivée";
		return success(`${result.count} couleur${result.count > 1 ? "s" : ""} ${statusText}${result.count > 1 ? "s" : ""} avec succès`);
	} catch (e) {
		return handleActionError(e, "Impossible de modifier le statut des couleurs");
	}
}
