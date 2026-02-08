"use server";

import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { handleActionError, success, error, validateInput } from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import { sanitizeText } from "@/shared/lib/sanitize";
import type { ActionState } from "@/shared/types/server-action";
import { generateSlug } from "@/shared/utils/generate-slug";
import { updateTag } from "next/cache";

import { getMaterialInvalidationTags } from "../constants/cache";
import { createMaterialSchema } from "../schemas/materials.schemas";

export async function createMaterial(
	_prevState: unknown,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Verification des droits admin
		const admin = await requireAdmin();
		if ("error" in admin) return admin.error;

		// 2. Extraire les donnees du FormData
		const rawData = {
			name: sanitizeText(formData.get("name") as string ?? ""),
			description: formData.get("description")
				? sanitizeText(formData.get("description") as string)
				: null,
		};

		// Valider les donnees
		const validated = validateInput(createMaterialSchema, rawData);
		if ("error" in validated) return validated.error;
		const validatedData = validated.data;

		// Verifier l'unicite du nom
		const existingName = await prisma.material.findFirst({
			where: { name: validatedData.name },
		});

		if (existingName) {
			return error("Ce nom de materiau existe deja. Veuillez en choisir un autre.");
		}

		// Generer un slug unique automatiquement
		const slug = await generateSlug(prisma, "material", validatedData.name);

		// Creer le materiau
		await prisma.material.create({
			data: {
				name: validatedData.name,
				slug,
				description: validatedData.description,
			},
		});

		// Invalider le cache
		const tags = getMaterialInvalidationTags();
		tags.forEach((tag) => updateTag(tag));

		return success("Matériau créé avec succès");
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue lors de la création du matériau");
	}
}
