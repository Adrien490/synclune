"use server";

import { updateTag } from "next/cache";

import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { validateInput, handleActionError, success, error } from "@/shared/lib/actions";
import { logAudit } from "@/shared/lib/audit-log";
import { prisma } from "@/shared/lib/prisma";
import { ADMIN_COLOR_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";

import { COLORS_CACHE_TAGS, getColorInvalidationTags } from "../constants/cache";
import { bulkDeleteColorsSchema } from "../schemas/color.schemas";

export async function bulkDeleteColors(
	_prevState: unknown,
	formData: FormData,
): Promise<ActionState> {
	try {
		// 1. Admin authorization check
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		// 2. Rate limiting
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_COLOR_LIMITS.BULK_OPERATIONS);
		if ("error" in rateLimit) return rateLimit.error;

		// 3. Extract IDs from FormData
		const idsString = formData.get("ids");
		let ids: unknown = [];
		try {
			ids = idsString ? JSON.parse(idsString as string) : [];
		} catch {
			return error("Format d'IDs invalide");
		}

		// Validate data
		const validated = validateInput(bulkDeleteColorsSchema, { ids });
		if ("error" in validated) return validated.error;
		const validatedData = validated.data;

		// Check for colors used by SKUs
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
			return error(
				`${usedColors.length} couleur${usedColors.length > 1 ? "s" : ""} (${colorNames}) ${usedColors.length > 1 ? "sont utilisees" : "est utilisee"} par des variantes. Veuillez modifier ces variantes avant de supprimer.`,
			);
		}

		// Delete the colors
		const result = await prisma.color.deleteMany({
			where: {
				id: {
					in: validatedData.ids,
				},
			},
		});

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "color.bulkDelete",
			targetType: "color",
			targetId: validatedData.ids.join(","),
			metadata: { count: result.count },
		});

		// Invalidate cache (list + detail for each deleted color)
		const tagSet = new Set(getColorInvalidationTags());
		for (const color of colorsWithUsage) {
			tagSet.add(COLORS_CACHE_TAGS.DETAIL(color.slug));
		}
		tagSet.forEach((tag) => updateTag(tag));

		return success(
			`${result.count} couleur${result.count > 1 ? "s" : ""} supprimée${result.count > 1 ? "s" : ""} avec succès`,
		);
	} catch (e) {
		return handleActionError(e, "Impossible de supprimer les couleurs");
	}
}
