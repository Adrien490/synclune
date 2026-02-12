"use server";

import { prisma } from "@/shared/lib/prisma";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_SKU_DUPLICATE_LIMIT } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { validateInput, handleActionError, success, error } from "@/shared/lib/actions";
import { generateUniqueTechnicalName } from "@/shared/services/unique-name-generator.service";
import { deleteProductSkuSchema } from "../schemas/sku.schemas";
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
		// 0. Rate limiting
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_SKU_DUPLICATE_LIMIT);
		if ("error" in rateLimit) return rateLimit.error;

		// 1. Vérification admin
		const adminCheck = await requireAdmin();
		if ("error" in adminCheck) return adminCheck.error;

		// 2. Validation du skuId avec Zod (CUID2)
		const validation = validateInput(deleteProductSkuSchema, {
			skuId: formData.get("skuId") as string,
		});
		if ("error" in validation) return validation.error;

		const { skuId } = validation.data;

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
					create: original.images.map((img, index) => ({
						url: img.url,
						altText: img.altText,
						isPrimary: img.isPrimary,
						position: img.position ?? index,
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
