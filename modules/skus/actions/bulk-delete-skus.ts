"use server";

import { isAdmin } from "@/modules/auth/utils/guards";
import { prisma } from "@/shared/lib/prisma";
import { ActionStatus, type ActionState } from "@/shared/types/server-action";
import { updateTag } from "next/cache";
import { bulkDeleteSkusSchema } from "../schemas/sku.schemas";
import { getSkuInvalidationTags } from "../constants/cache";

export async function bulkDeleteSkus(
	prevState: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Vérification des droits admin
		const admin = await isAdmin();
		if (!admin) {
			return {
				status: ActionStatus.UNAUTHORIZED,
				message: "Accès non autorisé. Droits administrateur requis.",
			};
		}

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

		// Récupérer les infos des SKUs pour validation et invalidation du cache
		const skusData = await prisma.productSku.findMany({
			where: { id: { in: ids } },
			select: {
				id: true,
				sku: true,
				productId: true,
				isDefault: true,
				product: { select: { slug: true } },
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

		// Supprimer toutes les variantes
		await prisma.productSku.deleteMany({
			where: {
				id: {
					in: ids,
				},
			},
		});

		// Invalider le cache pour chaque SKU
		for (const skuData of skusData) {
			const tags = getSkuInvalidationTags(
				skuData.sku,
				skuData.productId,
				skuData.product.slug
			);
			tags.forEach(tag => updateTag(tag));
		}

		return {
			status: ActionStatus.SUCCESS,
			message: `${ids.length} variante(s) supprimee(s) avec succes`,
		};
	} catch (error) {
// console.error("[bulkDeleteSkus]", error);
		return {
			status: ActionStatus.ERROR,
			message: "Impossible de supprimer les variantes",
		};
	}
}
