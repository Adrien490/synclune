"use server";

import { updateTag } from "next/cache";

import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { validateInput, handleActionError, success, error } from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";

import { getColorInvalidationTags } from "../constants/cache";
import { toggleColorStatusSchema } from "../schemas/color.schemas";

export async function toggleColorStatus(
	_prevState: unknown,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Admin authorization check
		const admin = await requireAdmin();
		if ("error" in admin) return admin.error;

		// 2. Extract data from FormData
		const rawData = {
			id: formData.get("id"),
			isActive: formData.get("isActive") === "true",
		};

		// Validate data
		const validated = validateInput(toggleColorStatusSchema, rawData);
		if ("error" in validated) return validated.error;
		const validatedData = validated.data;

		// Check that the color exists
		const existingColor = await prisma.color.findUnique({
			where: { id: validatedData.id },
		});

		if (!existingColor) {
			return error("Cette couleur n'existe pas");
		}

		// Update status
		await prisma.color.update({
			where: { id: validatedData.id },
			data: {
				isActive: validatedData.isActive,
			},
		});

		// Invalidate cache
		const tags = getColorInvalidationTags(existingColor.slug);
		tags.forEach((tag) => updateTag(tag));

		return success(validatedData.isActive
			? "Couleur activée avec succès"
			: "Couleur désactivée avec succès");
	} catch (e) {
		return handleActionError(e, "Impossible de modifier le statut de la couleur");
	}
}
