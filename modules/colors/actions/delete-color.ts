"use server";

import { updateTag } from "next/cache";

import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { validateInput, handleActionError, success, error } from "@/shared/lib/actions";
import { logAudit } from "@/shared/lib/audit-log";
import { prisma } from "@/shared/lib/prisma";
import { ADMIN_COLOR_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";

import { getColorInvalidationTags } from "../constants/cache";
import { deleteColorSchema } from "../schemas/color.schemas";

export async function deleteColor(_prevState: unknown, formData: FormData): Promise<ActionState> {
	try {
		// 1. Admin authorization check
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		// 2. Rate limiting
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_COLOR_LIMITS.DELETE);
		if ("error" in rateLimit) return rateLimit.error;

		// 3. Extract data from FormData
		const rawData = {
			id: formData.get("id"),
		};

		// Validate data
		const validated = validateInput(deleteColorSchema, rawData);
		if ("error" in validated) return validated.error;
		const validatedData = validated.data;

		// Check that the color exists
		const existingColor = await prisma.color.findUnique({
			where: { id: validatedData.id },
			include: {
				_count: {
					select: {
						skus: true,
					},
				},
			},
		});

		if (!existingColor) {
			return error("Cette couleur n'existe pas");
		}

		// Check if the color is used by SKUs
		const skuCount = existingColor._count.skus;
		if (skuCount > 0) {
			return error(
				`Cette couleur est utilisee par ${skuCount} variante${skuCount > 1 ? "s" : ""}. Veuillez modifier ces variantes avant de supprimer la couleur.`,
			);
		}

		// Delete the color
		await prisma.color.delete({
			where: { id: validatedData.id },
		});

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "color.delete",
			targetType: "color",
			targetId: validatedData.id,
			metadata: { name: existingColor.name },
		});

		// Invalidate cache
		const tags = getColorInvalidationTags(existingColor.slug);
		tags.forEach((tag) => updateTag(tag));

		return success("Couleur supprimée avec succès");
	} catch (e) {
		return handleActionError(e, "Impossible de supprimer la couleur");
	}
}
