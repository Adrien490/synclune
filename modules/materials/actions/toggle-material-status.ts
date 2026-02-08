"use server";

import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { handleActionError, success, error, validateInput } from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { updateTag } from "next/cache";

import { getMaterialInvalidationTags } from "../constants/cache";
import { toggleMaterialStatusSchema } from "../schemas/materials.schemas";

export async function toggleMaterialStatus(
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
			isActive: formData.get("isActive") === "true",
		};

		// Valider les donnees
		const validated = validateInput(toggleMaterialStatusSchema, rawData);
		if ("error" in validated) return validated.error;
		const validatedData = validated.data;

		// Verifier que le materiau existe
		const existingMaterial = await prisma.material.findUnique({
			where: { id: validatedData.id },
		});

		if (!existingMaterial) {
			return error("Ce materiau n'existe pas");
		}

		// Mettre a jour le statut
		await prisma.material.update({
			where: { id: validatedData.id },
			data: {
				isActive: validatedData.isActive,
			},
		});

		// Invalider le cache
		const tags = getMaterialInvalidationTags(existingMaterial.slug);
		tags.forEach((tag) => updateTag(tag));

		return success(
			validatedData.isActive
				? "Matériau activé avec succès"
				: "Matériau désactivé avec succès"
		);
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue lors de la modification du statut");
	}
}
