"use server";

import { isAdmin } from "@/modules/auth/utils/guards";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { revalidatePath, updateTag } from "next/cache";

import { getMaterialInvalidationTags } from "../constants/cache";
import { bulkDeleteMaterialsSchema } from "../schemas/materials.schemas";

export async function bulkDeleteMaterials(
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
		const validation = bulkDeleteMaterialsSchema.safeParse({ ids });

		if (!validation.success) {
			const firstError = validation.error.issues?.[0];
			return {
				status: ActionStatus.ERROR,
				message: firstError?.message || "Donnees invalides",
			};
		}

		const validatedData = validation.data;

		// Verifier les materiaux utilises
		const materialsWithUsage = await prisma.material.findMany({
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

		const usedMaterials = materialsWithUsage.filter((material) => material._count.skus > 0);

		if (usedMaterials.length > 0) {
			const materialNames = usedMaterials.map((m) => m.name).join(", ");
			return {
				status: ActionStatus.ERROR,
				message: `${usedMaterials.length} materiau${usedMaterials.length > 1 ? "x" : ""} (${materialNames}) ${usedMaterials.length > 1 ? "sont utilises" : "est utilise"} par des variantes. Veuillez modifier ces variantes avant de supprimer.`,
			};
		}

		// Supprimer les materiaux
		const result = await prisma.material.deleteMany({
			where: {
				id: {
					in: validatedData.ids,
				},
			},
		});

		// Revalider les pages concernees et invalider le cache
		revalidatePath("/admin/catalogue/materiaux");
		const tags = getMaterialInvalidationTags();
		tags.forEach((tag) => updateTag(tag));

		return {
			status: ActionStatus.SUCCESS,
			message: `${result.count} materiau${result.count > 1 ? "x" : ""} supprime${result.count > 1 ? "s" : ""} avec succes`,
		};
	} catch (error) {
		if (error instanceof Error) {
			return {
				status: ActionStatus.ERROR,
				message: error.message,
			};
		}

		return {
			status: ActionStatus.ERROR,
			message: "Une erreur est survenue lors de la suppression des materiaux",
		};
	}
}
