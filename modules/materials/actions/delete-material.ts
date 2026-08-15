"use server";

import { updateTag } from "next/cache";

import { Prisma } from "@/app/generated/prisma/client";
import { requireAdmin } from "@/modules/admin-auth/lib/require-admin";
import {
	handleActionError,
	success,
	error,
	validateInput,
	BusinessError,
} from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";

import { getMaterialInvalidationTags } from "../constants/cache";
import { deleteMaterialSchema } from "../schemas/materials.schemas";

export async function deleteMaterial(
	_prevState: unknown,
	formData: FormData,
): Promise<ActionState> {
	try {
		// 1. Verification des droits admin
		const auth = await requireAdmin();
		if ("error" in auth) return auth.error;

		// 3. Extraire les donnees du FormData
		const rawData = {
			id: formData.get("id"),
		};

		// Valider les donnees
		const validated = validateInput(deleteMaterialSchema, rawData);
		if ("error" in validated) return validated.error;
		const validatedData = validated.data;

		// Check existence + variant usage and delete atomically.
		// La FK ProductVariant.materialId est en ON DELETE RESTRICT : le delete
		// lèverait P2003 si une variante concurrente est créée entre le count et
		// le delete. La pré-vérification reste pour produire un message UI lisible
		// avant d'atteindre la contrainte DB.
		const existingMaterial = await prisma.$transaction(async (tx) => {
			const material = await tx.material.findUnique({
				where: { id: validatedData.id },
				include: {
					_count: {
						select: {
							variants: true,
						},
					},
				},
			});

			if (!material) return null;

			const variantCount = material._count.variants;
			if (variantCount > 0) {
				throw new BusinessError(
					`Ce materiau est utilise par ${variantCount} variante${variantCount > 1 ? "s" : ""}. Veuillez modifier ces variantes avant de supprimer le materiau.`,
				);
			}

			await tx.material.delete({
				where: { id: validatedData.id },
			});

			return material;
		});

		if (!existingMaterial) {
			return error("Ce matériau n'existe pas");
		}

		// Invalider le cache
		const tags = getMaterialInvalidationTags(existingMaterial.id);
		tags.forEach((tag) => updateTag(tag));

		return success("Matériau supprimé avec succès");
	} catch (e) {
		// P2003 : violation FK Restrict — une variante concurrente a été créée
		// après la pré-vérification.
		if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003") {
			return error(
				"Ce matériau reste rattaché à au moins une variante. Modifie ces variantes avant de le supprimer.",
			);
		}
		return handleActionError(e, "Impossible de supprimer le matériau");
	}
}
