"use server";

import { updateTag } from "next/cache";

import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import {
	validateInput,
	handleActionError,
	success,
	error,
	safeFormGet,
} from "@/shared/lib/actions";
import { logAudit } from "@/shared/lib/audit-log";
import { prisma } from "@/shared/lib/prisma";
import { ADMIN_COLOR_LIMITS } from "@/shared/lib/rate-limit-config";
import { sanitizeText } from "@/shared/lib/sanitize";
import type { ActionState } from "@/shared/types/server-action";
import { generateSlug } from "@/shared/utils/generate-slug";

import { getColorInvalidationTags } from "../constants/cache";
import { createColorSchema } from "../schemas/color.schemas";

export async function createColor(_prevState: unknown, formData: FormData): Promise<ActionState> {
	try {
		// 1. Admin authorization check
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		// 2. Rate limiting
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_COLOR_LIMITS.CREATE);
		if ("error" in rateLimit) return rateLimit.error;

		// 3. Extract data from FormData
		const rawData = {
			name: sanitizeText(safeFormGet(formData, "name") ?? ""),
			hex: formData.get("hex"),
		};

		// Validate data
		const validated = validateInput(createColorSchema, rawData);
		if ("error" in validated) return validated.error;
		const validatedData = validated.data;

		// Check name uniqueness
		const existingName = await prisma.color.findFirst({
			where: { name: validatedData.name },
		});

		if (existingName) {
			return error("Ce nom de couleur existe deja. Veuillez en choisir un autre.");
		}

		// Generate unique slug automatically
		const slug = await generateSlug(prisma, "color", validatedData.name);

		// Create the color
		const created = await prisma.color.create({
			data: {
				name: validatedData.name,
				slug,
				hex: validatedData.hex,
				isActive: true,
			},
		});

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "color.create",
			targetType: "color",
			targetId: created.id,
			metadata: { name: validatedData.name, hex: validatedData.hex },
		});

		// Invalidate cache
		const tags = getColorInvalidationTags();
		tags.forEach((tag) => updateTag(tag));

		return success("Couleur créée avec succès");
	} catch (e) {
		return handleActionError(e, "Impossible de créer la couleur");
	}
}
