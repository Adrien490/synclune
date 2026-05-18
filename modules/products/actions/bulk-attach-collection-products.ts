"use server";

import { updateTag } from "next/cache";

import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { getCollectionInvalidationTags } from "@/modules/collections/utils/cache.utils";
import {
	error,
	handleActionError,
	notFound,
	parseFormIds,
	safeFormGet,
	success,
	validateInput,
} from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import { ADMIN_PRODUCT_BULK_ATTACH_COLLECTION_LIMIT } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";

import { bulkAttachCollectionProductsSchema } from "../schemas/product.schemas";
import { getProductInvalidationTags } from "../utils/cache.utils";

/**
 * Lie en lot des produits à une collection — additif uniquement (skipDuplicates).
 * Les collections déjà attachées sur chaque produit restent intactes.
 */
export async function bulkAttachCollectionProducts(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdmin();
		if ("error" in auth) return auth.error;
		const rateLimit = await enforceRateLimitForCurrentUser(
			ADMIN_PRODUCT_BULK_ATTACH_COLLECTION_LIMIT,
		);
		if ("error" in rateLimit) return rateLimit.error;

		const idsResult = parseFormIds(formData, "productIds");
		if ("error" in idsResult) return idsResult.error;

		const validation = validateInput(bulkAttachCollectionProductsSchema, {
			productIds: idsResult.ids,
			collectionId: safeFormGet(formData, "collectionId") ?? undefined,
		});
		if ("error" in validation) return validation.error;

		const { productIds, collectionId } = validation.data;

		const collection = await prisma.collection.findUnique({
			where: { id: collectionId },
			select: { id: true, name: true, slug: true },
		});

		if (!collection) {
			return notFound("La collection");
		}

		const products = await prisma.product.findMany({
			where: { id: { in: productIds }, deletedAt: null },
			select: { id: true, slug: true, title: true },
		});

		if (products.length === 0) {
			return error("Aucun produit valide trouvé");
		}

		const existingLinks = await prisma.productCollection.findMany({
			where: {
				collectionId,
				productId: { in: products.map((p) => p.id) },
			},
			select: { productId: true },
		});
		const alreadyLinked = new Set(existingLinks.map((l) => l.productId));
		const toLink = products.filter((p) => !alreadyLinked.has(p.id));

		if (toLink.length === 0) {
			return error(`Tous les produits sélectionnés sont déjà dans « ${collection.name} »`);
		}

		await prisma.productCollection.createMany({
			data: toLink.map((p) => ({
				productId: p.id,
				collectionId,
				isFeatured: false,
			})),
			skipDuplicates: true,
		});

		const tags = new Set<string>();
		getCollectionInvalidationTags(collection.slug).forEach((tag) => tags.add(tag));
		for (const p of toLink) {
			getProductInvalidationTags(p.slug, p.id).forEach((tag) => tags.add(tag));
		}
		tags.forEach((tag) => updateTag(tag));

		const plural = toLink.length > 1 ? "s" : "";
		const skipped = alreadyLinked.size;
		const suffix = skipped > 0 ? `. ${skipped} déjà présent${skipped > 1 ? "s" : ""}.` : ".";

		return success(
			`${toLink.length} bijou${plural} ajouté${plural} à la collection « ${collection.name} »${suffix}`,
			{
				count: toLink.length,
				skippedCount: skipped,
				collectionId,
				collectionSlug: collection.slug,
			},
		);
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue lors de l'ajout à la collection");
	}
}
