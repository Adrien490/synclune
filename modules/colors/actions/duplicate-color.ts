"use server";

import { updateTag } from "next/cache";

import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import {
	validateInput,
	handleActionError,
	success,
	error,
	notFound,
	safeFormGet,
} from "@/shared/lib/actions";
import { logAudit } from "@/shared/lib/audit-log";
import { prisma } from "@/shared/lib/prisma";
import { ADMIN_COLOR_LIMITS } from "@/shared/lib/rate-limit-config";
import { generateUniqueReadableName } from "@/shared/services/unique-name-generator.service";
import type { ActionState } from "@/shared/types/server-action";
import { generateSlug } from "@/shared/utils/generate-slug";

import { getColorInvalidationTags } from "../constants/cache";
import { duplicateColorSchema } from "../schemas/color.schemas";

/**
 * Admin server action to duplicate a color.
 *
 * Creates a copy with:
 * - A new name (original + " (copie)" or " (copie N)")
 * - A new automatically generated slug
 * - isActive set to false (to prevent accidental activation)
 */
export async function duplicateColor(
	_prevState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		// 1. Admin authorization check
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		// 2. Rate limiting
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_COLOR_LIMITS.DUPLICATE);
		if ("error" in rateLimit) return rateLimit.error;

		// 3. Validate data
		const rawData = {
			colorId: safeFormGet(formData, "colorId"),
		};

		const validated = validateInput(duplicateColorSchema, rawData);
		if ("error" in validated) return validated.error;
		const { colorId } = validated.data;

		// 4. Fetch original color
		const original = await prisma.color.findUnique({
			where: { id: colorId },
		});

		if (!original) {
			return notFound("Couleur");
		}

		// 5. Generate a unique name via the service
		const nameResult = await generateUniqueReadableName(original.name, async (name) => {
			const existing = await prisma.color.findFirst({ where: { name } });
			return existing !== null;
		});

		if (!nameResult.success) {
			return error(nameResult.error ?? "Impossible de générer un nom unique");
		}

		const newName = nameResult.name!;

		// 6. Generate a unique slug
		const slug = await generateSlug(prisma, "color", newName);

		// 7. Create the copy
		const duplicate = await prisma.color.create({
			data: {
				name: newName,
				slug,
				hex: original.hex,
				isActive: false, // Disabled by default
			},
		});

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "color.duplicate",
			targetType: "color",
			targetId: duplicate.id,
			metadata: { originalId: colorId, name: duplicate.name },
		});

		// 8. Invalidate cache
		const tags = getColorInvalidationTags();
		tags.forEach((tag) => updateTag(tag));

		return success(`Couleur dupliquee: ${duplicate.name}`, {
			id: duplicate.id,
			name: duplicate.name,
		});
	} catch (e) {
		return handleActionError(e, "Impossible de dupliquer la couleur");
	}
}
