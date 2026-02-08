"use server";

import { updateTag } from "next/cache";

import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { handleActionError, success, error, validateInput } from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";

import { getMaterialInvalidationTags } from "../constants/cache";
import { deleteMaterialSchema } from "../schemas/materials.schemas";

export async function deleteMaterial(
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
		const validated = validateInput(deleteMaterialSchema, rawData);
		if ("error" in validated) return validated.error;
		const validatedData = validated.data;

		// Verifier que le materiau existe
		const existingMaterial = await prisma.material.findUnique({
			where: { id: validatedData.id },
			include: {
				_count: {
					select: {
						skus: true,
					},
				},
			},
		});

		if (!existingMaterial) {
			return error("Ce materiau n'existe pas");
		}

		// Verifier si le materiau est utilise
		const skuCount = existingMaterial._count.skus;
		if (skuCount > 0) {
			return error(`Ce materiau est utilise par ${skuCount} variante${skuCount > 1 ? "s" : ""}. Veuillez modifier ces variantes avant de supprimer le materiau.`);
		}

		// Supprimer le materiau
		await prisma.material.delete({
			where: { id: validatedData.id },
		});

		// Invalider le cache
		const tags = getMaterialInvalidationTags(existingMaterial.slug);
		tags.forEach((tag) => updateTag(tag));

		return success("Matériau supprimé avec succès");
	} catch (e) {
		return handleActionError(e, "Impossible de supprimer le materiau");
	}
}
