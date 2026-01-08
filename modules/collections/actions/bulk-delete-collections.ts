"use server";

import { updateTag, revalidatePath } from "next/cache";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { handleActionError } from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";

import { getCollectionInvalidationTags } from "../utils/cache.utils";
import { bulkDeleteCollectionsSchema } from "../schemas/collection.schemas";

export async function bulkDeleteCollections(
	_prevState: unknown,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Verification des droits admin
		const admin = await requireAdmin();
		if ("error" in admin) return admin.error;

		// 2. Extraire et parser les IDs du FormData
		let ids: unknown;
		try {
			const idsString = formData.get("ids") as string;
			ids = idsString ? JSON.parse(idsString) : [];
		} catch {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: "Format JSON invalide pour les IDs",
			};
		}

		// 3. Valider les donnees
		const validation = bulkDeleteCollectionsSchema.safeParse({ ids });

		if (!validation.success) {
			const firstError = validation.error.issues?.[0];
			return {
				status: ActionStatus.ERROR,
				message: firstError?.message || "Donnees invalides",
			};
		}

		const validatedData = validation.data;

		// Verifier les collections et leur utilisation
		const collectionsWithUsage = await prisma.collection.findMany({
			where: {
				id: {
					in: validatedData.ids,
				},
			},
			include: {
				_count: {
					select: {
						products: true,
					},
				},
			},
		});

		// Note: On peut supprimer les collections meme avec des produits
		// car la relation est onDelete: SetNull (les produits seront preserves)
		const totalProducts = collectionsWithUsage.reduce(
			(sum, col) => sum + col._count.products,
			0
		);

		// Supprimer les collections
		const result = await prisma.collection.deleteMany({
			where: {
				id: {
					in: validatedData.ids,
				},
			},
		});

		// Revalider les pages concernees et invalider le cache
		revalidatePath("/admin/catalogue/collections");
		revalidatePath("/collections");
		// Invalider le cache pour chaque collection supprimee
		for (const collection of collectionsWithUsage) {
			getCollectionInvalidationTags(collection.slug).forEach(tag => updateTag(tag));
		}

		// Message avec info sur les produits
		const message =
			totalProducts > 0
				? `${result.count} collection${result.count > 1 ? "s" : ""} supprimée${result.count > 1 ? "s" : ""} avec succès. ${totalProducts} produit${totalProducts > 1 ? "s ont" : " a"} été préservé${totalProducts > 1 ? "s" : ""}.`
				: `${result.count} collection${result.count > 1 ? "s" : ""} supprimée${result.count > 1 ? "s" : ""} avec succès`;

		return {
			status: ActionStatus.SUCCESS,
			message,
		};
	} catch (e) {
		return handleActionError(e, "Erreur lors de la suppression des collections");
	}
}
