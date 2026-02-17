"use server";

import { updateTag } from "next/cache";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_SKU_DELETE_LIMIT } from "@/shared/lib/rate-limit-config";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { handleActionError } from "@/shared/lib/actions";
import { deleteProductSkuSchema } from "../schemas/sku.schemas";
import { deleteUploadThingFilesFromUrls } from "@/modules/media/services/delete-uploadthing-files.service";
import { getSkuInvalidationTags } from "../utils/cache.utils";

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
		// 1. Auth first (before rate limit to avoid non-admin token consumption)
		const adminCheck = await requireAdmin();
		if ("error" in adminCheck) return adminCheck.error;

		// 2. Rate limiting
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_SKU_DELETE_LIMIT);
		if ("error" in rateLimit) return rateLimit.error;

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

		// 4. Verifier que le SKU existe et recuperer toutes les infos necessaires en UNE requete
		// Optimisation: Consolider les counts pour eviter les N+1 queries
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
						skus: {
							where: { isActive: true },
							select: { id: true },
						},
					},
				},
				// Counts des relations bloquantes
				_count: {
					select: {
						orderItems: true,
						cartItems: true,
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
		const orderItemsCount = existingSku._count.orderItems;

		if (orderItemsCount > 0) {
			return {
				status: ActionStatus.ERROR,
				message:
					`Cette variante ne peut pas être supprimée car elle est associée à ${orderItemsCount} article${orderItemsCount > 1 ? "s" : ""} de commande. ` +
					"Pour conserver l'historique des commandes, veuillez désactiver cette variante à la place.",
			};
		}

		// 6b. CRITIQUE : Verifier que le SKU n'est pas dans des paniers
		// Prisma a onDelete: Restrict sur CartItem.sku
		const cartItemsCount = existingSku._count.cartItems;

		if (cartItemsCount > 0) {
			return {
				status: ActionStatus.ERROR,
				message:
					`Cette variante ne peut pas être supprimée car elle est présente dans ${cartItemsCount} panier${cartItemsCount > 1 ? "s" : ""}. ` +
					"Veuillez désactiver cette variante à la place.",
			};
		}

		// 7. Pour les produits PUBLIC : verifier qu'il reste au moins 1 SKU actif apres suppression
		// activeSkusCount deja charge dans la requete initiale
		if (existingSku.product.status === "PUBLIC" && existingSku.isActive) {
			const activeSkusCount = existingSku.product.skus.length;

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

		// 10. Supprimer la variante AVANT les fichiers UploadThing
		// (si le DELETE echoue, les medias restent intacts)
		// Les entrees SkuMedia seront supprimees automatiquement grace a onDelete: Cascade dans le schema Prisma
		const imageUrls = existingSku.images.map((img) => img.url);
		await prisma.productSku.delete({
			where: { id: validatedSkuId },
		});

		// 11. Supprimer les fichiers UploadThing apres la suppression DB reussie
		await deleteUploadThingFilesFromUrls(imageUrls);

		// 12. Invalider les cache tags concernes
		const tags = getSkuInvalidationTags(
			existingSku.sku,
			existingSku.productId,
			existingSku.product.slug,
			validatedSkuId // Invalide aussi le cache stock temps réel
		);
		tags.forEach(tag => updateTag(tag));

		// 13. Success
		const successMessage = promotedSkuSku
			? `Variante ${existingSku.sku} supprimée avec succès. La variante ${promotedSkuSku} est maintenant la variante principale.`
			: `Variante ${existingSku.sku} supprimée avec succès.`;

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
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue lors de la suppression de la variante");
	}
}
