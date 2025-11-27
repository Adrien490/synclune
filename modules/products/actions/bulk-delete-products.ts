"use server";

import { updateTags } from "@/shared/lib/cache";
import { getCollectionInvalidationTags } from "@/modules/collections/constants/cache";
import { isAdmin } from "@/shared/lib/guards";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { UTApi } from "uploadthing/server";
import { bulkDeleteProductsSchema } from "../schemas/product.schemas";
import { getProductInvalidationTags } from "../constants/cache";

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

/**
 * Server Action pour supprimer plusieurs produits
 * Supprime egalement :
 * - Tous les SKUs (cascade Prisma)
 * - Toutes les images des SKUs (fichiers UploadThing + entrees DB)
 * Compatible avec useActionState de React 19
 */
export async function bulkDeleteProducts(
	_: ActionState | undefined,
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

		// 2. Extraction des donnees du FormData
		const productIdsRaw = formData.get("productIds") as string;
		let productIds: string[] = [];

		try {
			productIds = JSON.parse(productIdsRaw);
		} catch {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: "Format de donnees invalide.",
			};
		}

		const rawData = {
			productIds,
		};

		// 3. Validation avec Zod
		const result = bulkDeleteProductsSchema.safeParse(rawData);

		if (!result.success) {
			const firstError = result.error.issues[0];
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: firstError.message,
			};
		}

		const { productIds: validatedProductIds } = result.data;

		// 4. Verifier que tous les produits existent et recuperer leurs infos
		const existingProducts = await prisma.product.findMany({
			where: {
				id: {
					in: validatedProductIds,
				},
			},
			select: {
				id: true,
				title: true,
				slug: true,
				collectionId: true,
				collection: {
					select: {
						slug: true,
					},
				},
				skus: {
					select: {
						id: true,
						sku: true,
						images: {
							select: {
								url: true,
							},
						},
					},
				},
			},
		});

		if (existingProducts.length !== validatedProductIds.length) {
			return {
				status: ActionStatus.NOT_FOUND,
				message: "Certains produits n'existent pas.",
			};
		}

		// 5. Verifier si les produits ont des commandes associees
		const orderItemsCount = await prisma.orderItem.count({
			where: {
				sku: {
					productId: {
						in: validatedProductIds,
					},
				},
			},
		});

		if (orderItemsCount > 0) {
			return {
				status: ActionStatus.ERROR,
				message:
					`Les produits selectionnes ne peuvent pas etre supprimes car ils sont associes a ${orderItemsCount} article${orderItemsCount > 1 ? "s" : ""} de commande. ` +
					"Pour conserver l'historique des commandes, veuillez archiver les produits a la place.",
			};
		}

		// 6. Supprimer tous les fichiers UploadThing de tous les produits
		const allImageUrls = existingProducts.flatMap((product) =>
			product.skus.flatMap((sku) => sku.images.map((img) => img.url))
		);

		if (allImageUrls.length > 0) {
			try {
				const fileKeys = allImageUrls.map(extractFileKeyFromUrl);
				await utapi.deleteFiles(fileKeys);
			} catch (uploadthingError) {
				// Ignore - ne bloque pas la suppression des produits
			}
		}

		// 7. Supprimer les produits dans une transaction
		await prisma.$transaction(async (tx) => {
			// Les SKUs et entrees SkuMedia seront supprimes automatiquement grace a onDelete: Cascade
			await tx.product.deleteMany({
				where: {
					id: {
						in: validatedProductIds,
					},
				},
			});
		});

		// 8. Invalidate cache tags pour tous les produits supprimes
		for (const product of existingProducts) {
			const productTags = getProductInvalidationTags(product.slug, product.id);
			updateTags(productTags);

			// Si le produit appartenait a une collection, invalider aussi la collection
			if (product.collection) {
				const collectionTags = getCollectionInvalidationTags(
					product.collection.slug
				);
				updateTags(collectionTags);
			}
		}

		// 9. Success
		return {
			status: ActionStatus.SUCCESS,
			message: `${existingProducts.length} produit${existingProducts.length > 1 ? "s" : ""} supprime${existingProducts.length > 1 ? "s" : ""} avec succes.`,
			data: {
				deletedCount: existingProducts.length,
				productIds: validatedProductIds,
			},
		};
	} catch (error) {
		return {
			status: ActionStatus.ERROR,
			message:
				error instanceof Error
					? error.message
					: "Une erreur est survenue lors de la suppression des produits.",
		};
	}
}
