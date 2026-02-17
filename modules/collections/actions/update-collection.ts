"use server";

import { updateTag } from "next/cache";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { validateInput, handleActionError, success, error, notFound } from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import { ADMIN_COLLECTION_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { generateSlug } from "@/shared/utils/generate-slug";
import { sanitizeText } from "@/shared/lib/sanitize";

import { getCollectionInvalidationTags } from "../utils/cache.utils";
import { updateCollectionSchema } from "../schemas/collection.schemas";

export async function updateCollection(
	_prevState: unknown,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Admin auth check
		const admin = await requireAdmin();
		if ("error" in admin) return admin.error;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_COLLECTION_LIMITS.UPDATE);
		if ("error" in rateLimit) return rateLimit.error;

		// 2. Extract and validate data
		const validated = validateInput(updateCollectionSchema, {
			id: formData.get("id"),
			name: formData.get("name"),
			description: formData.get("description") || null,
			status: formData.get("status"),
		});
		if ("error" in validated) return validated.error;

		const validatedData = validated.data;

		// Sanitize text inputs
		const sanitizedName = sanitizeText(validatedData.name);
		const sanitizedDescription = validatedData.description
			? sanitizeText(validatedData.description)
			: null;

		// 3. Transaction pour garantir l'atomicite
		const slug = await prisma.$transaction(async (tx) => {
			// Verifier que la collection existe
			const existingCollection = await tx.collection.findUnique({
				where: { id: validatedData.id },
			});

			if (!existingCollection) {
				throw new Error("NOT_FOUND");
			}

			// Verifier l'unicite du nom (sauf si c'est le meme)
			if (sanitizedName !== existingCollection.name) {
				const nameExists = await tx.collection.findFirst({
					where: { name: sanitizedName },
				});

				if (nameExists) {
					throw new Error("NAME_EXISTS");
				}
			}

			// Generer un nouveau slug si le nom a change
			const newSlug =
				sanitizedName !== existingCollection.name
					? await generateSlug(tx, "collection", sanitizedName)
					: existingCollection.slug;

			// Mettre a jour la collection
			await tx.collection.update({
				where: { id: validatedData.id },
				data: {
					name: sanitizedName,
					slug: newSlug,
					description: sanitizedDescription,
					status: validatedData.status,
				},
			});

			return newSlug;
		});

		// Invalider le cache
		getCollectionInvalidationTags(slug).forEach(tag => updateTag(tag));
		updateTag(SHARED_CACHE_TAGS.NAVBAR_MENU);

		return success("Collection modifiée avec succès");
	} catch (e) {
		// Gerer les erreurs metier de la transaction
		if (e instanceof Error) {
			if (e.message === "NOT_FOUND") {
				return notFound("Collection");
			}
			if (e.message === "NAME_EXISTS") {
				return error("Ce nom de collection existe deja. Veuillez en choisir un autre.");
			}
		}
		return handleActionError(e, "Erreur lors de la modification de la collection");
	}
}
