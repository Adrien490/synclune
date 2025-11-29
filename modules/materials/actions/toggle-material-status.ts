"use server";

import { isAdmin } from "@/modules/auth/utils/guards";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { revalidatePath, updateTag } from "next/cache";

import { getMaterialInvalidationTags } from "../constants/cache";
import { toggleMaterialStatusSchema } from "../schemas/materials.schemas";

export async function toggleMaterialStatus(
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
			isActive: formData.get("isActive") === "true",
		};

		// Valider les donnees
		const validation = toggleMaterialStatusSchema.safeParse(rawData);

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
		});

		if (!existingMaterial) {
			return {
				status: ActionStatus.ERROR,
				message: "Ce materiau n'existe pas",
			};
		}

		// Mettre a jour le statut
		await prisma.material.update({
			where: { id: validatedData.id },
			data: {
				isActive: validatedData.isActive,
			},
		});

		// Revalider les pages concernees et invalider le cache
		revalidatePath("/admin/catalogue/materiaux");
		const tags = getMaterialInvalidationTags(existingMaterial.slug);
		tags.forEach((tag) => updateTag(tag));

		return {
			status: ActionStatus.SUCCESS,
			message: validatedData.isActive
				? "Matériau activé avec succès"
				: "Matériau désactivé avec succès",
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
			message: "Une erreur est survenue lors de la modification du statut",
		};
	}
}
