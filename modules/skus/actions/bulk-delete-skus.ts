"use server";

import { requireAdmin } from "@/shared/lib/actions/auth";
import { prisma } from "@/shared/lib/prisma";
import { ActionStatus, type ActionState } from "@/shared/types/server-action";
import { UTApi } from "uploadthing/server";
import { bulkDeleteSkusSchema } from "../schemas/sku.schemas";
import { collectBulkInvalidationTags, invalidateTags } from "../constants/cache";

const utapi = new UTApi();

/**
 * Extrait la clé du fichier depuis une URL UploadThing
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

export async function bulkDeleteSkus(
	prevState: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Vérification des droits admin
		const adminCheck = await requireAdmin();
		if ("error" in adminCheck) return adminCheck.error;

		const rawData = {
			ids: formData.get("ids") as string,
		};

		const { ids } = bulkDeleteSkusSchema.parse(rawData);

		if (ids.length === 0) {
			return {
				status: ActionStatus.ERROR,
				message: "Aucune variante selectionnee",
			};
		}

		// Récupérer les infos des SKUs pour validation, suppression fichiers et invalidation du cache
		const skusData = await prisma.productSku.findMany({
			where: { id: { in: ids } },
			select: {
				id: true,
				sku: true,
				productId: true,
				isDefault: true,
				product: { select: { slug: true } },
				images: { select: { url: true } },
			},
		});

		// Verifier qu'aucune variante par defaut n'est selectionnee
		const defaultSkus = skusData.filter((s) => s.isDefault);
		if (defaultSkus.length > 0) {
			return {
				status: ActionStatus.ERROR,
				message: "Impossible de supprimer une variante par defaut",
			};
		}

		// CRITIQUE : Verifier que les SKUs ne sont pas dans des commandes
		const orderItemsCount = await prisma.orderItem.count({
			where: { skuId: { in: ids } },
		});

		if (orderItemsCount > 0) {
			return {
				status: ActionStatus.ERROR,
				message:
					`Impossible de supprimer ces variantes car ${orderItemsCount} sont liees a des commandes. ` +
					"Pour conserver l'historique, veuillez desactiver ces variantes a la place.",
			};
		}

		// CRITIQUE : Verifier que les SKUs ne sont pas dans des wishlists
		const wishlistItemsCount = await prisma.wishlistItem.count({
			where: { skuId: { in: ids } },
		});

		if (wishlistItemsCount > 0) {
			return {
				status: ActionStatus.ERROR,
				message:
					`Impossible de supprimer ces variantes car ${wishlistItemsCount} sont presentes dans des wishlists. ` +
					"Veuillez desactiver ces variantes a la place.",
			};
		}

		// CRITIQUE : Verifier que les SKUs ne sont pas dans des paniers
		const cartItemsCount = await prisma.cartItem.count({
			where: { skuId: { in: ids } },
		});

		if (cartItemsCount > 0) {
			return {
				status: ActionStatus.ERROR,
				message:
					`Impossible de supprimer ces variantes car ${cartItemsCount} sont presentes dans des paniers. ` +
					"Veuillez desactiver ces variantes a la place.",
			};
		}

		// Supprimer les fichiers UploadThing AVANT la suppression DB
		// Collecter toutes les URLs d'images
		const allImageUrls = skusData.flatMap((sku) =>
			sku.images.map((img) => img.url)
		);

		if (allImageUrls.length > 0) {
			try {
				const fileKeys = allImageUrls.map(extractFileKeyFromUrl);
				await utapi.deleteFiles(fileKeys);
			} catch {
				// Log l'erreur mais ne bloque pas la suppression
				// Les fichiers orphelins seront nettoyés par un cron job
			}
		}

		// Supprimer toutes les variantes
		await prisma.productSku.deleteMany({
			where: {
				id: {
					in: ids,
				},
			},
		});

		// Invalider le cache (deduplique automatiquement les tags)
		const uniqueTags = collectBulkInvalidationTags(skusData);
		invalidateTags(uniqueTags);

		return {
			status: ActionStatus.SUCCESS,
			message: `${ids.length} variante(s) supprimée(s) avec succès`,
		};
	} catch (error) {
// console.error("[bulkDeleteSkus]", error);
		return {
			status: ActionStatus.ERROR,
			message: "Impossible de supprimer les variantes",
		};
	}
}
