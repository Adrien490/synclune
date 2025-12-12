"use server";

import { updateTag } from "next/cache";
import { isAdmin } from "@/modules/auth/utils/guards";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { revalidatePath } from "next/cache";

import { getCollectionInvalidationTags } from "../utils/cache.utils";
import { deleteCollectionSchema } from "../schemas/collection.schemas";

export async function deleteCollection(
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
		const validatedData = deleteCollectionSchema.parse(rawData);

		// Verifier que la collection existe
		const existingCollection = await prisma.collection.findUnique({
			where: { id: validatedData.id },
			include: {
				_count: {
					select: {
						products: true,
					},
				},
			},
		});

		if (!existingCollection) {
			return {
				status: ActionStatus.ERROR,
				message: "Cette collection n'existe pas",
			};
		}

		// Note: On peut supprimer une collection meme si elle a des produits
		// car la relation est onDelete: SetNull (les produits seront preserves)
		const productCount = existingCollection._count.products;

		// Supprimer la collection
		await prisma.collection.delete({
			where: { id: validatedData.id },
		});

		// Revalider les pages concernees et invalider le cache
		revalidatePath("/admin/catalogue/collections");
		revalidatePath("/collections");
		getCollectionInvalidationTags(existingCollection.slug).forEach(tag => updateTag(tag));

		// Message different selon si la collection avait des produits
		const message =
			productCount > 0
				? `Collection supprimée avec succès. ${productCount} produit${productCount > 1 ? "s ont" : " a"} été préservé${productCount > 1 ? "s" : ""}.`
				: "Collection supprimée avec succès";

		return {
			status: ActionStatus.SUCCESS,
			message,
		};
	} catch (error) {
// console.error("Erreur lors de la suppression de la collection:", error);

		if (error instanceof Error) {
			return {
				status: ActionStatus.ERROR,
				message: error.message,
			};
		}

		return {
			status: ActionStatus.ERROR,
			message:
				"Une erreur est survenue lors de la suppression de la collection",
		};
	}
}
