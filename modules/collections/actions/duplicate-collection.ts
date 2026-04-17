"use server";

import { CollectionStatus } from "@/app/generated/prisma/client";
import { updateTag } from "next/cache";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { logAudit } from "@/shared/lib/audit-log";
import { prisma } from "@/shared/lib/prisma";
import { ADMIN_COLLECTION_LIMITS } from "@/shared/lib/rate-limit-config";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import {
	validateInput,
	handleActionError,
	success,
	notFound,
	safeFormGet,
} from "@/shared/lib/actions";
import { generateSlug } from "@/shared/utils/generate-slug";
import type { ActionState } from "@/shared/types/server-action";

import { duplicateCollectionSchema } from "../schemas/collection.schemas";
import { getCollectionInvalidationTags } from "../utils/cache.utils";

/**
 * Server Action pour dupliquer une collection
 * Clone la collection en DRAFT avec un nouveau nom "Copie de X" et copie
 * les associations ProductCollection (isFeatured reset a false)
 */
export async function duplicateCollection(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_COLLECTION_LIMITS.DUPLICATE);
		if ("error" in rateLimit) return rateLimit.error;

		const validated = validateInput(duplicateCollectionSchema, {
			collectionId: safeFormGet(formData, "collectionId"),
		});
		if ("error" in validated) return validated.error;

		const { collectionId } = validated.data;

		const sourceCollection = await prisma.collection.findUnique({
			where: { id: collectionId },
			include: {
				products: {
					select: { productId: true },
				},
			},
		});

		if (!sourceCollection) {
			return notFound("Collection");
		}

		const newName = `Copie de ${sourceCollection.name}`;

		const duplicated = await prisma.$transaction(async (tx) => {
			const newSlug = await generateSlug(tx, "collection", newName);

			const created = await tx.collection.create({
				data: {
					name: newName,
					slug: newSlug,
					description: sourceCollection.description,
					status: CollectionStatus.DRAFT,
				},
				select: {
					id: true,
					name: true,
					slug: true,
				},
			});

			if (sourceCollection.products.length > 0) {
				await tx.productCollection.createMany({
					data: sourceCollection.products.map((pc) => ({
						productId: pc.productId,
						collectionId: created.id,
						isFeatured: false,
					})),
				});
			}

			return created;
		});

		getCollectionInvalidationTags(duplicated.slug).forEach((tag) => updateTag(tag));
		updateTag(SHARED_CACHE_TAGS.NAVBAR_MENU);

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "collection.duplicate",
			targetType: "collection",
			targetId: duplicated.id,
			metadata: {
				name: duplicated.name,
				slug: duplicated.slug,
				sourceCollectionId: collectionId,
				productCount: sourceCollection.products.length,
			},
		});

		return success(`Collection "${duplicated.name}" dupliquée avec succès.`, {
			collectionId: duplicated.id,
			name: duplicated.name,
			slug: duplicated.slug,
		});
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue lors de la duplication de la collection.");
	}
}
