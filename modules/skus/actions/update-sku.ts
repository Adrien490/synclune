"use server";

import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { detectMediaType } from "@/modules/media/utils/media-type-detection";
import { prisma } from "@/shared/lib/prisma";
import { updateTag } from "next/cache";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { updateProductSkuSchema } from "../schemas/sku.schemas";
import { getSkuInvalidationTags } from "../utils/cache.utils";
import { triggerStockNotificationsIfNeeded } from "@/modules/stock-notifications/services/trigger-stock-notifications.service";
import {
	parsePrimaryImageFromForm,
	parseGalleryMediaFromForm,
} from "../utils/parse-media-from-form";
import { BusinessError, validateInput, handleActionError, success, error } from "@/shared/lib/actions";

/**
 * Server Action pour mettre à jour une variante de produit (Product SKU)
 * Compatible avec useActionState de React 19
 */
export async function updateProductSku(
	_: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Vérification des droits admin
		const adminCheck = await requireAdmin();
		if ("error" in adminCheck) return adminCheck.error;

		// 2. Extraction des données du FormData
		// Parse images from JSON strings (sent as hidden inputs)
		const primaryImage = parsePrimaryImageFromForm(formData);
		const galleryMedia = parseGalleryMediaFromForm(formData);

		const rawData = {
			skuId: formData.get("skuId") as string,
			priceInclTaxEuros: Number(formData.get("priceInclTaxEuros")) || 0,
			compareAtPriceEuros: formData.get("compareAtPriceEuros")
				? Number(formData.get("compareAtPriceEuros"))
				: undefined,
			inventory: Number(formData.get("inventory")) || 0,
			isActive: formData.get("isActive") === "true",
			isDefault: formData.get("isDefault") === "true",
			colorId: (formData.get("colorId") as string) || "",
			materialId: (formData.get("materialId") as string) || "",
			size: (formData.get("size") as string) || "",
			primaryImage: primaryImage,
			galleryMedia: galleryMedia,
		};

		// 3. Validation avec Zod
		const result = updateProductSkuSchema.safeParse(rawData);
		if (!result.success) {
			const firstError = result.error.issues[0];
			const errorPath = firstError.path.join(".");
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: `${errorPath}: ${firstError.message}`,
			};
		}

		const validatedData = result.data;

		// 4. Normalize empty strings to null for optional foreign keys
		const normalizedColorId = validatedData.colorId?.trim() || null;
		const normalizedMaterialId = validatedData.materialId?.trim() || null;
		const normalizedSize = validatedData.size?.trim() || null;

		// 5. Convert priceInclTaxEuros to cents for database
		const priceInclTaxCents = Math.round(validatedData.priceInclTaxEuros * 100);
		const compareAtPriceCents = validatedData.compareAtPriceEuros
			? Math.round(validatedData.compareAtPriceEuros * 100)
			: null;

		// 6. Combine primary media and gallery media
		const allMedia: Array<{
			url: string;
			thumbnailUrl?: string | null;
			blurDataUrl?: string | null;
			altText?: string | null;
			mediaType?: "IMAGE" | "VIDEO";
			isPrimary: boolean;
		}> = [];
		if (validatedData.primaryImage) {
			// VALIDATION: Le media principal DOIT être une IMAGE (jamais une VIDEO)
			const primaryMediaType =
				validatedData.primaryImage.mediaType ||
				detectMediaType(validatedData.primaryImage.url);
			if (primaryMediaType === "VIDEO") {
				return {
					status: ActionStatus.VALIDATION_ERROR,
					message:
						"Le media principal ne peut pas être une vidéo. Veuillez sélectionner une image comme media principal.",
				};
			}
			allMedia.push({
				...validatedData.primaryImage,
				mediaType: "IMAGE", // Force IMAGE type for primary media
				isPrimary: true,
			});
		}
		if (validatedData.galleryMedia) {
			allMedia.push(
				...validatedData.galleryMedia.map((media) => ({
					...media,
					isPrimary: false,
				}))
			);
		}

		// 7. Update product SKU in transaction
		const { productSku, previousInventory } = await prisma.$transaction(async (tx) => {
			// Validate SKU exists and get product info
			const existingSku = await tx.productSku.findUnique({
				where: { id: validatedData.skuId },
				select: {
					id: true,
					sku: true,
					productId: true,
					inventory: true, // Pour déclencher les notifications si stock revient
					product: {
						select: {
							id: true,
							title: true,
							slug: true,
						},
					},
				},
			});

			if (!existingSku) {
				throw new BusinessError("Le SKU spécifié n'existe pas.");
			}

			const previousInventory = existingSku.inventory;

			// Validate color if provided
			if (normalizedColorId) {
				const color = await tx.color.findUnique({
					where: { id: normalizedColorId },
					select: { id: true },
				});
				if (!color) {
					throw new BusinessError("La couleur spécifiée n'existe pas.");
				}
			}

			// Validate material if provided
			if (normalizedMaterialId) {
				const material = await tx.material.findUnique({
					where: { id: normalizedMaterialId },
					select: { id: true },
				});
				if (!material) {
					throw new BusinessError("Le matériau spécifié n'existe pas.");
				}
			}

			// CONTRAINTE MÉTIER : Vérifier l'unicité de la combinaison (productId, colorId, size, materialId)
			// Exclure le SKU actuel de la vérification
			const existingCombination = await tx.productSku.findFirst({
				where: {
					productId: existingSku.productId,
					colorId: normalizedColorId,
					size: normalizedSize,
					materialId: normalizedMaterialId,
					NOT: { id: validatedData.skuId },
				},
				select: {
					id: true,
					sku: true,
				},
			});

			if (existingCombination) {
				const variantDetails = [
					normalizedColorId ? `couleur spécifiée` : null,
					normalizedSize ? `taille "${normalizedSize}"` : null,
					normalizedMaterialId ? `matériau spécifié` : null,
				]
					.filter(Boolean)
					.join(", ");

				throw new BusinessError(
					`Cette combinaison de variantes${variantDetails ? ` (${variantDetails})` : ""} existe déjà pour ce produit (Réf: ${existingCombination.sku}). Veuillez modifier au moins une variante.`
				);
			}

			// If isDefault is true, unset other default SKUs for this product
			if (validatedData.isDefault) {
				await tx.productSku.updateMany({
					where: {
						productId: existingSku.productId,
						isDefault: true,
						NOT: { id: validatedData.skuId },
					},
					data: {
						isDefault: false,
					},
				});
			}

			// Delete existing media
			await tx.skuMedia.deleteMany({
				where: { skuId: validatedData.skuId },
			});

			// Update SKU
			const updatedSku = await tx.productSku.update({
				where: { id: validatedData.skuId },
				data: {
					priceInclTax: priceInclTaxCents,
					compareAtPrice: compareAtPriceCents,
					inventory: validatedData.inventory,
					isActive: validatedData.isActive,
					isDefault: validatedData.isDefault,
					colorId: normalizedColorId,
					materialId: normalizedMaterialId,
					size: normalizedSize,
				},
				include: {
					product: {
						select: {
							title: true,
							slug: true,
						},
					},
					color: {
						select: {
							name: true,
						},
					},
					material: {
						select: {
							name: true,
						},
					},
				},
			});

			// Create new SKU media (images and videos)
			if (allMedia.length > 0) {
				for (const media of allMedia) {
					await tx.skuMedia.create({
						data: {
							skuId: updatedSku.id,
							url: media.url,
							thumbnailUrl: media.thumbnailUrl || null,
							blurDataUrl: media.blurDataUrl || null,
							altText: media.altText || null,
							mediaType: media.mediaType || detectMediaType(media.url),
							isPrimary: media.isPrimary,
						},
					});
				}
			}

			return { productSku: updatedSku, previousInventory };
		});

		// 8. Build success message
		const variantDetails = [
			productSku.color?.name,
			productSku.material?.name,
			productSku.size,
		]
			.filter(Boolean)
			.join(" - ");

		const successMessage = variantDetails
			? `Variante "${variantDetails}" mise à jour avec succès.`
			: `Variante mise à jour avec succès.`;

		// 9. Invalidate cache (immediate visibility for admin)
		const tags = getSkuInvalidationTags(
			productSku.sku,
			productSku.productId,
			productSku.product.slug,
			productSku.id // Invalide aussi le cache stock temps réel
		);
		tags.forEach((tag) => updateTag(tag));

		// 10. Déclencher les notifications si le stock est revenu (0 → >0)
		if (previousInventory === 0 && validatedData.inventory > 0) {
			// Fire and forget - ne pas bloquer la réponse
			triggerStockNotificationsIfNeeded(
				productSku.id,
				previousInventory,
				validatedData.inventory
			).catch((error) =>
				console.error("[updateProductSku] Stock notification trigger error:", error)
			);
		}

		// 11. Success - Return ActionState format
		return {
			status: ActionStatus.SUCCESS,
			message: successMessage,
			data: {
				id: productSku.id,
				sku: productSku.sku,
				productId: productSku.productId,
				productSlug: productSku.product.slug,
			},
		};
	} catch (e) {
		if (e instanceof Error && e.message.includes("Unique constraint")) {
			return {
				status: ActionStatus.ERROR,
				message: "Un SKU avec ce code existe déjà.",
			};
		}
		return handleActionError(e, "Une erreur est survenue lors de la mise à jour de la variante.");
	}
}
