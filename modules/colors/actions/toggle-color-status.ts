"use server";

import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { handleActionError } from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { revalidatePath, updateTag } from "next/cache";

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
		const validation = toggleColorStatusSchema.safeParse(rawData);

		if (!validation.success) {
			const firstError = validation.error.issues?.[0];
			return {
				status: ActionStatus.ERROR,
				message: firstError?.message || "Donnees invalides",
			};
		}

		const validatedData = validation.data;

		// Check that the color exists
		const existingColor = await prisma.color.findUnique({
			where: { id: validatedData.id },
		});

		if (!existingColor) {
			return {
				status: ActionStatus.ERROR,
				message: "Cette couleur n'existe pas",
			};
		}

		// Update status
		await prisma.color.update({
			where: { id: validatedData.id },
			data: {
				isActive: validatedData.isActive,
			},
		});

		// Revalidate pages and invalidate cache
		revalidatePath("/admin/catalogue/couleurs");
		const tags = getColorInvalidationTags(existingColor.slug);
		tags.forEach((tag) => updateTag(tag));

		return {
			status: ActionStatus.SUCCESS,
			message: validatedData.isActive
				? "Couleur activée avec succès"
				: "Couleur désactivée avec succès",
		};
	} catch (e) {
		return handleActionError(e, "Impossible de modifier le statut de la couleur");
	}
}
