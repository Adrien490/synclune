"use server";

import { updateTag } from "next/cache";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { validateInput, handleActionError, success, error } from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";

import { getCollectionInvalidationTags } from "../utils/cache.utils";
import { deleteCollectionSchema } from "../schemas/collection.schemas";

export async function deleteCollection(
	_prevState: unknown,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Verification des droits admin
		const admin = await requireAdmin();
		if ("error" in admin) return admin.error;

		// 2. Extraire et valider les donnees
		const validated = validateInput(deleteCollectionSchema, {
			id: formData.get("id"),
		});
		if ("error" in validated) return validated.error;

		const validatedData = validated.data;

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
			return error("Cette collection n'existe pas");
		}

		// Note: On peut supprimer une collection meme si elle a des produits
		// car la relation est onDelete: SetNull (les produits seront preserves)
		const productCount = existingCollection._count.products;

		// Supprimer la collection
		await prisma.collection.delete({
			where: { id: validatedData.id },
		});

		// Invalider le cache
		getCollectionInvalidationTags(existingCollection.slug).forEach(tag => updateTag(tag));
		updateTag("navbar-menu");

		// Message different selon si la collection avait des produits
		const message =
			productCount > 0
				? `Collection supprimée avec succès. ${productCount} produit${productCount > 1 ? "s ont" : " a"} été préservé${productCount > 1 ? "s" : ""}.`
				: "Collection supprimée avec succès";

		return success(message);
	} catch (e) {
		return handleActionError(e, "Erreur lors de la suppression de la collection");
	}
}
