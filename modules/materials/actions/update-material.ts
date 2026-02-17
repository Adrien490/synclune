"use server";

import { updateTag } from "next/cache";

import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { handleActionError, success, error, validateInput } from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import { ADMIN_MATERIAL_LIMITS } from "@/shared/lib/rate-limit-config";
import { sanitizeText } from "@/shared/lib/sanitize";
import type { ActionState } from "@/shared/types/server-action";
import { generateSlug } from "@/shared/utils/generate-slug";

import { getMaterialInvalidationTags } from "../constants/cache";
import { updateMaterialSchema } from "../schemas/materials.schemas";

export async function updateMaterial(
	_prevState: unknown,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Verification des droits admin
		const admin = await requireAdmin();
		if ("error" in admin) return admin.error;

		// 2. Rate limiting
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_MATERIAL_LIMITS.UPDATE);
		if ("error" in rateLimit) return rateLimit.error;

		// 3. Extraire les donnees du FormData
		const rawData = {
			id: formData.get("id"),
			name: sanitizeText(formData.get("name") as string ?? ""),
			slug: formData.get("slug"),
			description: formData.get("description")
				? sanitizeText(formData.get("description") as string)
				: null,
			isActive: formData.get("isActive") === "true",
		};

		// Valider les donnees
		const validated = validateInput(updateMaterialSchema, rawData);
		if ("error" in validated) return validated.error;
		const validatedData = validated.data;

		// Verifier que le materiau existe
		const existingMaterial = await prisma.material.findUnique({
			where: { id: validatedData.id },
		});

		if (!existingMaterial) {
			return error("Ce materiau n'existe pas");
		}

		// Verifier l'unicite du nom (sauf si c'est le meme)
		if (validatedData.name !== existingMaterial.name) {
			const nameExists = await prisma.material.findFirst({
				where: { name: validatedData.name },
			});

			if (nameExists) {
				return error("Ce nom de materiau existe deja. Veuillez en choisir un autre.");
			}
		}

		// Generer un nouveau slug si le nom a change
		const slug =
			validatedData.name !== existingMaterial.name
				? await generateSlug(prisma, "material", validatedData.name)
				: existingMaterial.slug;

		// Mettre a jour le materiau
		await prisma.material.update({
			where: { id: validatedData.id },
			data: {
				name: validatedData.name,
				slug,
				description: validatedData.description,
				isActive: validatedData.isActive,
			},
		});

		// Invalider le cache
		// Invalider l'ancien et le nouveau slug si différents
		const tags = getMaterialInvalidationTags(existingMaterial.slug);
		if (slug !== existingMaterial.slug) {
			tags.push(...getMaterialInvalidationTags(slug));
		}
		tags.forEach((tag) => updateTag(tag));

		return success("Matériau modifié avec succès");
	} catch (e) {
		return handleActionError(e, "Impossible de modifier le materiau");
	}
}
