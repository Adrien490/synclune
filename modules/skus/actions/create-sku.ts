"use server";

import { randomUUID } from "crypto";
import { requireAdmin } from "@/shared/lib/actions/auth";
import { detectMediaType } from "@/modules/media/utils/media-type-detection";
import { prisma } from "@/shared/lib/prisma";
import { updateTag } from "next/cache";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { createProductSkuSchema } from "../schemas/sku.schemas";
import { getSkuInvalidationTags } from "../constants/cache";
import {
	parsePrimaryImageFromForm,
	parseGalleryMediaFromForm,
} from "../utils/parse-media-from-form";

/**
 * Server Action pour creer une variante de produit (Product SKU)
 * Compatible avec useActionState de React 19
 */
export async function createProductSku(
	_: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Verification des droits admin
		const adminCheck = await requireAdmin();
		if ("error" in adminCheck) return adminCheck.error;

		// 2. Extraction des donnees du FormData
		// Parse images from JSON strings (sent as hidden inputs)
		const primaryImage = parsePrimaryImageFromForm(formData);
		const galleryMedia = parseGalleryMediaFromForm(formData);

		const rawData = {
			productId: formData.get("productId") as string,
			sku: (formData.get("sku") as string) || "",
			priceInclTaxEuros: Number(formData.get("priceInclTaxEuros")) || 0,
			compareAtPriceEuros: formData.get("compareAtPriceEuros") ? Number(formData.get("compareAtPriceEuros")) : undefined,
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
		const result = createProductSkuSchema.safeParse(rawData);
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
			// VALIDATION: Le media principal DOIT etre une IMAGE (jamais une VIDEO)
			const primaryMediaType = validatedData.primaryImage.mediaType || detectMediaType(validatedData.primaryImage.url);
			if (primaryMediaType === "VIDEO") {
				return {
					status: ActionStatus.VALIDATION_ERROR,
					message: "Le média principal ne peut pas être une vidéo. Veuillez sélectionner une image comme média principal.",
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

		// 7. Create product SKU in transaction
		const productSku = await prisma.$transaction(async (tx) => {
			// Validate product exists
			const product = await tx.product.findUnique({
				where: { id: validatedData.productId },
				select: { id: true, title: true },
			});
			if (!product) {
				throw new Error("Le produit specifie n'existe pas.");
			}

			// Validate color if provided
			if (normalizedColorId) {
				const color = await tx.color.findUnique({
					where: { id: normalizedColorId },
					select: { id: true },
				});
				if (!color) {
					throw new Error("La couleur specifiee n'existe pas.");
				}
			}

			// Validate material if provided
			if (normalizedMaterialId) {
				const material = await tx.material.findUnique({
					where: { id: normalizedMaterialId },
					select: { id: true, name: true },
				});
				if (!material) {
					throw new Error("Le materiau specifie n'existe pas.");
				}
			}

			// CONTRAINTE METIER : Verifier l'unicite de la combinaison (productId, colorId, size, materialId)
			// Empeche la creation de SKUs dupliques avec les memes variantes
			const existingCombination = await tx.productSku.findFirst({
				where: {
					productId: validatedData.productId,
					colorId: normalizedColorId,
					size: normalizedSize,
					materialId: normalizedMaterialId,
				},
				select: {
					id: true,
					sku: true,
				},
			});

			if (existingCombination) {
				const variantDetails = [
					normalizedColorId ? `couleur specifiee` : null,
					normalizedSize ? `taille "${normalizedSize}"` : null,
					normalizedMaterialId ? `materiau specifie` : null,
				]
					.filter(Boolean)
					.join(", ");

				throw new Error(
					`Cette combinaison de variantes${variantDetails ? ` (${variantDetails})` : ""} existe deja pour ce produit (Réf: ${existingCombination.sku}). Veuillez modifier au moins une variante.`
				);
			}

			// If isDefault is true, unset other default SKUs for this product
			if (validatedData.isDefault) {
				await tx.productSku.updateMany({
					where: {
						productId: validatedData.productId,
						isDefault: true,
					},
					data: {
						isDefault: false,
					},
				});
			}

			// Generate SKU with cryptographically secure random ID
			const skuValue =
				validatedData.sku?.trim() ||
				`SKU-${randomUUID().split("-")[0].toUpperCase()}`;

			// Create SKU
			const createdSku = await tx.productSku.create({
				data: {
					productId: validatedData.productId,
					sku: skuValue,
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

			// Create SKU media (images and videos)
			if (allMedia.length > 0) {
				for (const media of allMedia) {
					await tx.skuMedia.create({
						data: {
							skuId: createdSku.id,
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

			return createdSku;
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
			? `Variante "${variantDetails}" créée avec succès pour "${productSku.product.title}".`
			: `Variante créée avec succès pour "${productSku.product.title}".`;

		// 9. Invalidate cache (immediate visibility for admin)
		const product = await prisma.product.findUnique({
			where: { id: validatedData.productId },
			select: { slug: true },
		});
		if (product) {
			const tags = getSkuInvalidationTags(
				productSku.sku,
				validatedData.productId,
				product.slug,
				productSku.id // Invalide aussi le cache stock temps réel
			);
			tags.forEach(tag => updateTag(tag));
		}

		// 10. Success - Return ActionState format
		return {
			status: ActionStatus.SUCCESS,
			message: successMessage,
			data: {
				id: productSku.id,
				sku: productSku.sku,
				productId: productSku.productId,
			},
		};
	} catch (e) {
		// Error handling
		if (e instanceof Error && e.message.includes("Unique constraint")) {
			return {
				status: ActionStatus.ERROR,
				message: "Un SKU avec ce code existe deja.",
			};
		}

		return {
			status: ActionStatus.ERROR,
			message:
				e instanceof Error
					? e.message
					: "Une erreur est survenue lors de la creation de la variante. Veuillez reessayer.",
		};
	}
}
