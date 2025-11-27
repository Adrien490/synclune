"use server";

import { isAdmin } from "@/shared/lib/guards";
import { prisma } from "@/shared/lib/prisma";
import { ActionStatus, type ActionState } from "@/shared/types/server-action";
import { updateTag } from "next/cache";
import { bulkActivateSkusSchema } from "../schemas/sku.schemas";
import { getSkuInvalidationTags } from "../constants/cache";

export async function bulkActivateSkus(
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

		const { ids } = bulkActivateSkusSchema.parse(rawData);

		if (ids.length === 0) {
			return {
				status: ActionStatus.ERROR,
				message: "Aucune variante selectionnee",
			};
		}

		// Récupérer les infos des SKUs pour l'invalidation du cache
		const skusData = await prisma.productSku.findMany({
			where: { id: { in: ids } },
			select: {
				sku: true,
				productId: true,
				product: { select: { slug: true } },
			},
		});

		// Activer toutes les variantes
		await prisma.productSku.updateMany({
			where: {
				id: {
					in: ids,
				},
			},
			data: {
				isActive: true,
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
			message: `${ids.length} variante(s) activee(s) avec succes`,
		};
	} catch (error) {
// console.error("[bulkActivateSkus]", error);
		return {
			status: ActionStatus.ERROR,
			message: "Impossible d'activer les variantes",
		};
	}
}
