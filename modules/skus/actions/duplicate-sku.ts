"use server";

import { prisma } from "@/shared/lib/prisma";
import { requireAdmin } from "@/shared/lib/actions";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { revalidatePath } from "next/cache";

/**
 * Server Action ADMIN pour dupliquer un SKU (variante produit)
 *
 * Crée une copie du SKU avec:
 * - Un nouveau code SKU (original + -COPY ou -COPY-N)
 * - isDefault à false
 * - inventory à 0
 * - isActive à false (pour éviter activation accidentelle)
 */
export async function duplicateSku(skuId: string): Promise<ActionState> {
	try {
		// 1. Vérification admin
		const adminCheck = await requireAdmin();
		if ("error" in adminCheck) return adminCheck.error;

		// 2. Récupérer le SKU original avec ses médias
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

		// 3. Générer un nouveau code SKU unique
		let newSku = `${original.sku}-COPY`;
		let suffix = 1;

		while (true) {
			const existing = await prisma.productSku.findUnique({
				where: { sku: newSku },
			});

			if (!existing) break;

			suffix++;
			newSku = `${original.sku}-COPY-${suffix}`;

			if (suffix > 100) {
				return {
					status: ActionStatus.ERROR,
					message: "Impossible de générer un code SKU unique. Supprimez certaines copies.",
				};
			}
		}

		// 4. Créer la copie du SKU
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

		// 5. Revalider les pages concernées
		if (original.product?.slug) {
			revalidatePath(`/admin/catalogue/produits/${original.product.slug}/variantes`);
		}
		revalidatePath("/admin/catalogue/inventaire");

		return {
			status: ActionStatus.SUCCESS,
			message: `Variante dupliquée: ${duplicate.sku}`,
			data: { id: duplicate.id, sku: duplicate.sku },
		};
	} catch (error) {
		console.error("[DUPLICATE_SKU] Erreur:", error);
		return {
			status: ActionStatus.ERROR,
			message: error instanceof Error ? error.message : "Une erreur est survenue",
		};
	}
}
