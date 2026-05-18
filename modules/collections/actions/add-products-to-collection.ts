"use server";

import { updateTag } from "next/cache";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { prisma } from "@/shared/lib/prisma";
import { ADMIN_COLLECTION_LIMITS } from "@/shared/lib/rate-limit-config";
import {
	validateInput,
	handleActionError,
	success,
	notFound,
	safeFormGet,
	safeFormGetJSON,
} from "@/shared/lib/actions";
import type { ActionState } from "@/shared/types/server-action";
import { getProductInvalidationTags } from "@/modules/products/utils/cache.utils";

import { addProductsToCollectionSchema } from "../schemas/collection.schemas";
import { getCollectionInvalidationTags } from "../utils/cache.utils";

/**
 * Server Action pour attacher plusieurs produits a une collection.
 * Utilise createMany avec skipDuplicates pour eviter les erreurs de contrainte unique
 * sur (productId, collectionId).
 */
export async function addProductsToCollection(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdmin();
		if ("error" in auth) return auth.error;
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_COLLECTION_LIMITS.MANAGE_PRODUCTS);
		if ("error" in rateLimit) return rateLimit.error;

		const collectionId = safeFormGet(formData, "collectionId");
		const productIds: string[] = safeFormGetJSON<string[]>(formData, "productIds") ?? [];

		const validated = validateInput(addProductsToCollectionSchema, {
			collectionId,
			productIds,
		});
		if ("error" in validated) return validated.error;

		const validatedData = validated.data;

		const result = await prisma.$transaction(async (tx) => {
			const collection = await tx.collection.findUnique({
				where: { id: validatedData.collectionId },
				select: { id: true, name: true, slug: true },
			});

			if (!collection) {
				throw new Error("COLLECTION_NOT_FOUND");
			}

			const products = await tx.product.findMany({
				where: { id: { in: validatedData.productIds } },
				select: { id: true, slug: true },
			});

			if (products.length !== validatedData.productIds.length) {
				throw new Error("PRODUCTS_NOT_FOUND");
			}

			const created = await tx.productCollection.createMany({
				data: validatedData.productIds.map((productId) => ({
					productId,
					collectionId: validatedData.collectionId,
					isFeatured: false,
				})),
				skipDuplicates: true,
			});

			return { collection, products, addedCount: created.count };
		});

		getCollectionInvalidationTags(result.collection.slug).forEach((tag) => updateTag(tag));
		for (const product of result.products) {
			getProductInvalidationTags(product.slug, product.id).forEach((tag) => updateTag(tag));
		}

		const added = result.addedCount;
		const requested = validatedData.productIds.length;
		const skipped = requested - added;

		const message =
			skipped > 0
				? `${added} produit${added > 1 ? "s" : ""} ajouté${added > 1 ? "s" : ""} à "${result.collection.name}". ${skipped} déjà présent${skipped > 1 ? "s" : ""}.`
				: `${added} produit${added > 1 ? "s" : ""} ajouté${added > 1 ? "s" : ""} à "${result.collection.name}".`;

		return success(message, {
			collectionId: result.collection.id,
			addedCount: added,
			skippedCount: skipped,
		});
	} catch (e) {
		if (e instanceof Error) {
			if (e.message === "COLLECTION_NOT_FOUND") {
				return notFound("Collection");
			}
			if (e.message === "PRODUCTS_NOT_FOUND") {
				return notFound("Un ou plusieurs produits");
			}
		}
		return handleActionError(e, "Impossible d'ajouter les produits à la collection.");
	}
}
