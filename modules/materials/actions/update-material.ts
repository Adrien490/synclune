"use server";

import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { generateSlug } from "@/shared/utils/generate-slug";
import { revalidatePath, updateTag } from "next/cache";

import { getMaterialInvalidationTags } from "../constants/cache";
import { updateMaterialSchema } from "../schemas/materials.schemas";

export async function updateMaterial(
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
			description: formData.get("description") || null,
			isActive: formData.get("isActive") === "true",
		};

		// Valider les donnees
		const validation = updateMaterialSchema.safeParse(rawData);

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

		// Verifier l'unicite du nom (sauf si c'est le meme)
		if (validatedData.name !== existingMaterial.name) {
			const nameExists = await prisma.material.findFirst({
				where: { name: validatedData.name },
			});

			if (nameExists) {
				return {
					status: ActionStatus.ERROR,
					message:
						"Ce nom de materiau existe deja. Veuillez en choisir un autre.",
				};
			}
		}

		// Generer un nouveau slug si le nom a change
		const slug =
			validatedData.name !== existingMaterial.name
				? await generateSlug(prisma, "material", validatedData.name)
				: existingMaterial.slug;

		// Mettre a jour le materiau
		await prisma.material.update({
			where: { id: validatedData.id },
			data: {
				name: validatedData.name,
				slug,
				description: validatedData.description,
				isActive: validatedData.isActive,
			},
		});

		// Revalider les pages concernees et invalider le cache
		revalidatePath("/admin/catalogue/materiaux");
		// Invalider l'ancien et le nouveau slug si différents
		const tags = getMaterialInvalidationTags(existingMaterial.slug);
		if (slug !== existingMaterial.slug) {
			tags.push(...getMaterialInvalidationTags(slug));
		}
		tags.forEach((tag) => updateTag(tag));

		return {
			status: ActionStatus.SUCCESS,
			message: "Matériau modifié avec succès",
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
			message: "Une erreur est survenue lors de la modification du materiau",
		};
	}
}
