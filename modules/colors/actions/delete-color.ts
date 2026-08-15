"use server";

import { updateTag } from "next/cache";

import { Prisma } from "@/app/generated/prisma/client";
import { requireAdmin } from "@/modules/admin-auth/lib/require-admin";
import {
	validateInput,
	handleActionError,
	success,
	error,
	BusinessError,
} from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";

import { getColorInvalidationTags } from "../constants/cache";
import { deleteColorSchema } from "../schemas/color.schemas";

export async function deleteColor(_prevState: unknown, formData: FormData): Promise<ActionState> {
	try {
		// 1. Admin authorization check
		const auth = await requireAdmin();
		if ("error" in auth) return auth.error;

		// 3. Extract data from FormData
		const rawData = {
			id: formData.get("id"),
		};

		// Validate data
		const validated = validateInput(deleteColorSchema, rawData);
		if ("error" in validated) return validated.error;
		const validatedData = validated.data;

		// Check existence + variant usage and delete atomically.
		// La FK ProductVariant.colorId est en ON DELETE RESTRICT : le delete
		// lèverait P2003 si une variante concurrente est créée entre le count et le
		// delete. La pré-vérification reste pour produire un message UI lisible
		// avant d'atteindre la contrainte DB.
		const existingColor = await prisma.$transaction(async (tx) => {
			const color = await tx.color.findUnique({
				where: { id: validatedData.id },
				include: {
					_count: {
						select: {
							variants: true,
						},
					},
				},
			});

			if (!color) return null;

			const variantCount = color._count.variants;
			if (variantCount > 0) {
				throw new BusinessError(
					`Cette couleur est utilisee par ${variantCount} variante${variantCount > 1 ? "s" : ""}. Veuillez modifier ces variantes avant de supprimer la couleur.`,
				);
			}

			await tx.color.delete({
				where: { id: validatedData.id },
			});

			return color;
		});

		if (!existingColor) {
			return error("Cette couleur n'existe pas");
		}

		// Invalidate cache
		const tags = getColorInvalidationTags(existingColor.id);
		tags.forEach((tag) => updateTag(tag));

		return success("Couleur supprimée avec succès");
	} catch (e) {
		// P2003 : violation FK Restrict — une variante concurrente a été créée
		// après la pré-vérification.
		if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003") {
			return error(
				"Cette couleur reste rattachée à au moins une variante. Modifie ces variantes avant de la supprimer.",
			);
		}
		return handleActionError(e, "Impossible de supprimer la couleur");
	}
}
