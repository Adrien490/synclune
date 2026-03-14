"use server";

import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { logAudit } from "@/shared/lib/audit-log";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_SKU_CREATE_LIMIT } from "@/shared/lib/rate-limit-config";
import { detectMediaType } from "@/modules/media/utils/media-type-detection";
import { prisma } from "@/shared/lib/prisma";
import { updateTag } from "next/cache";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { createProductSkuSchema } from "../schemas/sku.schemas";
import { getSkuInvalidationTags } from "../utils/cache.utils";
import {
	parsePrimaryImageFromForm,
	parseGalleryMediaFromForm,
} from "../utils/parse-media-from-form";
import { BusinessError, handleActionError, safeFormGet } from "@/shared/lib/actions";
import { generateSkuCode } from "../services/sku-generation.service";

/**
 * Server Action pour creer une variante de produit (Product SKU)
 * Compatible avec useActionState de React 19
 */
export async function createProductSku(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		// 1. Auth first (before rate limit to avoid non-admin token consumption)
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		// 2. Rate limiting
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_SKU_CREATE_LIMIT);
		if ("error" in rateLimit) return rateLimit.error;

		// 3. Extraction des donnees du FormData
		// Parse images from JSON strings (sent as hidden inputs)
		const primaryImage = parsePrimaryImageFromForm(formData);
		const galleryMedia = parseGalleryMediaFromForm(formData);

		const rawData = {
			productId: safeFormGet(formData, "productId"),
			sku: safeFormGet(formData, "sku") ?? "",
			priceInclTaxEuros: Number(formData.get("priceInclTaxEuros")) || 0,
			compareAtPriceEuros: formData.get("compareAtPriceEuros")
				? Number(formData.get("compareAtPriceEuros"))
				: undefined,
			inventory: Number(formData.get("inventory")) || 0,
			isActive: formData.get("isActive") === "true",
			isDefault: formData.get("isDefault") === "true",
			colorId: safeFormGet(formData, "colorId") ?? "",
			materialId: safeFormGet(formData, "materialId") ?? "",
			size: safeFormGet(formData, "size") ?? "",
			primaryImage: primaryImage,
			galleryMedia: galleryMedia,
		};

		// 4. Validation avec Zod
		const result = createProductSkuSchema.safeParse(rawData);
		if (!result.success) {
			const firstError = result.error.issues[0];
			const errorPath = firstError?.path.join(".");
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: firstError ? `${errorPath}: ${firstError.message}` : "Données invalides.",
			};
		}

		const validatedData = result.data;

		// 5. Normalize empty strings to null for optional foreign keys
		const normalizedColorId = validatedData.colorId?.trim() ?? null;
		const normalizedMaterialId = validatedData.materialId?.trim() ?? null;
		const normalizedSize = validatedData.size?.trim() ?? null;

		// 6. Convert priceInclTaxEuros to cents for database
		const priceInclTaxCents = Math.round(validatedData.priceInclTaxEuros * 100);
		const compareAtPriceCents = validatedData.compareAtPriceEuros
			? Math.round(validatedData.compareAtPriceEuros * 100)
			: null;

		// 7. Combine primary media and gallery media
		const allMedia: Array<{
			url: string;
			thumbnailUrl?: string | null;
			blurDataUrl?: string | null;
			altText?: string | null;
			mediaType?: "IMAGE" | "VIDEO";
			isPrimary: boolean;
			position: number;
		}> = [];
		if (validatedData.primaryImage) {
			allMedia.push({
				...validatedData.primaryImage,
				mediaType: "IMAGE", // Force IMAGE type for primary media (validated by Zod schema)
				isPrimary: true,
				position: 0,
			});
		}
		allMedia.push(
			...validatedData.galleryMedia.map((media, index) => ({
				...media,
				isPrimary: false,
				position: index + 1,
			})),
		);

		// 8. Create product SKU in transaction
		const productSku = await prisma.$transaction(async (tx) => {
			// Validate product exists
			const product = await tx.product.findUnique({
				where: { id: validatedData.productId },
				select: { id: true, title: true },
			});
			if (!product) {
				throw new BusinessError("Le produit spécifié n'existe pas.");
			}

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
					select: { id: true, name: true },
				});
				if (!material) {
					throw new BusinessError("Le matériau spécifié n'existe pas.");
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
					normalizedColorId ? `couleur spécifiée` : null,
					normalizedSize ? `taille "${normalizedSize}"` : null,
					normalizedMaterialId ? `matériau spécifié` : null,
				]
					.filter(Boolean)
					.join(", ");

				throw new BusinessError(
					`Cette combinaison de variantes${variantDetails ? ` (${variantDetails})` : ""} existe déjà pour ce produit (Réf: ${existingCombination.sku}). Veuillez modifier au moins une variante.`,
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

			// Generate SKU code if not provided
			const skuValue = validatedData.sku?.trim() ?? generateSkuCode();

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

			// Create SKU media (images and videos)
			if (allMedia.length > 0) {
				await tx.skuMedia.createMany({
					data: allMedia.map((media) => ({
						skuId: createdSku.id,
						url: media.url,
						thumbnailUrl: media.thumbnailUrl ?? null,
						blurDataUrl: media.blurDataUrl ?? null,
						altText: media.altText ?? null,
						mediaType: media.mediaType ?? detectMediaType(media.url),
						isPrimary: media.isPrimary,
						position: media.position,
					})),
				});
			}

			return createdSku;
		});

		// 9. Build success message
		const variantDetails = [productSku.color?.name, productSku.material?.name, productSku.size]
			.filter(Boolean)
			.join(" - ");

		const successMessage = variantDetails
			? `Variante "${variantDetails}" créée avec succès pour "${productSku.product.title}".`
			: `Variante créée avec succès pour "${productSku.product.title}".`;

		// 10. Invalidate cache (immediate visibility for admin)
		const tags = getSkuInvalidationTags(
			productSku.sku,
			validatedData.productId,
			productSku.product.slug,
			productSku.id, // Invalide aussi le cache stock temps réel
		);
		tags.forEach((tag) => updateTag(tag));

		// 11. Audit log
		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "sku.create",
			targetType: "sku",
			targetId: productSku.id,
			metadata: { sku: productSku.sku, productTitle: productSku.product.title, priceInclTaxCents },
		});

		// 12. Success - Return ActionState format
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
		if (e instanceof Error && e.message.includes("Unique constraint")) {
			return {
				status: ActionStatus.ERROR,
				message: "Un SKU avec ce code existe déjà.",
			};
		}
		return handleActionError(e, "Une erreur est survenue lors de la création de la variante.");
	}
}
