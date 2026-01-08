"use server";

import { updateTag, revalidatePath } from "next/cache";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { handleActionError } from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { generateSlug } from "@/shared/utils/generate-slug";

import { getCollectionInvalidationTags } from "../utils/cache.utils";
import { updateCollectionSchema } from "../schemas/collection.schemas";

export async function updateCollection(
	_prevState: unknown,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Verification des droits admin
		const admin = await requireAdmin();
		if ("error" in admin) return admin.error;

		// 2. Extraire et valider les donnees
		const validation = updateCollectionSchema.safeParse({
			id: formData.get("id"),
			name: formData.get("name"),
			slug: formData.get("slug"),
			description: formData.get("description") || null,
			status: formData.get("status"),
		});

		if (!validation.success) {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: validation.error.issues[0]?.message || "Donnees invalides",
			};
		}

		const validatedData = validation.data;

		// 3. Transaction pour garantir l'atomicite
		const slug = await prisma.$transaction(async (tx) => {
			// Verifier que la collection existe
			const existingCollection = await tx.collection.findUnique({
				where: { id: validatedData.id },
			});

			if (!existingCollection) {
				throw new Error("NOT_FOUND");
			}

			// Verifier l'unicite du nom (sauf si c'est le meme)
			if (validatedData.name !== existingCollection.name) {
				const nameExists = await tx.collection.findFirst({
					where: { name: validatedData.name },
				});

				if (nameExists) {
					throw new Error("NAME_EXISTS");
				}
			}

			// Generer un nouveau slug si le nom a change
			const newSlug =
				validatedData.name !== existingCollection.name
					? await generateSlug(tx, "collection", validatedData.name)
					: existingCollection.slug;

			// Mettre a jour la collection
			await tx.collection.update({
				where: { id: validatedData.id },
				data: {
					name: validatedData.name,
					slug: newSlug,
					description: validatedData.description,
					status: validatedData.status,
				},
			});

			return newSlug;
		});

		// Revalider les pages concernees et invalider le cache
		revalidatePath("/admin/catalogue/collections");
		revalidatePath(`/collections/${slug}`);
		getCollectionInvalidationTags(slug).forEach(tag => updateTag(tag));

		return {
			status: ActionStatus.SUCCESS,
			message: "Collection modifiée avec succès",
		};
	} catch (e) {
		// Gerer les erreurs metier de la transaction
		if (e instanceof Error) {
			if (e.message === "NOT_FOUND") {
				return {
					status: ActionStatus.NOT_FOUND,
					message: "Cette collection n'existe pas",
				};
			}
			if (e.message === "NAME_EXISTS") {
				return {
					status: ActionStatus.ERROR,
					message: "Ce nom de collection existe deja. Veuillez en choisir un autre.",
				};
			}
		}
		return handleActionError(e, "Erreur lors de la modification de la collection");
	}
}
