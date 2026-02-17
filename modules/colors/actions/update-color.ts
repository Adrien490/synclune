"use server";

import { updateTag } from "next/cache";

import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { validateInput, handleActionError, success, error } from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import { sanitizeText } from "@/shared/lib/sanitize";
import type { ActionState } from "@/shared/types/server-action";
import { generateSlug } from "@/shared/utils/generate-slug";

import { getColorInvalidationTags } from "../constants/cache";
import { updateColorSchema } from "../schemas/color.schemas";

export async function updateColor(
	_prevState: unknown,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Verification des droits admin
		const admin = await requireAdmin();
		if ("error" in admin) return admin.error;

		// 2. Extraire les donnees du FormData
		const rawData = {
			id: formData.get("id"),
			name: sanitizeText(formData.get("name") as string),
			hex: formData.get("hex"),
		};

		// Valider les donnees
		const validated = validateInput(updateColorSchema, rawData);
		if ("error" in validated) return validated.error;
		const validatedData = validated.data;

		// Verifier que la couleur existe
		const existingColor = await prisma.color.findUnique({
			where: { id: validatedData.id },
		});

		if (!existingColor) {
			return error("Cette couleur n'existe pas");
		}

		// Verifier l'unicite du nom (sauf si c'est le meme)
		if (validatedData.name !== existingColor.name) {
			const nameExists = await prisma.color.findFirst({
				where: { name: validatedData.name },
			});

			if (nameExists) {
				return error("Ce nom de couleur existe deja. Veuillez en choisir un autre.");
			}
		}

		// Generer un nouveau slug si le nom a change
		const slug =
			validatedData.name !== existingColor.name
				? await generateSlug(prisma, "color", validatedData.name)
				: existingColor.slug;

		// Mettre a jour la couleur
		await prisma.color.update({
			where: { id: validatedData.id },
			data: {
				name: validatedData.name,
				slug,
				hex: validatedData.hex,
			},
		});

		// Invalider le cache
		const tags = getColorInvalidationTags();
		tags.forEach((tag) => updateTag(tag));

		return success("Couleur modifiée avec succès");
	} catch (e) {
		return handleActionError(e, "Impossible de modifier la couleur");
	}
}
