"use server";

import { updateTags } from "@/shared/lib/cache";
import { isAdmin } from "@/shared/lib/guards";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { deleteProductSkuSchema } from "../schemas/product-sku.schemas";
import { UTApi } from "uploadthing/server";
import { getSkuInvalidationTags } from "../constants/cache";

const utapi = new UTApi();

/**
 * Extrait la cle du fichier depuis une URL UploadThing
 * @param url - URL complete du fichier (ex: https://utfs.io/f/abc123.png)
 * @returns La cle du fichier (ex: abc123.png)
 */
function extractFileKeyFromUrl(url: string): string {
	try {
		// Format UploadThing: https://utfs.io/f/{fileKey}
		// ou https://uploadthing-prod.s3.us-west-2.amazonaws.com/{fileKey}
		const urlObj = new URL(url);
		const parts = urlObj.pathname.split("/");
		// La cle est le dernier segment du path
		return parts[parts.length - 1];
	} catch {
		// Si l'URL est invalide, on retourne l'URL telle quelle
		// UTApi peut gerer les URLs completes
		return url;
	}
}

/**
 * Server Action pour supprimer une variante de produit
 * Supprime egalement toutes les images associees :
 * - Fichiers UploadThing (via UTApi)
 * - Entrees base de donnees SkuMedia (cascade Prisma)
 * Compatible avec useActionState de React 19
 */
export async function deleteProductSku(
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
		const rawData = {
			skuId: formData.get("skuId") as string,
		};

		// 3. Validation avec Zod
		const result = deleteProductSkuSchema.safeParse(rawData);

		if (!result.success) {
			const firstError = result.error.issues[0];
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: firstError.message,
			};
		}

		const { skuId: validatedSkuId } = result.data;

		// 4. Verifier que le SKU existe et recuperer les infos pour invalidation + images
		const existingSku = await prisma.productSku.findUnique({
			where: { id: validatedSkuId },
			select: {
				id: true,
				sku: true,
				isDefault: true,
				isActive: true,
				productId: true,
				images: {
					select: {
						url: true,
					},
				},
				product: {
					select: {
						title: true,
						slug: true,
						status: true,
						_count: {
							select: {
								skus: true,
							},
						},
					},
				},
			},
		});

		if (!existingSku) {
			return {
				status: ActionStatus.NOT_FOUND,
				message: "La variante de produit n'existe pas.",
			};
		}

		// 5. Verifier qu'il y a au moins 2 SKUs pour le produit
		if (existingSku.product._count.skus <= 1) {
			return {
				status: ActionStatus.ERROR,
				message:
					"Impossible de supprimer la derniere variante d'un produit. Un produit doit avoir au moins une variante.",
			};
		}

		// 6. CRITIQUE : Verifier que le SKU n'est pas associe a des commandes
		// Prisma a onDelete: Restrict sur OrderItem.sku, mais on affiche un message explicite
		const orderItemsCount = await prisma.orderItem.count({
			where: { skuId: validatedSkuId },
		});

		if (orderItemsCount > 0) {
			return {
				status: ActionStatus.ERROR,
				message:
					`Cette variante ne peut pas etre supprimee car elle est associee a ${orderItemsCount} article${orderItemsCount > 1 ? "s" : ""} de commande. ` +
					"Pour conserver l'historique des commandes, veuillez desactiver cette variante a la place.",
			};
		}

		// 6b. CRITIQUE : Verifier que le SKU n'est pas dans des wishlists
		// Prisma a onDelete: Restrict sur WishlistItem.sku
		const wishlistItemsCount = await prisma.wishlistItem.count({
			where: { skuId: validatedSkuId },
		});

		if (wishlistItemsCount > 0) {
			return {
				status: ActionStatus.ERROR,
				message:
					`Cette variante ne peut pas etre supprimee car elle est presente dans ${wishlistItemsCount} wishlist${wishlistItemsCount > 1 ? "s" : ""}. ` +
					"Pour eviter de frustrer vos clients, veuillez desactiver cette variante a la place.",
			};
		}

		// 6c. CRITIQUE : Verifier que le SKU n'est pas dans des paniers
		// Prisma a onDelete: Restrict sur CartItem.sku
		const cartItemsCount = await prisma.cartItem.count({
			where: { skuId: validatedSkuId },
		});

		if (cartItemsCount > 0) {
			return {
				status: ActionStatus.ERROR,
				message:
					`Cette variante ne peut pas etre supprimee car elle est presente dans ${cartItemsCount} panier${cartItemsCount > 1 ? "s" : ""}. ` +
					"Veuillez desactiver cette variante a la place.",
			};
		}

		// 7. Pour les produits PUBLIC : verifier qu'il reste au moins 1 SKU actif apres suppression
		if (existingSku.product.status === "PUBLIC" && existingSku.isActive) {
			const activeSkusCount = await prisma.productSku.count({
				where: {
					productId: existingSku.productId,
					isActive: true,
				},
			});

			if (activeSkusCount <= 1) {
				return {
					status: ActionStatus.ERROR,
					message:
						"Impossible de supprimer la derniere variante active d'un produit PUBLIC. Veuillez creer une autre variante active ou mettre le produit en DRAFT.",
				};
			}
		}

		// 9. Si le SKU a supprimer est le defaut, promouvoir un autre SKU automatiquement
		// (sauf s'il est le dernier SKU, car deja verifie precedemment)
		let promotedSkuSku: string | null = null;
		if (existingSku.isDefault && existingSku.product._count.skus > 1) {
			// Trouver un autre SKU actif a promouvoir
			const candidateSku = await prisma.productSku.findFirst({
				where: {
					productId: existingSku.productId,
					id: { not: validatedSkuId },
					isActive: true,
				},
				orderBy: [
					{ createdAt: "asc" }, // Le plus ancien SKU actif
				],
				select: { id: true, sku: true },
			});

			// Si aucun SKU actif trouve, prendre n'importe quel SKU
			const fallbackSku =
				candidateSku ||
				(await prisma.productSku.findFirst({
					where: {
						productId: existingSku.productId,
						id: { not: validatedSkuId },
					},
					orderBy: [{ createdAt: "asc" }],
					select: { id: true, sku: true },
				}));

			if (fallbackSku) {
				await prisma.productSku.update({
					where: { id: fallbackSku.id },
					data: { isDefault: true },
				});
				promotedSkuSku = fallbackSku.sku;
			}
		}

		// 10. Supprimer les fichiers UploadThing AVANT la suppression du SKU
		// (pour eviter les medias orphelins en cas d'echec de la transaction DB)
		if (existingSku.images.length > 0) {
			try {
				const fileKeys = existingSku.images.map((img) => extractFileKeyFromUrl(img.url));
				await utapi.deleteFiles(fileKeys);
// console.log(`[DELETE_SKU] ${fileKeys.length} fichier(s) UploadThing supprime(s) pour SKU ${existingSku.sku}`);
			} catch (uploadthingError) {
				// Log l'erreur mais ne bloque pas la suppression du SKU
				// Les fichiers orphelins seront nettoyes par un cron job ulterieur
// console.error(`[DELETE_SKU] Erreur suppression fichiers UploadThing pour SKU ${existingSku.sku}:`, uploadthingError);
			}
		}

		// 11. Supprimer la variante dans une transaction
		await prisma.$transaction(async (tx) => {
			// Les entrees SkuMedia seront supprimees automatiquement grace a onDelete: Cascade dans le schema Prisma
			await tx.productSku.delete({
				where: { id: validatedSkuId },
			});
		});

		// 12. Invalider les cache tags concernes
		const tags = getSkuInvalidationTags(
			existingSku.sku,
			existingSku.productId,
			existingSku.product.slug
		);
		updateTags(tags);

		// 13. Success
		const successMessage = promotedSkuSku
			? `Variante ${existingSku.sku} supprimee avec succes. La variante ${promotedSkuSku} est maintenant la variante principale.`
			: `Variante ${existingSku.sku} supprimee avec succes.`;

		return {
			status: ActionStatus.SUCCESS,
			message: successMessage,
			data: {
				skuId: validatedSkuId,
				sku: existingSku.sku,
				productTitle: existingSku.product.title,
				promotedSku: promotedSkuSku,
			},
		};
	} catch (error) {
		return {
			status: ActionStatus.ERROR,
			message:
				error instanceof Error
					? error.message
					: "Une erreur est survenue lors de la suppression de la variante.",
		};
	}
}
