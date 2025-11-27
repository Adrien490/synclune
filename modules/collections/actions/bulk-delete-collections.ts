"use server";

import { updateTag } from "next/cache";
import { isAdmin } from "@/modules/auth/utils/guards";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { revalidatePath } from "next/cache";

import { getCollectionInvalidationTags } from "../constants/cache";
import { bulkDeleteCollectionsSchema } from "../schemas/collection.schemas";

export async function bulkDeleteCollections(
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

		// 2. Extraire les IDs du FormData
		const idsString = formData.get("ids");
		const ids = idsString ? JSON.parse(idsString as string) : [];

		// Valider les donnees
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
				? `${result.count} collection${result.count > 1 ? "s" : ""} supprimee${result.count > 1 ? "s" : ""} avec succes. ${totalProducts} produit${totalProducts > 1 ? "s ont" : " a"} ete preserve${totalProducts > 1 ? "s" : ""}.`
				: `${result.count} collection${result.count > 1 ? "s" : ""} supprimee${result.count > 1 ? "s" : ""} avec succes`;

		return {
			status: ActionStatus.SUCCESS,
			message,
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
			message: "Une erreur est survenue lors de la suppression des collections",
		};
	}
}
