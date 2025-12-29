"use server";


import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { generateSlug } from "@/shared/utils/generate-slug";
import { revalidatePath, updateTag } from "next/cache";

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
			name: formData.get("name"),
			slug: formData.get("slug"),
			hex: formData.get("hex"),
		};

		// Valider les donnees
		const validation = updateColorSchema.safeParse(rawData);

		if (!validation.success) {
			const firstError = validation.error.issues?.[0];
			return {
				status: ActionStatus.ERROR,
				message: firstError?.message || "Donnees invalides",
			};
		}

		const validatedData = validation.data;

		// Verifier que la couleur existe
		const existingColor = await prisma.color.findUnique({
			where: { id: validatedData.id },
		});

		if (!existingColor) {
			return {
				status: ActionStatus.ERROR,
				message: "Cette couleur n'existe pas",
			};
		}

		// Verifier l'unicite du nom (sauf si c'est le meme)
		if (validatedData.name !== existingColor.name) {
			const nameExists = await prisma.color.findFirst({
				where: { name: validatedData.name },
			});

			if (nameExists) {
				return {
					status: ActionStatus.ERROR,
					message:
						"Ce nom de couleur existe deja. Veuillez en choisir un autre.",
				};
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

		// Revalider les pages concernees et invalider le cache
		revalidatePath("/admin/catalogue/couleurs");
		const tags = getColorInvalidationTags();
		tags.forEach((tag) => updateTag(tag));

		return {
			status: ActionStatus.SUCCESS,
			message: "Couleur modifiée avec succès",
		};
	} catch (error) {
// console.error("Erreur lors de la modification de la couleur:", error);

		if (error instanceof Error) {
			return {
				status: ActionStatus.ERROR,
				message: error.message,
			};
		}

		return {
			status: ActionStatus.ERROR,
			message: "Une erreur est survenue lors de la modification de la couleur",
		};
	}
}
