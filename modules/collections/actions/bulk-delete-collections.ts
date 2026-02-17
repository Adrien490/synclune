"use server";

import { updateTag } from "next/cache";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { validateInput, handleActionError, success, error } from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import { ADMIN_COLLECTION_LIMITS } from "@/shared/lib/rate-limit-config";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import type { ActionState } from "@/shared/types/server-action";

import { getCollectionInvalidationTags } from "../utils/cache.utils";
import { bulkDeleteCollectionsSchema } from "../schemas/collection.schemas";

export async function bulkDeleteCollections(
	_: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Admin auth check
		const admin = await requireAdmin();
		if ("error" in admin) return admin.error;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_COLLECTION_LIMITS.BULK_DELETE);
		if ("error" in rateLimit) return rateLimit.error;

		// 2. Extract and parse IDs from FormData
		let ids: unknown;
		try {
			const idsString = formData.get("ids") as string;
			ids = idsString ? JSON.parse(idsString) : [];
		} catch {
			return error("Format JSON invalide pour les IDs");
		}

		// 3. Valider les donnees
		const validated = validateInput(bulkDeleteCollectionsSchema, { ids });
		if ("error" in validated) return validated.error;

		const validatedData = validated.data;

		// Verifier les collections et leur utilisation
		const collectionsWithUsage = await prisma.collection.findMany({
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

		// Note: On peut supprimer les collections meme avec des produits
		// car la relation est onDelete: SetNull (les produits seront preserves)
		const totalProducts = collectionsWithUsage.reduce(
			(sum, col) => sum + col._count.products,
			0
		);

		// Supprimer les collections
		const result = await prisma.collection.deleteMany({
			where: {
				id: {
					in: validatedData.ids,
				},
			},
		});

		// Invalider le cache pour chaque collection supprimee
		for (const collection of collectionsWithUsage) {
			getCollectionInvalidationTags(collection.slug).forEach(tag => updateTag(tag));
		}
		updateTag(SHARED_CACHE_TAGS.NAVBAR_MENU);

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
