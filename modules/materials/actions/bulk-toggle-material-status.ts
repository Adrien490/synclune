"use server";

import { isAdmin } from "@/modules/auth/utils/guards";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { revalidatePath, updateTag } from "next/cache";

import { getMaterialInvalidationTags } from "../constants/cache";
import { bulkToggleMaterialStatusSchema } from "../schemas/materials.schemas";

export async function bulkToggleMaterialStatus(
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
		const idsString = formData.get("ids");
		const ids = idsString ? JSON.parse(idsString as string) : [];
		const isActive = formData.get("isActive") === "true";

		// Valider les donnees
		const validation = bulkToggleMaterialStatusSchema.safeParse({ ids, isActive });

		if (!validation.success) {
			const firstError = validation.error.issues?.[0];
			return {
				status: ActionStatus.ERROR,
				message: firstError?.message || "Donnees invalides",
			};
		}

		const validatedData = validation.data;

		// Mettre a jour le statut des materiaux
		const result = await prisma.material.updateMany({
			where: {
				id: {
					in: validatedData.ids,
				},
			},
			data: {
				isActive: validatedData.isActive,
			},
		});

		// Revalider les pages concernees et invalider le cache
		revalidatePath("/admin/catalogue/materiaux");
		const tags = getMaterialInvalidationTags();
		tags.forEach((tag) => updateTag(tag));

		const statusText = validatedData.isActive ? "active" : "desactive";
		return {
			status: ActionStatus.SUCCESS,
			message: `${result.count} materiau${result.count > 1 ? "x" : ""} ${statusText}${result.count > 1 ? "s" : ""} avec succes`,
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
			message: "Une erreur est survenue lors de la modification du statut des materiaux",
		};
	}
}
