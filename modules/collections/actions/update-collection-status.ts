"use server";

import { CollectionStatus } from "@/app/generated/prisma/client";
import { updateTag } from "next/cache";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import {
	validateInput,
	handleActionError,
	success,
	notFound,
	safeFormGet,
} from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import { ADMIN_COLLECTION_LIMITS } from "@/shared/lib/rate-limit-config";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import type { ActionState } from "@/shared/types/server-action";
import { updateCollectionStatusSchema } from "../schemas/collection.schemas";
import { getCollectionInvalidationTags } from "../utils/cache.utils";
import { COLLECTION_STATUS_LABELS } from "../constants/collection.constants";

/**
 * Server Action pour changer le statut d'une collection
 * Compatible avec useActionState de React 19
 */
export async function updateCollectionStatus(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		// 1. Admin auth check
		const auth = await requireAdmin();
		if ("error" in auth) return auth.error;
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_COLLECTION_LIMITS.UPDATE);
		if ("error" in rateLimit) return rateLimit.error;

		// 2. Extract data from FormData
		const rawData = {
			id: safeFormGet(formData, "id"),
			status: safeFormGet(formData, "status"),
		};

		// 3. Validation avec Zod
		const validated = validateInput(updateCollectionStatusSchema, rawData);
		if ("error" in validated) return validated.error;

		const { id, status } = validated.data;

		// 4. Transaction atomique : lire + muter pour garantir oldStatus coherent dans l'audit
		const existingCollection = await prisma.$transaction(async (tx) => {
			const collection = await tx.collection.findUnique({
				where: { id },
				select: {
					id: true,
					name: true,
					slug: true,
					status: true,
				},
			});

			if (!collection) {
				throw new Error("NOT_FOUND");
			}

			if (collection.status === status) {
				return { ...collection, skipped: true as const };
			}

			await tx.collection.update({
				where: { id },
				data: { status },
			});

			return { ...collection, skipped: false as const };
		});

		// 5. Si statut deja applique, retourner immediatement sans invalidation ni audit
		if (existingCollection.skipped) {
			return success(`La collection est déjà ${COLLECTION_STATUS_LABELS[status].toLowerCase()}.`);
		}

		// 7. Invalidate cache tags
		const collectionTags = getCollectionInvalidationTags(existingCollection.slug);
		collectionTags.forEach((tag) => updateTag(tag));
		updateTag(SHARED_CACHE_TAGS.NAVBAR_MENU);

		// 8. Messages de succes contextuels
		const statusMessages: Record<CollectionStatus, string> = {
			[CollectionStatus.DRAFT]: `"${existingCollection.name}" mise en brouillon`,
			[CollectionStatus.PUBLIC]: `"${existingCollection.name}" publiée`,
			[CollectionStatus.ARCHIVED]: `"${existingCollection.name}" archivée`,
		};

		return success(statusMessages[status], {
			collectionId: id,
			name: existingCollection.name,
			oldStatus: existingCollection.status,
			newStatus: status,
		});
	} catch (e) {
		if (e instanceof Error && e.message === "NOT_FOUND") {
			return notFound("Collection");
		}
		return handleActionError(e, "Erreur lors de la mise à jour du statut");
	}
}
