"use server";

import { updateTag } from "@/shared/lib/cache";
import { isAdmin } from "@/shared/lib/guards";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { generateSlug } from "@/shared/utils/generate-slug";
import { revalidatePath } from "next/cache";

import { getColorInvalidationTags } from "../constants/cache";
import { createColorSchema } from "../schemas/color.schemas";

export async function createColor(
	_prevState: unknown,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Verification des droits admin
		const admin = await isAdmin();
		if (!admin) {
			return {
				status: ActionStatus.UNAUTHORIZED,
				message: "Acces non autorise. Droits administrateur requis.",
			};
		}

		// 2. Extraire les donnees du FormData
		const rawData = {
			name: formData.get("name"),
			hex: formData.get("hex"),
		};

		// Valider les donnees
		const validation = createColorSchema.safeParse(rawData);

		if (!validation.success) {
			const firstError = validation.error.issues?.[0];
			return {
				status: ActionStatus.ERROR,
				message: firstError?.message || "Donnees invalides",
			};
		}

		const validatedData = validation.data;

		// Verifier l'unicite du nom
		const existingName = await prisma.color.findFirst({
			where: { name: validatedData.name },
		});

		if (existingName) {
			return {
				status: ActionStatus.ERROR,
				message: "Ce nom de couleur existe deja. Veuillez en choisir un autre.",
			};
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

		// Revalider les pages concernees et invalider le cache
		revalidatePath("/admin/catalogue/couleurs");
		const tags = getColorInvalidationTags();
		tags.forEach((tag) => updateTag(tag));

		return {
			status: ActionStatus.SUCCESS,
			message: "Couleur creee avec succes",
		};
	} catch (error) {
// console.error("Erreur lors de la creation de la couleur:", error);

		if (error instanceof Error) {
			return {
				status: ActionStatus.ERROR,
				message: error.message,
			};
		}

		return {
			status: ActionStatus.ERROR,
			message: "Une erreur est survenue lors de la creation de la couleur",
		};
	}
}
