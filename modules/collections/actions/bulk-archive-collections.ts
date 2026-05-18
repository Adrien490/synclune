"use server";

import { CollectionStatus } from "@/app/generated/prisma/client";
import { updateTag } from "next/cache";

import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import {
	error,
	handleActionError,
	parseFormIds,
	safeFormGet,
	success,
	validateInput,
} from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import { ADMIN_COLLECTION_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";

import { bulkArchiveCollectionsSchema } from "../schemas/collection.schemas";
import { getCollectionInvalidationTags } from "../utils/cache.utils";

/**
 * Archivage / restauration en lot de collections.
 *
 * formData :
 * - `collectionIds`  : JSON array cuid2 (1..max)
 * - `targetStatus`   : "ARCHIVED" | "PUBLIC"
 */
export async function bulkArchiveCollections(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdmin();
		if ("error" in auth) return auth.error;
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_COLLECTION_LIMITS.BULK_ARCHIVE);
		if ("error" in rateLimit) return rateLimit.error;

		const idsResult = parseFormIds(formData, "collectionIds");
		if ("error" in idsResult) return idsResult.error;

		const validation = validateInput(bulkArchiveCollectionsSchema, {
			collectionIds: idsResult.ids,
			targetStatus: safeFormGet(formData, "targetStatus") ?? undefined,
		});
		if ("error" in validation) return validation.error;

		const { collectionIds, targetStatus } = validation.data;

		const collections = await prisma.collection.findMany({
			where: { id: { in: collectionIds } },
			select: { id: true, slug: true, name: true, status: true },
		});

		if (collections.length === 0) {
			return error("Aucune collection valide trouvée");
		}

		const eligible = collections.filter((c) => c.status !== targetStatus);

		if (eligible.length === 0) {
			return error(
				targetStatus === CollectionStatus.ARCHIVED
					? "Toutes les collections sélectionnées sont déjà archivées"
					: "Toutes les collections sélectionnées sont déjà publiques",
			);
		}

		const eligibleIds = eligible.map((c) => c.id);

		await prisma.collection.updateMany({
			where: { id: { in: eligibleIds } },
			data: { status: targetStatus },
		});

		const tags = new Set<string>();
		for (const c of eligible) {
			getCollectionInvalidationTags(c.slug).forEach((tag) => tags.add(tag));
		}
		tags.forEach((tag) => updateTag(tag));

		const verb = targetStatus === CollectionStatus.ARCHIVED ? "archivée" : "restaurée";
		const plural = eligibleIds.length > 1 ? "s" : "";
		return success(`${eligibleIds.length} collection${plural} ${verb}${plural} avec succès`, {
			count: eligibleIds.length,
			targetStatus,
		});
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue lors de l'opération groupée");
	}
}
