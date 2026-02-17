"use server";

import { updateTag } from "next/cache";

import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { validateInput, handleActionError, success, error } from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import { ADMIN_COLOR_LIMITS } from "@/shared/lib/rate-limit-config";
import { sanitizeText } from "@/shared/lib/sanitize";
import type { ActionState } from "@/shared/types/server-action";
import { generateSlug } from "@/shared/utils/generate-slug";

import { getColorInvalidationTags } from "../constants/cache";
import { createColorSchema } from "../schemas/color.schemas";

export async function createColor(
	_prevState: unknown,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Verification des droits admin
		const admin = await requireAdmin();
		if ("error" in admin) return admin.error;

		// 2. Rate limiting
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_COLOR_LIMITS.CREATE);
		if ("error" in rateLimit) return rateLimit.error;

		// 3. Extraire les donnees du FormData
		const rawData = {
			name: sanitizeText(formData.get("name") as string),
			hex: formData.get("hex"),
		};

		// Valider les donnees
		const validated = validateInput(createColorSchema, rawData);
		if ("error" in validated) return validated.error;
		const validatedData = validated.data;

		// Verifier l'unicite du nom
		const existingName = await prisma.color.findFirst({
			where: { name: validatedData.name },
		});

		if (existingName) {
			return error("Ce nom de couleur existe deja. Veuillez en choisir un autre.");
		}

		// Generer un slug unique automatiquement
		const slug = await generateSlug(prisma, "color", validatedData.name);

		// Creer la couleur
		await prisma.color.create({
			data: {
				name: validatedData.name,
				slug,
				hex: validatedData.hex,
			},
		});

		// Invalider le cache
		const tags = getColorInvalidationTags();
		tags.forEach((tag) => updateTag(tag));

		return success("Couleur créée avec succès");
	} catch (e) {
		return handleActionError(e, "Impossible de créer la couleur");
	}
}
