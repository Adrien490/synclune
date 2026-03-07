"use server";

import { updateTag } from "next/cache";

import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import {
	validateInput,
	handleActionError,
	success,
	error,
	safeFormGetJSON,
} from "@/shared/lib/actions";
import { logAudit } from "@/shared/lib/audit-log";
import { prisma } from "@/shared/lib/prisma";
import { ADMIN_COLOR_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";

import { COLORS_CACHE_TAGS, getColorInvalidationTags } from "../constants/cache";
import { bulkToggleColorStatusSchema } from "../schemas/color.schemas";

export async function bulkToggleColorStatus(
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

		// 3. Extract data from FormData
		const ids: unknown = safeFormGetJSON<unknown>(formData, "ids") ?? [];
		const isActive = formData.get("isActive") === "true";

		// Validate data
		const validated = validateInput(bulkToggleColorStatusSchema, { ids, isActive });
		if ("error" in validated) return validated.error;
		const validatedData = validated.data;

		// Fetch colors to get slugs for cache invalidation
		const colors = await prisma.color.findMany({
			where: { id: { in: validatedData.ids } },
			select: { slug: true },
		});

		// Store slugs BEFORE update — captured from the current DB state
		const slugsToInvalidate = colors.map((c) => c.slug);

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

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "color.bulkToggleStatus",
			targetType: "color",
			targetId: validatedData.ids.join(","),
			metadata: { count: result.count, isActive: validatedData.isActive },
		});

		// Invalidate cache (list + detail for each toggled color)
		const tagSet = new Set(getColorInvalidationTags());
		for (const slug of slugsToInvalidate) {
			tagSet.add(COLORS_CACHE_TAGS.DETAIL(slug));
		}
		tagSet.forEach((tag) => updateTag(tag));

		const statusText = validatedData.isActive ? "activée" : "désactivée";
		return success(
			`${result.count} couleur${result.count > 1 ? "s" : ""} ${statusText}${result.count > 1 ? "s" : ""} avec succès`,
		);
	} catch (e) {
		return handleActionError(e, "Impossible de modifier le statut des couleurs");
	}
}
