"use server";

import { revalidatePath, updateTag } from "next/cache";

import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { handleActionError } from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";

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
		const validation = bulkToggleColorStatusSchema.safeParse({ ids, isActive });

		if (!validation.success) {
			const firstError = validation.error.issues?.[0];
			return {
				status: ActionStatus.ERROR,
				message: firstError?.message || "Donnees invalides",
			};
		}

		const validatedData = validation.data;

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

		// Revalidate pages and invalidate cache
		revalidatePath("/admin/catalogue/couleurs");
		const tags = getColorInvalidationTags();
		tags.forEach((tag) => updateTag(tag));

		const statusText = validatedData.isActive ? "activee" : "desactivee";
		return {
			status: ActionStatus.SUCCESS,
			message: `${result.count} couleur${result.count > 1 ? "s" : ""} ${statusText}${result.count > 1 ? "s" : ""} avec succes`,
		};
	} catch (e) {
		return handleActionError(e, "Impossible de modifier le statut des couleurs");
	}
}
