"use server";

import { isAdmin } from "@/modules/auth/utils/guards";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { revalidatePath, updateTag } from "next/cache";

import { getMaterialInvalidationTags } from "../constants/cache";
import { deleteMaterialSchema } from "../schemas/materials.schemas";

export async function deleteMaterial(
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
		const validation = deleteMaterialSchema.safeParse(rawData);

		if (!validation.success) {
			const firstError = validation.error.issues?.[0];
			return {
				status: ActionStatus.ERROR,
				message: firstError?.message || "Donnees invalides",
			};
		}

		const validatedData = validation.data;

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
			return {
				status: ActionStatus.ERROR,
				message: "Ce materiau n'existe pas",
			};
		}

		// Verifier si le materiau est utilise
		const skuCount = existingMaterial._count.skus;
		if (skuCount > 0) {
			return {
				status: ActionStatus.ERROR,
				message: `Ce materiau est utilise par ${skuCount} variante${skuCount > 1 ? "s" : ""}. Veuillez modifier ces variantes avant de supprimer le materiau.`,
			};
		}

		// Supprimer le materiau
		await prisma.material.delete({
			where: { id: validatedData.id },
		});

		// Revalider les pages concernees et invalider le cache
		revalidatePath("/admin/catalogue/materiaux");
		const tags = getMaterialInvalidationTags();
		tags.forEach((tag) => updateTag(tag));

		return {
			status: ActionStatus.SUCCESS,
			message: "Matériau supprimé avec succès",
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
			message: "Une erreur est survenue lors de la suppression du materiau",
		};
	}
}
