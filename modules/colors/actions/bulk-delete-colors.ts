"use server";


import { isAdmin } from "@/modules/auth/utils/guards";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { revalidatePath, updateTag } from "next/cache";

import { getColorInvalidationTags } from "../constants/cache";
import { bulkDeleteColorsSchema } from "../schemas/color.schemas";

export async function bulkDeleteColors(
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

		// 2. Extraire les IDs du FormData
		const idsString = formData.get("ids");
		const ids = idsString ? JSON.parse(idsString as string) : [];

		// Valider les donnees
		const validation = bulkDeleteColorsSchema.safeParse({ ids });

		if (!validation.success) {
			const firstError = validation.error.issues?.[0];
			return {
				status: ActionStatus.ERROR,
				message: firstError?.message || "Donnees invalides",
			};
		}

		const validatedData = validation.data;

		// Verifier les couleurs utilisees
		const colorsWithUsage = await prisma.color.findMany({
			where: {
				id: {
					in: validatedData.ids,
				},
			},
			include: {
				_count: {
					select: {
						skus: true,
					},
				},
			},
		});

		const usedColors = colorsWithUsage.filter((color) => color._count.skus > 0);

		if (usedColors.length > 0) {
			const colorNames = usedColors.map((c) => c.name).join(", ");
			return {
				status: ActionStatus.ERROR,
				message: `${usedColors.length} couleur${usedColors.length > 1 ? "s" : ""} (${colorNames}) ${usedColors.length > 1 ? "sont utilisees" : "est utilisee"} par des variantes. Veuillez modifier ces variantes avant de supprimer.`,
			};
		}

		// Supprimer les couleurs
		const result = await prisma.color.deleteMany({
			where: {
				id: {
					in: validatedData.ids,
				},
			},
		});

		// Revalider les pages concernees et invalider le cache
		revalidatePath("/admin/catalogue/couleurs");
		const tags = getColorInvalidationTags();
		tags.forEach((tag) => updateTag(tag));

		return {
			status: ActionStatus.SUCCESS,
			message: `${result.count} couleur${result.count > 1 ? "s" : ""} supprimee${result.count > 1 ? "s" : ""} avec succes`,
		};
	} catch (error) {
// console.error("Erreur lors de la suppression groupee des couleurs:", error);

		if (error instanceof Error) {
			return {
				status: ActionStatus.ERROR,
				message: error.message,
			};
		}

		return {
			status: ActionStatus.ERROR,
			message: "Une erreur est survenue lors de la suppression des couleurs",
		};
	}
}
