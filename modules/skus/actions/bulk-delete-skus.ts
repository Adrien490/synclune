"use server";

import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { handleActionError, success, error } from "@/shared/lib/actions";
import { UTApi } from "uploadthing/server";
import { bulkDeleteSkusSchema } from "../schemas/sku.schemas";
import { collectBulkInvalidationTags, invalidateTags } from "../utils/cache.utils";

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

/**
 * Supprime des fichiers UploadThing de maniere securisee
 * Instancie UTApi par requete pour eviter le partage de tokens entre workers
 */
async function deleteUploadThingFiles(urls: string[]): Promise<void> {
	if (urls.length === 0) return;
	try {
		const utapi = new UTApi();
		const fileKeys = urls.map(extractFileKeyFromUrl);
		await utapi.deleteFiles(fileKeys);
	} catch {
		// Log l'erreur mais ne bloque pas la suppression
		// Les fichiers orphelins seront nettoyés par un cron job
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
		const allImageUrls = skusData.flatMap((sku) =>
			sku.images.map((img) => img.url)
		);
		await deleteUploadThingFiles(allImageUrls);

		// Supprimer toutes les variantes et synchroniser les prix
		const productIds = [...new Set(skusData.map((s) => s.productId))];
		await prisma.$transaction(async (tx) => {
			await tx.productSku.deleteMany({
				where: {
					id: {
						in: ids,
					},
				},
			});
		});

		// Invalider le cache (deduplique automatiquement les tags)
		const uniqueTags = collectBulkInvalidationTags(skusData);
		invalidateTags(uniqueTags);

		return {
			status: ActionStatus.SUCCESS,
			message: `${ids.length} variante(s) supprimée(s) avec succès`,
		};
	} catch (e) {
		return handleActionError(e, "Impossible de supprimer les variantes");
	}
}
