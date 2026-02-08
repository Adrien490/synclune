"use server";

import { updateTag } from "next/cache";

import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { validateInput, handleActionError, success } from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
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

		// 2. Extract data from FormData
		const idsString = formData.get("ids");
		const ids = idsString ? JSON.parse(idsString as string) : [];
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

		const statusText = validatedData.isActive ? "activee" : "desactivee";
		return success(`${result.count} couleur${result.count > 1 ? "s" : ""} ${statusText}${result.count > 1 ? "s" : ""} avec succes`);
	} catch (e) {
		return handleActionError(e, "Impossible de modifier le statut des couleurs");
	}
}
