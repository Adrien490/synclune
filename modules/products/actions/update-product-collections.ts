"use server";

import { prisma } from "@/shared/lib/prisma";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { revalidatePath, updateTag } from "next/cache";
import { getCollectionInvalidationTags } from "@/modules/collections/utils/cache.utils";

/**
 * Server Action ADMIN pour mettre à jour les collections d'un produit
 *
 * @param productId - ID du produit
 * @param collectionIds - Liste des IDs de collections (remplace les existantes)
 */
export async function updateProductCollections(
	productId: string,
	collectionIds: string[]
): Promise<ActionState> {
	try {
		// 1. Vérification admin
		const adminCheck = await requireAdmin();
		if ("error" in adminCheck) return adminCheck.error;

		// 2. Vérifier que le produit existe
		const product = await prisma.product.findUnique({
			where: { id: productId },
			select: { id: true, title: true, slug: true },
		});

		if (!product) {
			return {
				status: ActionStatus.NOT_FOUND,
				message: "Produit non trouvé",
			};
		}

		// 3. Vérifier que toutes les collections existent
		if (collectionIds.length > 0) {
			const existingCollections = await prisma.collection.findMany({
				where: { id: { in: collectionIds } },
				select: { id: true },
			});

			if (existingCollections.length !== collectionIds.length) {
				return {
					status: ActionStatus.NOT_FOUND,
					message: "Une ou plusieurs collections n'existent pas",
				};
			}
		}

		// 4. Recuperer les collections ou ce produit etait featured (pour invalidation cache)
		const featuredInCollections = await prisma.productCollection.findMany({
			where: {
				productId,
				isFeatured: true,
			},
			select: {
				collection: {
					select: { slug: true },
				},
			},
		});

		// 5. Mettre à jour les collections (transaction)
		await prisma.$transaction([
			// Supprimer les associations existantes
			prisma.productCollection.deleteMany({
				where: { productId },
			}),
			// Créer les nouvelles associations
			...(collectionIds.length > 0
				? [
						prisma.productCollection.createMany({
							data: collectionIds.map((collectionId) => ({
								productId,
								collectionId,
							})),
						}),
				  ]
				: []),
		]);

		// 6. Invalider le cache des collections ou le produit etait featured
		for (const pc of featuredInCollections) {
			const tags = getCollectionInvalidationTags(pc.collection.slug);
			tags.forEach((tag) => updateTag(tag));
		}

		// 7. Revalider les pages
		revalidatePath("/admin/catalogue/produits");
		revalidatePath(`/admin/catalogue/produits/${product.slug}`);
		revalidatePath("/admin/catalogue/collections");

		return {
			status: ActionStatus.SUCCESS,
			message:
				collectionIds.length > 0
					? `${product.title} ajouté à ${collectionIds.length} collection(s)`
					: `${product.title} retiré de toutes les collections`,
		};
	} catch (error) {
		console.error("[UPDATE_PRODUCT_COLLECTIONS] Erreur:", error);
		return {
			status: ActionStatus.ERROR,
			message: "Impossible de mettre à jour les collections du produit",
		};
	}
}

/**
 * Récupère les collections d'un produit
 */
export async function getProductCollections(
	productId: string
): Promise<{ id: string; name: string }[]> {
	const productCollections = await prisma.productCollection.findMany({
		where: { productId },
		include: {
			collection: {
				select: { id: true, name: true },
			},
		},
	});

	return productCollections.map((pc) => ({
		id: pc.collection.id,
		name: pc.collection.name,
	}));
}

/**
 * Récupère toutes les collections disponibles
 */
export async function getAllCollections(): Promise<{ id: string; name: string }[]> {
	const collections = await prisma.collection.findMany({
		select: { id: true, name: true },
		orderBy: { name: "asc" },
	});

	return collections;
}
