"use server";

import { prisma } from "@/shared/lib/prisma";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { handleActionError } from "@/shared/lib/actions";
import { generateUniqueTechnicalName } from "@/shared/services/unique-name-generator.service";
import { getSkuInvalidationTags } from "../utils/cache.utils";
import { updateTag } from "next/cache";

/**
 * Server Action ADMIN pour dupliquer un SKU (variante produit)
 * Compatible avec useActionState de React 19
 *
 * Crée une copie du SKU avec:
 * - Un nouveau code SKU (original + -COPY ou -COPY-N)
 * - isDefault à false
 * - inventory à 0
 * - isActive à false (pour éviter activation accidentelle)
 */
export async function duplicateSku(
	_prevState: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Vérification admin
		const adminCheck = await requireAdmin();
		if ("error" in adminCheck) return adminCheck.error;

		// 2. Extraction du skuId depuis FormData
		const skuId = formData.get("skuId") as string;

		if (!skuId) {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: "ID de variante manquant",
			};
		}

		// 3. Récupérer le SKU original avec ses médias
		const original = await prisma.productSku.findUnique({
			where: { id: skuId },
			include: {
				images: true,
				product: {
					select: { slug: true },
				},
			},
		});

		if (!original) {
			return {
				status: ActionStatus.NOT_FOUND,
				message: "Variante non trouvée",
			};
		}

		// 4. Générer un nouveau code SKU unique via le service
		const skuResult = await generateUniqueTechnicalName(
			original.sku,
			async (sku) => {
				const existing = await prisma.productSku.findUnique({ where: { sku } });
				return existing !== null;
			}
		);

		if (!skuResult.success) {
			return {
				status: ActionStatus.ERROR,
				message: skuResult.error ?? "Impossible de générer un code SKU unique",
			};
		}

		const newSku = skuResult.name!;

		// 5. Créer la copie du SKU
		const duplicate = await prisma.productSku.create({
			data: {
				sku: newSku,
				productId: original.productId,
				colorId: original.colorId,
				materialId: original.materialId,
				size: original.size,
				priceInclTax: original.priceInclTax,
				compareAtPrice: original.compareAtPrice,
				inventory: 0, // Reset à 0
				isActive: false, // Désactivé par défaut
				isDefault: false, // Jamais par défaut
				// Dupliquer les images
				images: {
					create: original.images.map((img) => ({
						url: img.url,
						altText: img.altText,
						isPrimary: img.isPrimary,
						mediaType: img.mediaType,
						thumbnailUrl: img.thumbnailUrl,
					})),
				},
			},
		});

		// 6. Invalider le cache avec les tags appropriés
		const tags = getSkuInvalidationTags(
			duplicate.sku,
			original.productId,
			original.product?.slug,
			duplicate.id
		);
		tags.forEach((tag) => updateTag(tag));

		return {
			status: ActionStatus.SUCCESS,
			message: `Variante dupliquée: ${duplicate.sku}`,
			data: { id: duplicate.id, sku: duplicate.sku },
		};
	} catch (e) {
		return handleActionError(e, "Impossible de dupliquer la variante");
	}
}
