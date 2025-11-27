"use server";

import { updateTags } from "@/shared/lib/cache";
import { isAdmin } from "@/shared/lib/guards";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { generateSlug } from "@/shared/utils/generate-slug";
import { revalidatePath } from "next/cache";
import { UTApi } from "uploadthing/server";
import { ZodError } from "zod";

import { getCollectionInvalidationTags } from "../constants/cache";
import { updateCollectionSchema } from "../schemas/collection.schemas";

const utapi = new UTApi();

/**
 * Extrait la cle du fichier depuis une URL UploadThing
 */
function extractFileKeyFromUrl(url: string): string {
	try {
		const urlObj = new URL(url);
		const parts = urlObj.pathname.split("/");
		return parts[parts.length - 1];
	} catch {
		return url;
	}
}

export async function updateCollection(
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
			name: formData.get("name"),
			slug: formData.get("slug"),
			description: formData.get("description") || null,
			imageUrl: formData.get("imageUrl") || null,
		};

		// Valider les donnees
		const validatedData = updateCollectionSchema.parse(rawData);

		// Verifier que la collection existe
		const existingCollection = await prisma.collection.findUnique({
			where: { id: validatedData.id },
		});

		if (!existingCollection) {
			return {
				status: ActionStatus.ERROR,
				message: "Cette collection n'existe pas",
			};
		}

		// Verifier l'unicite du nom (sauf si c'est le meme)
		if (validatedData.name !== existingCollection.name) {
			const nameExists = await prisma.collection.findFirst({
				where: { name: validatedData.name },
			});

			if (nameExists) {
				return {
					status: ActionStatus.ERROR,
					message:
						"Ce nom de collection existe deja. Veuillez en choisir un autre.",
				};
			}
		}

		// Generer un nouveau slug si le nom a change
		const slug =
			validatedData.name !== existingCollection.name
				? await generateSlug(prisma, "collection", validatedData.name)
				: existingCollection.slug;

		// Supprimer l'ancienne image si elle a change
		// Note: on ne supprime que si l'URL a change ET que l'ancienne URL existe
		const oldImageUrl = existingCollection.imageUrl;
		const newImageUrl = validatedData.imageUrl;

		if (oldImageUrl && oldImageUrl !== newImageUrl) {
			try {
				const fileKey = extractFileKeyFromUrl(oldImageUrl);
				await utapi.deleteFiles(fileKey);
			} catch (error) {
				// Ignore - on continue meme si la suppression echoue
			}
		}

		// Mettre a jour la collection
		await prisma.collection.update({
			where: { id: validatedData.id },
			data: {
				name: validatedData.name,
				slug,
				description: validatedData.description,
				imageUrl: validatedData.imageUrl,
			},
		});

		// Revalider les pages concernees et invalider le cache
		revalidatePath("/admin/catalogue/collections");
		revalidatePath(`/collections/${slug}`);
		updateTags(getCollectionInvalidationTags(slug));

		return {
			status: ActionStatus.SUCCESS,
			message: "Collection modifiee avec succes",
		};
	} catch (error) {
// console.error("Erreur lors de la modification de la collection:", error);

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
			message:
				"Une erreur est survenue lors de la modification de la collection",
		};
	}
}
