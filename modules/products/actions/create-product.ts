"use server";

import { updateTag } from "next/cache";
import { getCollectionInvalidationTags } from "@/modules/collections/utils/cache.utils";
import { requireAdmin } from "@/modules/admin-auth/lib/require-admin";
import { detectMediaType } from "@/modules/media/utils/media-type-detection";
import { prisma } from "@/shared/lib/prisma";
import { sanitizeText } from "@/shared/lib/sanitize";
import type { ActionState } from "@/shared/types/server-action";
import { generateSlug } from "@/shared/utils/generate-slug";
import { createProductSchema } from "../schemas/product.schemas";
import { getProductInvalidationTags } from "../utils/cache.utils";
import {
	validateInput,
	success,
	error,
	handleActionError,
	safeFormGetJSON,
	BusinessError,
} from "@/shared/lib/actions";
import { deleteUnreferencedCatalogMedia } from "@/modules/media/services/delete-unreferenced-catalog-media.service";

/**
 * Server Action pour créer un produit — schéma lean (lot 2) :
 * produit { name, priceCents, active, media[] } + variante initiale
 * { colorId?, materialId?, size?, priceCents?, stock, active }.
 */
export async function createProduct(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		// 1. Vérification des droits admin
		const admin = await requireAdmin();
		if ("error" in admin) return admin.error;

		// 2. Extraction des données du FormData
		const media = safeFormGetJSON<unknown[]>(formData, "media") ?? [];

		const rawData = {
			name: formData.get("name"),
			description: formData.get("description"),
			priceEuros: formData.get("priceEuros"),
			// Champ absent ⇒ `.default(false)` du schéma : un appel sans champ
			// `active` ne publie PAS le bijou.
			active: formData.get("active") ?? undefined,
			typeId: formData.get("typeId") ?? "",
			collectionIds: safeFormGetJSON<string[]>(formData, "collectionIds") ?? [],
			media,
			initialVariant: {
				priceEuros: formData.get("initialVariant.priceEuros") ?? "",
				stock: formData.get("initialVariant.stock"),
				active: formData.get("initialVariant.active") ?? true,
				colorId: formData.get("initialVariant.colorId") ?? "",
				materialId: formData.get("initialVariant.materialId") ?? "",
				size: formData.get("initialVariant.size") ?? "",
			},
		};

		// 3. Validation avec Zod
		const validation = validateInput(createProductSchema, rawData);
		if ("error" in validation) return validation.error;

		const validatedData = validation.data;

		const normalizedCollectionIds = validatedData.collectionIds;
		const normalizedSize = validatedData.initialVariant.size?.trim() ?? null;
		const normalizedDescription = validatedData.description?.trim()
			? sanitizeText(validatedData.description)
			: "";

		// 4. Prix en centimes
		const productPriceCents = Math.round(validatedData.priceEuros * 100);
		const variantPriceCents = validatedData.initialVariant.priceEuros
			? Math.round(validatedData.initialVariant.priceEuros * 100)
			: null;

		// 5. Médias du produit (premier = principal via position 0, forcé IMAGE par le schéma)
		const allMedia = validatedData.media.map((m, index) => ({
			url: m.url,
			alt: m.alt ?? null,
			type: index === 0 ? ("IMAGE" as const) : (m.type ?? detectMediaType(m.url)),
			blurDataUrl: m.blurDataUrl ?? null,
			position: index,
		}));

		// 6. Création en transaction
		const { product, collectionSlugs } = await prisma.$transaction(async (tx) => {
			// Slug unique généré DANS la transaction (anti-race)
			const finalSlug = await generateSlug(tx, "product", validatedData.name);

			// Collections : existence + slugs capturés dans la transaction
			let fetchedCollectionSlugs: string[] = [];
			if (normalizedCollectionIds.length > 0) {
				const collections = await tx.collection.findMany({
					where: { id: { in: normalizedCollectionIds } },
					select: { id: true, slug: true },
				});
				if (collections.length !== normalizedCollectionIds.length) {
					throw new BusinessError("Une ou plusieurs collections spécifiées n'existent pas.");
				}
				fetchedCollectionSlugs = collections.map((c) => c.slug);
			}

			// Couleur / matériau : existence
			if (validatedData.initialVariant.colorId) {
				const color = await tx.color.findUnique({
					where: { id: validatedData.initialVariant.colorId },
					select: { id: true },
				});
				if (!color) throw new BusinessError("La couleur sélectionnée n'existe pas.");
			}
			if (validatedData.initialVariant.materialId) {
				const material = await tx.material.findUnique({
					where: { id: validatedData.initialVariant.materialId },
					select: { id: true },
				});
				if (!material) throw new BusinessError("Le matériau sélectionné n'existe pas.");
			}

			const createdProduct = await tx.product.create({
				data: {
					name: validatedData.name,
					slug: finalSlug,
					description: normalizedDescription,
					priceCents: productPriceCents,
					active: validatedData.active,
					typeId: validatedData.typeId ?? null,
					collections: {
						connect: normalizedCollectionIds.map((id) => ({ id })),
					},
					media: {
						create: allMedia,
					},
					variants: {
						create: {
							priceCents: variantPriceCents,
							stock: validatedData.initialVariant.stock,
							active: validatedData.initialVariant.active,
							colorId: validatedData.initialVariant.colorId ?? null,
							materialId: validatedData.initialVariant.materialId ?? null,
							size: normalizedSize,
						},
					},
				},
				select: {
					id: true,
					name: true,
					slug: true,
					active: true,
					createdAt: true,
				},
			});

			return { product: createdProduct, collectionSlugs: fetchedCollectionSlugs };
		});

		// 7. Purge des fichiers UploadThing retirés du formulaire avant envoi.
		// Via la garde de références (et pas le delete brut) : un média retiré
		// PUIS restauré par l'undo du toast reste listé dans `deletedImageUrls`
		// tout en étant recréé par la transaction ci-dessus — la garde le voit
		// référencé et le préserve.
		const rawDeletedImageUrls = safeFormGetJSON<unknown[]>(formData, "deletedImageUrls") ?? [];
		const deletedImageUrls = rawDeletedImageUrls.filter(
			(url): url is string => typeof url === "string" && url.length > 0 && url.length <= 2048,
		);
		if (deletedImageUrls.length > 0) {
			void deleteUnreferencedCatalogMedia(deletedImageUrls, { action: "createProduct" });
		}

		// 8. Invalidation de cache
		const productTags = getProductInvalidationTags(product.slug, product.id);
		productTags.forEach((tag) => updateTag(tag));
		for (const slug of collectionSlugs) {
			getCollectionInvalidationTags(slug).forEach((tag) => updateTag(tag));
		}

		// 9. Succès
		return success(
			`Nouveau bijou « ${product.name} » dans l'atelier${product.active ? " — publié" : ""}`,
			product,
		);
	} catch (e) {
		if (e instanceof Error && e.message.includes("Unique constraint")) {
			return error("Une erreur technique est survenue. Réessaie.");
		}
		return handleActionError(e, "Une erreur est survenue lors de la création du produit.");
	}
}
