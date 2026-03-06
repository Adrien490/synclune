"use server";

import { updateTag } from "next/cache";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { logAudit } from "@/shared/lib/audit-log";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import {
	validateInput,
	handleActionError,
	success,
	error,
	notFound,
	safeFormGet,
} from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import { ADMIN_COLLECTION_LIMITS } from "@/shared/lib/rate-limit-config";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import type { ActionState } from "@/shared/types/server-action";
import { bulkArchiveCollectionsSchema } from "../schemas/collection.schemas";
import { getCollectionInvalidationTags } from "../utils/cache.utils";

/**
 * Server Action pour archiver ou desarchiver plusieurs collections en masse
 * Compatible avec useActionState de React 19
 */
export async function bulkArchiveCollections(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		// 1. Admin auth check
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_COLLECTION_LIMITS.BULK_ARCHIVE);
		if ("error" in rateLimit) return rateLimit.error;

		// 2. Extract data from FormData
		const collectionIdsRaw = safeFormGet(formData, "collectionIds");
		const targetStatus = safeFormGet(formData, "targetStatus") ?? "ARCHIVED";

		// Parse le JSON des IDs
		let collectionIds: unknown;
		try {
			collectionIds = JSON.parse(collectionIdsRaw ?? "");
		} catch {
			return error("Format des IDs de collections invalide.");
		}

		// 3. Validation avec Zod
		const validated = validateInput(bulkArchiveCollectionsSchema, {
			collectionIds,
			targetStatus,
		});
		if ("error" in validated) return validated.error;

		const validatedData = validated.data;

		// 4. Verifier que toutes les collections existent + mettre a jour le statut (atomique)
		const existingCollections = await prisma.$transaction(async (tx) => {
			const collections = await tx.collection.findMany({
				where: {
					id: {
						in: validatedData.collectionIds,
					},
				},
				select: {
					id: true,
					name: true,
					slug: true,
					status: true,
				},
			});

			if (collections.length !== validatedData.collectionIds.length) {
				return null;
			}

			await tx.collection.updateMany({
				where: {
					id: {
						in: validatedData.collectionIds,
					},
				},
				data: {
					status: validatedData.targetStatus,
				},
			});

			return collections;
		});

		if (!existingCollections) {
			return notFound("Collection");
		}

		// 6. Invalidate cache tags pour toutes les collections
		for (const collection of existingCollections) {
			const collectionTags = getCollectionInvalidationTags(collection.slug);
			collectionTags.forEach((tag) => updateTag(tag));
		}
		updateTag(SHARED_CACHE_TAGS.NAVBAR_MENU);

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "collection.bulkArchive",
			targetType: "collection",
			targetId: validatedData.collectionIds.join(","),
			metadata: { count: existingCollections.length, targetStatus: validatedData.targetStatus },
		});

		// 7. Message de succes
		const count = existingCollections.length;
		const actionLabel = validatedData.targetStatus === "ARCHIVED" ? "archivée" : "restaurée";
		const successMessage = `${count} collection${count > 1 ? "s" : ""} ${actionLabel}${count > 1 ? "s" : ""} avec succès`;

		return success(successMessage, {
			collectionIds: validatedData.collectionIds,
			count,
			targetStatus: validatedData.targetStatus,
			collections: existingCollections.map((c) => ({
				id: c.id,
				name: c.name,
				slug: c.slug,
			})),
		});
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue lors de l'archivage en masse.");
	}
}
