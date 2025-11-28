"use server";

import { isAdmin } from "@/modules/auth/utils/guards";
import { prisma } from "@/shared/lib/prisma";
import { ActionStatus, type ActionState } from "@/shared/types/server-action";
import { updateTag } from "next/cache";
import { bulkDeactivateSkusSchema } from "../schemas/sku.schemas";
import { getSkuInvalidationTags } from "../constants/cache";

export async function bulkDeactivateSkus(
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

		const { ids } = bulkDeactivateSkusSchema.parse(rawData);

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
				message: "Impossible de desactiver une variante par defaut",
			};
		}

		// Desactiver toutes les variantes
		await prisma.productSku.updateMany({
			where: {
				id: {
					in: ids,
				},
			},
			data: {
				isActive: false,
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
			message: `${ids.length} variante(s) désactivée(s) avec succès`,
		};
	} catch (error) {
// console.error("[bulkDeactivateSkus]", error);
		return {
			status: ActionStatus.ERROR,
			message: "Impossible de désactiver les variantes",
		};
	}
}
