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
	validationError,
	safeFormGet,
} from "@/shared/lib/actions";
import type { ActionState } from "@/shared/types/server-action";

import { bulkChangeCollectionStatusSchema } from "../schemas/collection.schemas";
import { getCollectionInvalidationTags } from "../utils/cache.utils";

/**
 * Server Action pour changer le statut de plusieurs collections entre DRAFT et PUBLIC
 * Pour ARCHIVED -> PUBLIC ou PUBLIC -> ARCHIVED, utiliser bulkArchiveCollections
 */
export async function bulkChangeCollectionStatus(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_COLLECTION_LIMITS.BULK_STATUS);
		if ("error" in rateLimit) return rateLimit.error;

		const collectionIdsRaw = safeFormGet(formData, "collectionIds");
		const targetStatus = safeFormGet(formData, "targetStatus");

		let collectionIds: unknown;
		try {
			collectionIds = JSON.parse(collectionIdsRaw ?? "");
		} catch {
			return validationError("Format des IDs de collections invalide.");
		}

		const validated = validateInput(bulkChangeCollectionStatusSchema, {
			collectionIds,
			targetStatus,
		});
		if ("error" in validated) return validated.error;

		const validatedData = validated.data;

		const existingCollections = await prisma.$transaction(async (tx) => {
			const collections = await tx.collection.findMany({
				where: {
					id: { in: validatedData.collectionIds },
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

			const archived = collections.filter((c) => c.status === CollectionStatus.ARCHIVED);
			if (archived.length > 0) {
				throw new Error("ARCHIVED_INCLUDED");
			}

			await tx.collection.updateMany({
				where: { id: { in: validatedData.collectionIds } },
				data: { status: validatedData.targetStatus },
			});

			return collections;
		});

		if (!existingCollections) {
			return notFound("Collection");
		}

		for (const collection of existingCollections) {
			getCollectionInvalidationTags(collection.slug).forEach((tag) => updateTag(tag));
		}
		updateTag(SHARED_CACHE_TAGS.NAVBAR_MENU);

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "collection.bulkChangeStatus",
			targetType: "collection",
			targetId: validatedData.collectionIds.join(","),
			metadata: {
				count: existingCollections.length,
				targetStatus: validatedData.targetStatus,
			},
		});

		const count = existingCollections.length;
		const actionLabel =
			validatedData.targetStatus === CollectionStatus.PUBLIC ? "publiée" : "mise en brouillon";
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
		if (e instanceof Error && e.message === "ARCHIVED_INCLUDED") {
			return validationError(
				"Impossible de changer le statut de collections archivées. Veuillez d'abord les restaurer.",
			);
		}
		return handleActionError(e, "Une erreur est survenue lors du changement de statut");
	}
}
