"use server";

import { requireAdmin } from "@/shared/lib/actions/auth";
import { prisma } from "@/shared/lib/prisma";
import { ActionStatus, type ActionState } from "@/shared/types/server-action";
import { bulkDeactivateSkusSchema } from "../schemas/sku.schemas";
import { collectBulkInvalidationTags, invalidateTags } from "../constants/cache";

export async function bulkDeactivateSkus(
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

		// Desactiver toutes les variantes et synchroniser les prix
		await prisma.$transaction(async (tx) => {
			await tx.productSku.updateMany({
				where: {
					id: {
						in: ids,
					},
				},
				data: {
					isActive: false,
				},
			});
		});

		// Invalider le cache (deduplique automatiquement les tags)
		const uniqueTags = collectBulkInvalidationTags(skusData);
		invalidateTags(uniqueTags);

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
