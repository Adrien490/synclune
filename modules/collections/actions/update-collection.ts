"use server";

import { updateTag } from "next/cache";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { logAudit } from "@/shared/lib/audit-log";
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
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		// 1. Admin auth check
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_COLLECTION_LIMITS.UPDATE);
		if ("error" in rateLimit) return rateLimit.error;

		// 2. Extract and validate data
		const validated = validateInput(updateCollectionSchema, {
			id: formData.get("id"),
			name: formData.get("name"),
			description: formData.get("description") ?? null,
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
		const { newSlug, oldSlug } = await prisma.$transaction(async (tx) => {
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
			const slugChanged = sanitizedName !== existingCollection.name;
			const generatedSlug = slugChanged
				? await generateSlug(tx, "collection", sanitizedName)
				: existingCollection.slug;

			// Mettre a jour la collection
			await tx.collection.update({
				where: { id: validatedData.id },
				data: {
					name: sanitizedName,
					slug: generatedSlug,
					description: sanitizedDescription,
					status: validatedData.status,
				},
			});

			return {
				newSlug: generatedSlug,
				oldSlug: slugChanged ? existingCollection.slug : null,
			};
		});

		// Invalider le cache (nouveau slug + ancien slug si rename)
		getCollectionInvalidationTags(newSlug).forEach((tag) => updateTag(tag));
		if (oldSlug) {
			getCollectionInvalidationTags(oldSlug).forEach((tag) => updateTag(tag));
		}
		updateTag(SHARED_CACHE_TAGS.NAVBAR_MENU);

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "collection.update",
			targetType: "collection",
			targetId: validatedData.id,
			metadata: { name: sanitizedName, status: validatedData.status },
		});

		return success("Collection modifiée avec succès");
	} catch (e) {
		// Gerer les erreurs metier de la transaction
		if (e instanceof Error) {
			if (e.message === "NOT_FOUND") {
				return notFound("Collection");
			}
			if (e.message === "NAME_EXISTS") {
				return error("Ce nom de collection existe déjà. Veuillez en choisir un autre.");
			}
		}
		return handleActionError(e, "Erreur lors de la modification de la collection");
	}
}
