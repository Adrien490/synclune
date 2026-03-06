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
	safeFormGet,
} from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import { ADMIN_COLLECTION_LIMITS } from "@/shared/lib/rate-limit-config";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import type { ActionState } from "@/shared/types/server-action";

import { getCollectionInvalidationTags } from "../utils/cache.utils";
import { bulkDeleteCollectionsSchema } from "../schemas/collection.schemas";

export async function bulkDeleteCollections(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		// 1. Admin auth check
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_COLLECTION_LIMITS.BULK_DELETE);
		if ("error" in rateLimit) return rateLimit.error;

		// 2. Extract and parse IDs from FormData
		let ids: unknown;
		try {
			const idsString = safeFormGet(formData, "ids");
			ids = idsString ? JSON.parse(idsString) : [];
		} catch {
			return error("Format JSON invalide pour les IDs");
		}

		// 3. Valider les donnees
		const validated = validateInput(bulkDeleteCollectionsSchema, { ids });
		if ("error" in validated) return validated.error;

		const validatedData = validated.data;

		// Verifier les collections et les supprimer de facon atomique
		// Note: On peut supprimer les collections meme avec des produits
		// car la relation ProductCollection est onDelete: Cascade (les join entries sont supprimees, les produits preserves)
		const { collectionsWithUsage, result } = await prisma.$transaction(async (tx) => {
			const collections = await tx.collection.findMany({
				where: {
					id: {
						in: validatedData.ids,
					},
				},
				include: {
					_count: {
						select: {
							products: true,
						},
					},
				},
			});

			const deleteResult = await tx.collection.deleteMany({
				where: {
					id: {
						in: validatedData.ids,
					},
				},
			});

			return { collectionsWithUsage: collections, result: deleteResult };
		});

		const totalProducts = collectionsWithUsage.reduce((sum, col) => sum + col._count.products, 0);

		// Invalider le cache pour chaque collection supprimee
		for (const collection of collectionsWithUsage) {
			getCollectionInvalidationTags(collection.slug).forEach((tag) => updateTag(tag));
		}
		updateTag(SHARED_CACHE_TAGS.NAVBAR_MENU);

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "collection.bulkDelete",
			targetType: "collection",
			targetId: validatedData.ids.join(","),
			metadata: { count: result.count, totalProducts },
		});

		// Message avec info sur les produits
		const message =
			totalProducts > 0
				? `${result.count} collection${result.count > 1 ? "s" : ""} supprimée${result.count > 1 ? "s" : ""} avec succès. ${totalProducts} produit${totalProducts > 1 ? "s ont" : " a"} été préservé${totalProducts > 1 ? "s" : ""}.`
				: `${result.count} collection${result.count > 1 ? "s" : ""} supprimée${result.count > 1 ? "s" : ""} avec succès`;

		return success(message);
	} catch (e) {
		return handleActionError(e, "Erreur lors de la suppression des collections");
	}
}
