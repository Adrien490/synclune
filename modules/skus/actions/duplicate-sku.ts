"use server";

import { prisma } from "@/shared/lib/prisma";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_SKU_DUPLICATE_LIMIT } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { BusinessError, validateInput, handleActionError, safeFormGet } from "@/shared/lib/actions";
import { generateUniqueTechnicalName } from "@/shared/services/unique-name-generator.service";
import { duplicateProductSkuSchema } from "../schemas/sku.schemas";
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
	formData: FormData,
): Promise<ActionState> {
	try {
		// 1. Auth first (before rate limit to avoid non-admin token consumption)
		const auth = await requireAdmin();
		if ("error" in auth) return auth.error;
		// 2. Rate limiting
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_SKU_DUPLICATE_LIMIT);
		if ("error" in rateLimit) return rateLimit.error;

		// 2. Validation du skuId avec Zod (CUID2)
		const validation = validateInput(duplicateProductSkuSchema, {
			skuId: safeFormGet(formData, "skuId"),
		});
		if ("error" in validation) return validation.error;

		const { skuId } = validation.data;

		// 3-5. Transaction atomique : lecture + génération nom + création
		const { original, duplicate } = await prisma.$transaction(async (tx) => {
			// 3. Récupérer le SKU original avec ses médias + M2M colors/materials
			const original = await tx.productSku.findUnique({
				// `deletedAt: null` — un SKU soft-deleted appartient à un produit lui-même
				// supprimé (seul writer : `delete-product`), sans chemin de restauration. Aucune
				// surface admin ne l'expose : le muter est toujours une anomalie. Sans ce filtre,
				// on pouvait ajuster le stock ou poser `isDefault` sur la variante d'un produit
				// archivé — et l'index unique partiel de `isDefault` (WHERE deletedAt IS NULL) ne
				// s'y oppose pas.
				where: { id: skuId, deletedAt: null },
				select: {
					sku: true,
					productId: true,
					size: true,
					priceInclTax: true,
					compareAtPrice: true,
					colors: {
						select: { colorId: true, position: true },
						orderBy: { position: "asc" },
					},
					materials: {
						select: { materialId: true, position: true },
						orderBy: { position: "asc" },
					},
					images: {
						select: {
							url: true,
							altText: true,
							isPrimary: true,
							position: true,
							mediaType: true,
							thumbnailUrl: true,
							blurDataUrl: true,
							width: true,
							height: true,
						},
					},
					product: {
						select: { slug: true },
					},
				},
			});

			if (!original) {
				throw new BusinessError("Variante non trouvée");
			}

			// 4. Générer un nouveau code SKU unique via le service
			const skuResult = await generateUniqueTechnicalName(original.sku, async (sku) => {
				const existing = await tx.productSku.findUnique({ where: { sku } });
				return existing !== null;
			});

			if (!skuResult.success) {
				throw new BusinessError(
					skuResult.error ?? "Impossible de générer un code unique pour la variante",
				);
			}

			const newSku = skuResult.name!;

			// 5. Créer la copie du SKU (couleurs + matériaux M2M dupliqués)
			const duplicate = await tx.productSku.create({
				data: {
					sku: newSku,
					productId: original.productId,
					size: original.size,
					priceInclTax: original.priceInclTax,
					compareAtPrice: original.compareAtPrice,
					inventory: 0, // Reset à 0
					isActive: false, // Désactivé par défaut
					isDefault: false, // Jamais par défaut
					colors: {
						create: original.colors.map((c) => ({
							colorId: c.colorId,
							position: c.position,
						})),
					},
					materials: {
						create: original.materials.map((m) => ({
							materialId: m.materialId,
							position: m.position,
						})),
					},
					// Dupliquer les images
					images: {
						create: original.images.map((img) => ({
							url: img.url,
							altText: img.altText,
							isPrimary: img.isPrimary,
							position: img.position,
							mediaType: img.mediaType,
							thumbnailUrl: img.thumbnailUrl,
							blurDataUrl: img.blurDataUrl,
							width: img.width,
							height: img.height,
						})),
					},
				},
			});

			return { original, duplicate };
		});

		// 6. Invalider le cache avec les tags appropriés
		const tags = getSkuInvalidationTags(
			duplicate.sku,
			original.productId,
			original.product.slug,
			duplicate.id,
		);
		tags.forEach((tag) => updateTag(tag));

		// 7. Audit log

		return {
			status: ActionStatus.SUCCESS,
			message: `Variante dupliquée: ${duplicate.sku}`,
			data: {
				id: duplicate.id,
				sku: duplicate.sku,
				productId: original.productId,
				productSlug: original.product.slug,
			},
		};
	} catch (e) {
		return handleActionError(e, "Impossible de dupliquer la variante");
	}
}
