"use server";

import { updateTag } from "next/cache";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { validateInput, handleActionError, success, error } from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { generateSlug } from "@/shared/utils/generate-slug";
import { sanitizeText } from "@/shared/lib/sanitize";

import { getCollectionInvalidationTags } from "../utils/cache.utils";
import { createCollectionSchema } from "../schemas/collection.schemas";

export async function createCollection(
	_prevState: unknown,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Verification des droits admin
		const admin = await requireAdmin();
		if ("error" in admin) return admin.error;

		// 2. Extraire et valider les donnees
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

		// Verifier l'unicite du nom
		const existingName = await prisma.collection.findFirst({
			where: { name: sanitizedName },
		});

		if (existingName) {
			return error("Ce nom de collection existe deja. Veuillez en choisir un autre.");
		}

		// Generer un slug unique automatiquement
		const slug = await generateSlug(prisma, "collection", sanitizedName);

		// Creer la collection
		await prisma.collection.create({
			data: {
				name: sanitizedName,
				slug,
				description: sanitizedDescription,
				status: validatedData.status,
			},
		});

		// Invalider le cache
		getCollectionInvalidationTags(slug).forEach(tag => updateTag(tag));
		updateTag(SHARED_CACHE_TAGS.NAVBAR_MENU);

		return success("Collection créée avec succès", {
			collectionStatus: validatedData.status,
		});
	} catch (e) {
		return handleActionError(e, "Erreur lors de la creation de la collection");
	}
}
