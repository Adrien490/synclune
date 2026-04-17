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
import { reorderColorsSchema } from "../schemas/color.schemas";

/**
 * Admin server action to reorder colors by chromatic family.
 *
 * Accepts an array of `{ id, position }` pairs and updates all positions
 * atomically in a single transaction. Used by the admin drag-and-drop
 * interface in the colors data table.
 */
export async function reorderColors(
	_prevState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_COLOR_LIMITS.REORDER);
		if ("error" in rateLimit) return rateLimit.error;

		const rawItems = formData.get("items") as string | null;
		let parsedItems: { id: string; position: number }[] = [];
		if (rawItems) {
			try {
				parsedItems = JSON.parse(rawItems) as { id: string; position: number }[];
			} catch {
				return error("Données de réordonnancement invalides");
			}
		}

		const validated = validateInput(reorderColorsSchema, { items: parsedItems });
		if ("error" in validated) return validated.error;
		const { items } = validated.data;

		await prisma.$transaction(
			items.map((item) =>
				prisma.color.update({
					where: { id: item.id },
					data: { position: item.position },
				}),
			),
		);

		const tags = getColorInvalidationTags();
		tags.forEach((tag) => updateTag(tag));

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "color.reorder",
			targetType: "color",
			targetId: "batch",
			metadata: { count: items.length },
		});

		return success("Ordre des couleurs mis à jour");
	} catch (e) {
		return handleActionError(e, "Erreur lors du réordonnancement des couleurs");
	}
}
