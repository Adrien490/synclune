"use server";


import { isAdmin } from "@/shared/lib/guards";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { revalidatePath, updateTag } from "next/cache";

import { getColorInvalidationTags } from "../constants/cache";
import { deleteColorSchema } from "../schemas/color.schemas";

export async function deleteColor(
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
			id: formData.get("id"),
		};

		// Valider les donnees
		const validation = deleteColorSchema.safeParse(rawData);

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
			include: {
				_count: {
					select: {
						skus: true,
					},
				},
			},
		});

		if (!existingColor) {
			return {
				status: ActionStatus.ERROR,
				message: "Cette couleur n'existe pas",
			};
		}

		// Verifier si la couleur est utilisee
		const skuCount = existingColor._count.skus;
		if (skuCount > 0) {
			return {
				status: ActionStatus.ERROR,
				message: `Cette couleur est utilisee par ${skuCount} variante${skuCount > 1 ? "s" : ""}. Veuillez modifier ces variantes avant de supprimer la couleur.`,
			};
		}

		// Supprimer la couleur
		await prisma.color.delete({
			where: { id: validatedData.id },
		});

		// Revalider les pages concernees et invalider le cache
		revalidatePath("/admin/catalogue/couleurs");
		const tags = getColorInvalidationTags();
		tags.forEach((tag) => updateTag(tag));

		return {
			status: ActionStatus.SUCCESS,
			message: "Couleur supprimee avec succes",
		};
	} catch (error) {
// console.error("Erreur lors de la suppression de la couleur:", error);

		if (error instanceof Error) {
			return {
				status: ActionStatus.ERROR,
				message: error.message,
			};
		}

		return {
			status: ActionStatus.ERROR,
			message: "Une erreur est survenue lors de la suppression de la couleur",
		};
	}
}
