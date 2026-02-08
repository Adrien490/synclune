"use server";

import { updateTag } from "next/cache";

import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { validateInput, handleActionError, success, error } from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";

import { getColorInvalidationTags } from "../constants/cache";
import { deleteColorSchema } from "../schemas/color.schemas";

export async function deleteColor(
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
		};

		// Valider les donnees
		const validated = validateInput(deleteColorSchema, rawData);
		if ("error" in validated) return validated.error;
		const validatedData = validated.data;

		// Verifier que la couleur existe
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

		// Verifier si la couleur est utilisee
		const skuCount = existingColor._count.skus;
		if (skuCount > 0) {
			return error(`Cette couleur est utilisee par ${skuCount} variante${skuCount > 1 ? "s" : ""}. Veuillez modifier ces variantes avant de supprimer la couleur.`);
		}

		// Supprimer la couleur
		await prisma.color.delete({
			where: { id: validatedData.id },
		});

		// Invalider le cache
		const tags = getColorInvalidationTags();
		tags.forEach((tag) => updateTag(tag));

		return success("Couleur supprimée avec succès");
	} catch (e) {
		return handleActionError(e, "Impossible de supprimer la couleur");
	}
}
