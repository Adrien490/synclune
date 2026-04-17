"use server";

import { updateTag } from "next/cache";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { logAudit } from "@/shared/lib/audit-log";
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

import { removeProductsFromCollectionSchema } from "../schemas/collection.schemas";
import { getCollectionInvalidationTags } from "../utils/cache.utils";

/**
 * Server Action pour detacher plusieurs produits d'une collection.
 * Utilise deleteMany sur les associations ProductCollection.
 */
export async function removeProductsFromCollection(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_COLLECTION_LIMITS.MANAGE_PRODUCTS);
		if ("error" in rateLimit) return rateLimit.error;

		const collectionId = safeFormGet(formData, "collectionId");
		const productIds: string[] = safeFormGetJSON<string[]>(formData, "productIds") ?? [];

		const validated = validateInput(removeProductsFromCollectionSchema, {
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

			const existingAssociations = await tx.productCollection.findMany({
				where: {
					collectionId: validatedData.collectionId,
					productId: { in: validatedData.productIds },
				},
				select: {
					productId: true,
					product: { select: { slug: true } },
				},
			});

			const deleted = await tx.productCollection.deleteMany({
				where: {
					collectionId: validatedData.collectionId,
					productId: { in: validatedData.productIds },
				},
			});

			return { collection, existingAssociations, removedCount: deleted.count };
		});

		getCollectionInvalidationTags(result.collection.slug).forEach((tag) => updateTag(tag));
		for (const pc of result.existingAssociations) {
			getProductInvalidationTags(pc.product.slug, pc.productId).forEach((tag) => updateTag(tag));
		}

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "collection.removeProducts",
			targetType: "collection",
			targetId: result.collection.id,
			metadata: {
				collectionName: result.collection.name,
				requestedCount: validatedData.productIds.length,
				removedCount: result.removedCount,
			},
		});

		const removed = result.removedCount;
		const message = `${removed} produit${removed > 1 ? "s" : ""} retiré${removed > 1 ? "s" : ""} de "${result.collection.name}".`;

		return success(message, {
			collectionId: result.collection.id,
			removedCount: removed,
		});
	} catch (e) {
		if (e instanceof Error && e.message === "COLLECTION_NOT_FOUND") {
			return notFound("Collection");
		}
		return handleActionError(e, "Impossible de retirer les produits de la collection.");
	}
}
