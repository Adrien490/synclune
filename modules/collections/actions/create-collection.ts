"use server";

import { updateTag } from "next/cache";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { generateSlug } from "@/shared/utils/generate-slug";
import { revalidatePath } from "next/cache";
import { ZodError } from "zod";

import { getCollectionInvalidationTags } from "../utils/cache.utils";
import { createCollectionSchema } from "../schemas/collection.schemas";

export async function createCollection(
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
			status: formData.get("status") || undefined,
		};

		// Valider les donnees
		const validatedData = createCollectionSchema.parse(rawData);

		// Verifier l'unicite du nom
		const existingName = await prisma.collection.findFirst({
			where: { name: validatedData.name },
		});

		if (existingName) {
			return {
				status: ActionStatus.ERROR,
				message:
					"Ce nom de collection existe deja. Veuillez en choisir un autre.",
			};
		}

		// Generer un slug unique automatiquement
		const slug = await generateSlug(prisma, "collection", validatedData.name);

		// Creer la collection
		await prisma.collection.create({
			data: {
				name: validatedData.name,
				slug,
				description: validatedData.description,
				status: validatedData.status,
			},
		});

		// Revalider les pages concernees et invalider le cache
		revalidatePath("/admin/catalogue/collections");
		getCollectionInvalidationTags(slug).forEach(tag => updateTag(tag));

		return {
			status: ActionStatus.SUCCESS,
			message: "Collection créée avec succès",
			data: {
				collectionStatus: validatedData.status,
			},
		};
	} catch (error) {
// console.error("Erreur lors de la creation de la collection:", error);

		if (error instanceof ZodError) {
			// Formater les erreurs Zod de maniere lisible
			const firstError = error.issues?.[0];
			return {
				status: ActionStatus.ERROR,
				message: firstError?.message || "Donnees invalides",
			};
		}

		if (error instanceof Error) {
			return {
				status: ActionStatus.ERROR,
				message: error.message,
			};
		}

		return {
			status: ActionStatus.ERROR,
			message: "Une erreur est survenue lors de la creation de la collection",
		};
	}
}
