"use server";

import { updateTag, revalidatePath } from "next/cache";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { handleActionError } from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";

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
		const validation = deleteCollectionSchema.safeParse({
			id: formData.get("id"),
		});

		if (!validation.success) {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: validation.error.issues[0]?.message || "Donnees invalides",
			};
		}

		const validatedData = validation.data;

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
		updateTag("navbar-menu");

		// Message different selon si la collection avait des produits
		const message =
			productCount > 0
				? `Collection supprimée avec succès. ${productCount} produit${productCount > 1 ? "s ont" : " a"} été préservé${productCount > 1 ? "s" : ""}.`
				: "Collection supprimée avec succès";

		return {
			status: ActionStatus.SUCCESS,
			message,
		};
	} catch (e) {
		return handleActionError(e, "Erreur lors de la suppression de la collection");
	}
}
