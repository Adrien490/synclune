"use server";

import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { handleActionError } from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { generateSlug } from "@/shared/utils/generate-slug";
import { revalidatePath, updateTag } from "next/cache";

import { getMaterialInvalidationTags } from "../constants/cache";
import { createMaterialSchema } from "../schemas/materials.schemas";

export async function createMaterial(
	_prevState: unknown,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Verification des droits admin
		const admin = await requireAdmin();
		if ("error" in admin) return admin.error;

		// 2. Extraire les donnees du FormData
		const rawData = {
			name: formData.get("name"),
			description: formData.get("description") || null,
		};

		// Valider les donnees
		const validation = createMaterialSchema.safeParse(rawData);

		if (!validation.success) {
			const firstError = validation.error.issues?.[0];
			return {
				status: ActionStatus.ERROR,
				message: firstError?.message || "Donnees invalides",
			};
		}

		const validatedData = validation.data;

		// Verifier l'unicite du nom
		const existingName = await prisma.material.findFirst({
			where: { name: validatedData.name },
		});

		if (existingName) {
			return {
				status: ActionStatus.ERROR,
				message: "Ce nom de materiau existe deja. Veuillez en choisir un autre.",
			};
		}

		// Generer un slug unique automatiquement
		const slug = await generateSlug(prisma, "material", validatedData.name);

		// Creer le materiau
		await prisma.material.create({
			data: {
				name: validatedData.name,
				slug,
				description: validatedData.description,
			},
		});

		// Revalider les pages concernees et invalider le cache
		revalidatePath("/admin/catalogue/materiaux");
		const tags = getMaterialInvalidationTags();
		tags.forEach((tag) => updateTag(tag));

		return {
			status: ActionStatus.SUCCESS,
			message: "Matériau créé avec succès",
		};
	} catch (error) {
		return handleActionError(error, "Une erreur est survenue lors de la création du matériau");
	}
}
