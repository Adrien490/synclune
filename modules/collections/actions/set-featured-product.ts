"use server";

import { updateTag } from "next/cache";
import { isAdmin } from "@/modules/auth/utils/guards";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { getCollectionInvalidationTags } from "../constants/cache";

/**
 * Server Action pour definir un produit comme "vedette" dans une collection
 * Un seul produit peut etre featured par collection
 */
export async function setFeaturedProduct(
	collectionId: string,
	productId: string
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

		// 2. Verifier que l'association ProductCollection existe
		const productCollection = await prisma.productCollection.findUnique({
			where: {
				productId_collectionId: {
					productId,
					collectionId,
				},
			},
			include: {
				collection: {
					select: { slug: true, name: true },
				},
				product: {
					select: { title: true },
				},
			},
		});

		if (!productCollection) {
			return {
				status: ActionStatus.NOT_FOUND,
				message: "Ce produit n'appartient pas a cette collection.",
			};
		}

		// 3. Transaction: retirer l'ancien featured et definir le nouveau
		await prisma.$transaction([
			// Retirer le featured actuel de la collection
			prisma.productCollection.updateMany({
				where: {
					collectionId,
					isFeatured: true,
				},
				data: {
					isFeatured: false,
				},
			}),
			// Definir le nouveau produit featured
			prisma.productCollection.update({
				where: {
					productId_collectionId: {
						productId,
						collectionId,
					},
				},
				data: {
					isFeatured: true,
				},
			}),
		]);

		// 4. Invalider le cache de la collection
		const collectionTags = getCollectionInvalidationTags(
			productCollection.collection.slug
		);
		collectionTags.forEach((tag) => updateTag(tag));

		return {
			status: ActionStatus.SUCCESS,
			message: `"${productCollection.product.title}" est maintenant le produit vedette de "${productCollection.collection.name}".`,
		};
	} catch (e) {
		return {
			status: ActionStatus.ERROR,
			message:
				e instanceof Error
					? e.message
					: "Une erreur est survenue lors de la mise a jour du produit vedette.",
		};
	}
}

/**
 * Server Action pour retirer le statut "vedette" d'un produit dans une collection
 */
export async function removeFeaturedProduct(
	collectionId: string,
	productId: string
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

		// 2. Verifier que l'association ProductCollection existe
		const productCollection = await prisma.productCollection.findUnique({
			where: {
				productId_collectionId: {
					productId,
					collectionId,
				},
			},
			include: {
				collection: {
					select: { slug: true, name: true },
				},
				product: {
					select: { title: true },
				},
			},
		});

		if (!productCollection) {
			return {
				status: ActionStatus.NOT_FOUND,
				message: "Ce produit n'appartient pas a cette collection.",
			};
		}

		// 3. Retirer le statut featured
		await prisma.productCollection.update({
			where: {
				productId_collectionId: {
					productId,
					collectionId,
				},
			},
			data: {
				isFeatured: false,
			},
		});

		// 4. Invalider le cache de la collection
		const collectionTags = getCollectionInvalidationTags(
			productCollection.collection.slug
		);
		collectionTags.forEach((tag) => updateTag(tag));

		return {
			status: ActionStatus.SUCCESS,
			message: `"${productCollection.product.title}" n'est plus le produit vedette de "${productCollection.collection.name}".`,
		};
	} catch (e) {
		return {
			status: ActionStatus.ERROR,
			message:
				e instanceof Error
					? e.message
					: "Une erreur est survenue lors de la mise a jour du produit vedette.",
		};
	}
}
