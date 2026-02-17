"use server";

import { updateTag } from "next/cache";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { validateInput, handleActionError, success, error } from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import { ADMIN_COLLECTION_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { generateSlug } from "@/shared/utils/generate-slug";
import { sanitizeText } from "@/shared/lib/sanitize";

import { getCollectionInvalidationTags } from "../utils/cache.utils";
import { createCollectionSchema } from "../schemas/collection.schemas";

export async function createCollection(
	_: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Admin auth check
		const admin = await requireAdmin();
		if ("error" in admin) return admin.error;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_COLLECTION_LIMITS.CREATE);
		if ("error" in rateLimit) return rateLimit.error;

		// 2. Extract and validate data
		const validated = validateInput(createCollectionSchema, {
			name: formData.get("name"),
			description: formData.get("description") || null,
			status: formData.get("status") || undefined,
		});
		if ("error" in validated) return validated.error;

		const validatedData = validated.data;

		// Sanitize text inputs
		const sanitizedName = sanitizeText(validatedData.name);
		const sanitizedDescription = validatedData.description
			? sanitizeText(validatedData.description)
			: null;

		// Transaction pour garantir l'atomicité (unicité du nom + création)
		const slug = await prisma.$transaction(async (tx) => {
			// Vérifier l'unicité du nom
			const existingName = await tx.collection.findFirst({
				where: { name: sanitizedName },
			});

			if (existingName) {
				throw new Error("NAME_EXISTS");
			}

			// Générer un slug unique automatiquement
			const slug = await generateSlug(tx, "collection", sanitizedName);

			// Créer la collection
			await tx.collection.create({
				data: {
					name: sanitizedName,
					slug,
					description: sanitizedDescription,
					status: validatedData.status,
				},
			});

			return slug;
		});

		// Invalider le cache
		getCollectionInvalidationTags(slug).forEach(tag => updateTag(tag));
		updateTag(SHARED_CACHE_TAGS.NAVBAR_MENU);

		return success("Collection créée avec succès", {
			collectionStatus: validatedData.status,
		});
	} catch (e) {
		if (e instanceof Error && e.message === "NAME_EXISTS") {
			return error("Ce nom de collection existe déjà. Veuillez en choisir un autre.");
		}
		return handleActionError(e, "Erreur lors de la création de la collection");
	}
}
